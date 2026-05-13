import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import HeaderUser from "@/component/HeaderUser";
import ContactActions from "@/component/ContactActions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { bookingService } from "@/src/services/booking.service";
import { clusterService } from "@/src/services/cluster.service";
import {
  getBookingStatusMeta,
  isBookingPaid,
  isBookingPayable,
  normalizeBookingStatus,
} from "@/src/utils/booking-status";

interface BookingDetail {
  id: string;
  clusterName: string;
  fieldName: string;
  date: string;
  time: string;
  rating: number;
  status: string;
  totalPrice: number;
  zalopayOrderUrl?: string | null;
  services: { name: string; price: number }[];
}

const formatBookingDate = (value?: string) => {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
};

const formatBookingTime = (value?: string) => {
  if (!value) {
    return "";
  }

  // Support both HH:MM:SS and HH:MM:SS.ffffff.
  const match = value.match(/^(\d{2}):(\d{2})/);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }

  return value;
};

const BookingDetail = () => {
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [ownerChatId, setOwnerChatId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const waitingPaymentResultRef = useRef(false);
  const lastAppStateRef = useRef(AppState.currentState);

  const fetchBookingDetail = useCallback(async (options?: { showLoading?: boolean; pollAfterPayment?: boolean }) => {
    const showLoading = options?.showLoading ?? true;
    const pollAfterPayment = options?.pollAfterPayment ?? false;

    try {
      if (showLoading) {
        setLoading(true);
      }

      setError(null);

      const bookingId = await AsyncStorage.getItem("currentBookingId");
      console.log("[USER BOOKING DETAIL] currentBookingId:", bookingId);
      if (!bookingId) {
        console.log("[USER BOOKING DETAIL] Missing currentBookingId -> router.back()");
        Alert.alert("Lỗi", "Không tìm thấy thông tin đặt sân");
        router.back();
        return;
      }

      const bookingIdNumber = Number(bookingId);
      if (!Number.isFinite(bookingIdNumber)) {
        throw new Error("Mã đặt sân không hợp lệ");
      }

      console.log("[USER BOOKING DETAIL] Calling bookingService.getBookingById", {
        bookingId: bookingIdNumber,
      });
      let data = await bookingService.getBookingById(bookingIdNumber);

      if (pollAfterPayment && waitingPaymentResultRef.current) {
        for (let attempt = 1; attempt <= 4; attempt++) {
          if (isBookingPaid(data.status) || !isBookingPayable(data.status)) {
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, 1000));
          data = await bookingService.getBookingById(bookingIdNumber);
        }
      }

      console.log("[USER BOOKING DETAIL] API success, booking payload summary:", {
        id: data?.id,
        status: data?.status,
        totalPrice: data?.total_price,
      });

      setBooking({
        id: String(data.id),
        clusterName: data.field?.cluster?.name || "Không rõ cụm sân",
        fieldName: data.field?.size ? `Sân ${data.field.size}` : "Sân",
        date: formatBookingDate(data.booking_date),
        time: `${formatBookingTime(data.start_time)} - ${formatBookingTime(data.end_time)}`,
        rating: 0,
        status: data.status || "pending",
        totalPrice: data.total_price ?? 0,
        zalopayOrderUrl: data.zalopay_order_url ?? null,
        services: [],
      });

      const ownerIdFromBooking = Number((data.field?.cluster as any)?.owner_id);
      if (Number.isFinite(ownerIdFromBooking) && ownerIdFromBooking > 0) {
        setOwnerChatId(ownerIdFromBooking);
      } else {
        const clusterId = Number(data.field?.cluster_id);
        if (Number.isFinite(clusterId) && clusterId > 0) {
          try {
            const cluster = await clusterService.getCluster(clusterId);
            setOwnerChatId(Number(cluster.owner_id) || null);
          } catch {
            setOwnerChatId(null);
          }
        }
      }

      if (isBookingPaid(data.status)) {
        waitingPaymentResultRef.current = false;
      }

      console.log("[USER BOOKING DETAIL] setBooking done");
    } catch (error: any) {
      console.error("[USER BOOKING DETAIL] fetchBookingDetail error:", error);
      if (showLoading) {
        setError(error.message || "Không thể tải thông tin đặt sân");
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }

      console.log("[USER BOOKING DETAIL] fetchBookingDetail finished");
    }
  }, []);

  useEffect(() => {
    console.log("[USER BOOKING DETAIL] Mounted screen, start fetchBookingDetail");
    fetchBookingDetail({ showLoading: true });
  }, [fetchBookingDetail]);

  useFocusEffect(
    useCallback(() => {
      fetchBookingDetail({ showLoading: false, pollAfterPayment: true });
    }, [fetchBookingDetail])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasBackground =
        lastAppStateRef.current === "background" || lastAppStateRef.current === "inactive";
      const isActive = nextState === "active";

      if (wasBackground && isActive) {
        fetchBookingDetail({ showLoading: false, pollAfterPayment: true });
      }

      lastAppStateRef.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, [fetchBookingDetail]);

  const getStatusColor = (status: string) => {
    return getBookingStatusMeta(status).badgeClass;
  };

  const getStatusText = (status: string) => {
    return getBookingStatusMeta(status).label;
  };

  const handlePayment = () => {
    console.log("[USER BOOKING DETAIL] handlePayment pressed with status:", booking?.status);
    if (!booking) {
      Alert.alert("Lỗi", "Không tìm thấy thông tin booking");
      return;
    }

    const normalizedStatus = normalizeBookingStatus(booking.status);
    if (isBookingPayable(normalizedStatus)) {
      waitingPaymentResultRef.current = true;
      router.push("/(tabs)/stadium/booking-payment");
    } else {
      Alert.alert(
        "Thông báo",
        "Vui lòng đợi chủ sân duyệt đặt sân trước khi thanh toán"
      );
    }
  };

  const handleGoHome = () => {
    router.push("/(tabs)/home");
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100" edges={['top']}>
        <HeaderUser />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1e40af" />
          <Text className="text-gray-600 mt-2">Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100" edges={['top']}>
        <HeaderUser />
        <View className="flex-1 items-center justify-center p-4">
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text className="text-red-500 text-center mt-4 text-lg">
            {error || "Không tìm thấy thông tin đặt sân"}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-4 bg-blue-500 py-3 px-6 rounded-lg"
          >
            <Text className="text-white font-semibold">Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const normalizedStatus = normalizeBookingStatus(booking.status);
  const isPayable = isBookingPayable(normalizedStatus);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "time-outline";
      case "payment_required":
      case "approved":
      case "confirmed":
        return "alert-circle-outline";
      case "completed":
      case "success":
        return "checkmark-circle-outline";
      case "rejected":
      case "canceled":
        return "close-circle-outline";
      default:
        return "information-circle-outline";
    }
  };

  const getStatusIconColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
      case "payment_required":
        return "#f59e0b";
      case "approved":
      case "confirmed":
        return "#f97316";
      case "completed":
      case "success":
        return "#10b981";
      case "rejected":
      case "canceled":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getStatusNotice = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "Đặt sân của bạn đang chờ chủ sân xác nhận. Vui lòng đợi trước khi thanh toán.";
      case "approved":
      case "confirmed":
        return "Đơn đặt sân đang chờ thanh toán. Vui lòng thanh toán ZaloPay để hoàn tất.";
      case "payment_required":
        return "Đơn đặt sân đang chờ thanh toán. Vui lòng thanh toán ZaloPay để giữ lịch.";
      case "rejected":
      case "canceled":
        return "Đặt sân của bạn đã bị từ chối hoặc hủy.";
      case "completed":
      case "success":
        return "Đơn đặt sân đã thành công và hoàn tất toàn bộ.";
      default:
        return "Vui lòng theo dõi trạng thái đơn đặt sân để thực hiện bước tiếp theo.";
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={['top']}>
      <HeaderUser />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        <View className="p-4">
          {/* Header */}
          <View className="items-center mb-4">
            <View className="bg-white rounded-full p-4 mb-3">
              <Ionicons
                name={getStatusIcon(booking.status)}
                size={64}
                color={getStatusIconColor(booking.status)}
              />
            </View>
            <Text className="text-2xl font-bold text-gray-800 mb-2">
              Chi tiết đặt sân
            </Text>
            <View
              className={`px-4 py-2 rounded-full ${getStatusColor(
                booking.status
              )}`}
            >
              <Text className="font-semibold">
                {getStatusText(booking.status)}
              </Text>
            </View>
          </View>

          {/* Booking Information */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <Text className="text-lg font-bold text-gray-800 mb-3">
              Thông tin đặt sân
            </Text>

            <View className="mb-3">
              <View className="flex-row items-center mb-1">
                <Ionicons name="location-outline" size={20} color="#6b7280" />
                <Text className="text-gray-600 ml-2">Cụm sân:</Text>
              </View>
                <Text className="text-gray-800 font-semibold text-base ml-7">{booking.clusterName}</Text>
                <ContactActions receiverId={ownerChatId} name={booking.clusterName} />
            </View>

            <View className="mb-3">
              <View className="flex-row items-center mb-1">
                <Ionicons name="game-controller-outline" size={20} color="#6b7280" />
                <Text className="text-gray-600 ml-2">Sân:</Text>
              </View>
              <Text className="text-gray-800 font-semibold text-base ml-7">
                {booking.fieldName}
              </Text>
            </View>

            <View className="mb-3">
              <View className="flex-row items-center mb-1">
                <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                <Text className="text-gray-600 ml-2">Ngày:</Text>
              </View>
              <Text className="text-gray-800 font-semibold text-base ml-7">
                {booking.date}
              </Text>
            </View>

            <View className="mb-3">
              <View className="flex-row items-center mb-1">
                <Ionicons name="time-outline" size={20} color="#6b7280" />
                <Text className="text-gray-600 ml-2">Giờ:</Text>
              </View>
              <Text className="text-gray-800 font-semibold text-base ml-7">
                {booking.time}
              </Text>
            </View>

            <View className="mb-3">
              <View className="flex-row items-center mb-1">
                <Ionicons name="star-outline" size={20} color="#6b7280" />
                <Text className="text-gray-600 ml-2">Rating:</Text>
              </View>
              <Text className="text-gray-800 font-semibold text-base ml-7">
                {booking.rating.toFixed(1)}
              </Text>
            </View>

            {booking.services.length > 0 && (
              <View className="mt-2 pt-3 border-t border-gray-200">
                <Text className="text-gray-600 mb-2 font-semibold">
                  Dịch vụ:
                </Text>
                {booking.services.map((service, index) => (
                  <View key={index} className="flex-row justify-between mb-1 ml-2">
                    <Text className="text-gray-700">• {service.name}</Text>
                    <Text className="text-gray-700">
                      {service.price.toLocaleString()}đ
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View className="mt-3 pt-3 border-t border-gray-300">
              <View className="flex-row justify-between">
                <Text className="text-xl font-bold text-gray-800">
                  Tổng tiền:
                </Text>
                <Text className="text-xl font-bold text-blue-600">
                  {booking.totalPrice.toLocaleString()}đ
                </Text>
              </View>
            </View>
          </View>

          {/* Status Notice */}
          <View className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={24} color="#3b82f6" />
              <View className="flex-1 ml-2">
                <Text className="text-blue-800 font-semibold mb-1">
                  Lưu ý:
                </Text>
                <Text className="text-blue-700">
                  {getStatusNotice(booking.status)}
                </Text>
                <Text className="text-blue-700 mt-2">
                  Quy trình: 1) Đặt sân thành công. 2) Chờ chủ sân xác nhận. 3) Khi trạng thái là Chờ thanh toán, bạn có thể bấm Thanh toán ZaloPay.
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="mt-2">
            {isPayable && (
              <TouchableOpacity
                onPress={handlePayment}
                className="bg-green-500 py-4 rounded-lg mb-3"
              >
                <Text className="text-white text-center font-bold text-lg">
                  Thanh toán ZaloPay
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleGoHome}
              className="bg-blue-500 py-4 rounded-lg mb-3"
            >
              <Text className="text-white text-center font-bold text-lg">
                Về trang chủ
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/(tabs)/(users)/history")}
              className="bg-gray-500 py-4 rounded-lg"
            >
              <Text className="text-white text-center font-bold text-lg">
                Xem lịch sử đặt sân
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
};

export default BookingDetail;
