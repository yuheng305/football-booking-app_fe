import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Image,
  Alert,
  Linking,
  ActivityIndicator,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import HeaderUser from "@/component/HeaderUser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { bookingService } from "@/src/services/booking.service";
import { Booking } from "@/src/types/booking.types";
import {
  getBookingStatusMeta,
  isBookingPaid,
  isBookingPayable,
} from "@/src/utils/booking-status";

// Hàm rút ngắn bookingId
const shortenBookingId = (id: string) => {
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
};

const HistoryDetail = () => {
  const { bookingId } = useLocalSearchParams(); // Lấy bookingId từ params
  const [bookingData, setBookingData] = useState<Booking | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const waitingPaymentResultRef = useRef(false);
  const lastAppStateRef = useRef(AppState.currentState);

  const fetchBookingDetails = useCallback(
    async (options?: { showLoading?: boolean; pollAfterPayment?: boolean }) => {
      const showLoading = options?.showLoading ?? true;
      const pollAfterPayment = options?.pollAfterPayment ?? false;

      try {
        if (showLoading) {
          setLoading(true);
        }

        console.log("[HISTORY DETAIL] Screen params bookingId:", bookingId);
        // Lấy userData từ AsyncStorage
        const userDataString = await AsyncStorage.getItem("userData");
        if (userDataString) {
          const parsedUserData = JSON.parse(userDataString);
          setUserData(parsedUserData);
          console.log("[HISTORY DETAIL] Loaded userData from storage");
        } else {
          console.log("[HISTORY DETAIL] userData not found in storage, continue with booking detail");
        }

        // Kiểm tra bookingId
        if (!bookingId || typeof bookingId !== "string") {
          console.log("[HISTORY DETAIL] Invalid bookingId param, navigating back");
          router.back();
          return;
        }

        const bookingIdNumber = Number(bookingId);
        if (!Number.isFinite(bookingIdNumber)) {
          router.back();
          return;
        }

        // Sử dụng bookingService để lấy chi tiết booking
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

        console.log("[HISTORY DETAIL] Booking detail loaded:", {
          id: data.id,
          status: data.status,
          total_price: data.total_price,
        });
        setBookingData(data);

        if (isBookingPaid(data.status)) {
          waitingPaymentResultRef.current = false;
        }
      } catch (error) {
        console.error("Lỗi khi lấy chi tiết đặt sân:", error);
        if (showLoading) {
          router.back();
        }
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [bookingId]
  );

  useEffect(() => {
    fetchBookingDetails({ showLoading: true });
  }, [fetchBookingDetails]);

  useFocusEffect(
    useCallback(() => {
      fetchBookingDetails({ showLoading: false, pollAfterPayment: true });
    }, [fetchBookingDetails])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasBackground =
        lastAppStateRef.current === "background" || lastAppStateRef.current === "inactive";
      const isActive = nextState === "active";

      if (wasBackground && isActive) {
        fetchBookingDetails({ showLoading: false, pollAfterPayment: true });
      }

      lastAppStateRef.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, [fetchBookingDetails]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text>Đang tải...</Text>
      </SafeAreaView>
    );
  }

  if (!bookingData) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text>Không tìm thấy thông tin đặt sân</Text>
      </SafeAreaView>
    );
  }

  // Chuẩn bị dữ liệu để hiển thị từ API response
  const bookingDate = new Date(bookingData.booking_date);
  const formattedDate = bookingDate.toLocaleDateString("vi-VN");
  const startTime = bookingData.start_time.substring(0, 5);
  const endTime = bookingData.end_time.substring(0, 5);
  
  const statusMeta = getBookingStatusMeta(bookingData.status);
  const canPay = isBookingPayable(bookingData.status);


  const displayData = {
    id: bookingData.id.toString(),
    cluster: bookingData.field.cluster.name,
    field: `Sân ${bookingData.field.size}`,
    date: formattedDate,
    time: `${startTime} - ${endTime}`,
    address: `${bookingData.field.cluster.street}, ${bookingData.field.cluster.district}, ${bookingData.field.cluster.city}`,
    status: statusMeta.label,
    total: new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(bookingData.total_price),
  };

  const handleZaloPayPayment = async () => {
    try {
      setPaying(true);
      console.log("[HISTORY DETAIL] Start ZaloPay payment for booking:", bookingData.id);
      const orderUrl = await bookingService.getZaloPayOrderUrl(bookingData.id);
      console.log("[HISTORY DETAIL] ZaloPay order_url:", orderUrl);
      const canOpen = await Linking.canOpenURL(orderUrl);

      if (!canOpen) {
        Alert.alert("Không thể mở ZaloPay", "Thiết bị không hỗ trợ mở link thanh toán này.");
        return;
      }

      await Linking.openURL(orderUrl);
      waitingPaymentResultRef.current = true;
    } catch (error: any) {
      console.error("[HISTORY DETAIL] ZaloPay error:", error);
      Alert.alert("Lỗi thanh toán", error?.message || "Không thể tạo link ZaloPay");
    } finally {
      setPaying(false);
    }
  };

  console.log("[HISTORY DETAIL] Render payment section", {
    bookingId: bookingData.id,
    status: bookingData.status,
    paying,
  });

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-1">
        <HeaderUser
          title="Chi tiết đặt sân"
          subtitle={userData?.fullName || userData?.name || "Người dùng"}
        />
        <View className="px-6 mt-6 space-y-4">
          {/* Mã đặt sân */}
          <View className="border-b border-gray-300 pb-2 pt-20">
            <Text className="text-xl font-semibold text-gray-800">
              Thông tin đặt sân #{shortenBookingId(displayData.id)}
            </Text>
          </View>

          {/* Cụm sân */}
          <View className="flex-row justify-between mt-2">
            <Text className="text-gray-600 font-semibold">Cụm sân :</Text>
            <Text className="text-gray-800">{displayData.cluster}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-600 font-semibold">Sân :</Text>
            <Text className="text-gray-800">{displayData.field}</Text>
          </View>

          {/* Ngày giờ */}
          <View className="flex-row justify-between">
            <Text className="text-gray-600 font-semibold">Ngày :</Text>
            <Text className="text-gray-800">{displayData.date}</Text>
          </View>

          {/* Thời gian */}
          <View className="flex-row justify-between">
            <Text className="text-gray-600 font-semibold">Thời gian :</Text>
            <Text className="text-gray-800">{displayData.time}</Text>
          </View>

          {/* Địa chỉ */}
          <View className="flex-row justify-between">
            <Text className="text-gray-600 font-semibold">Địa chỉ :</Text>
            <Text className="text-gray-800">{displayData.address}</Text>
          </View>

          {/* Trạng thái */}
          <View className="flex-row justify-between">
            <Text className="text-gray-600 font-semibold">Trạng thái :</Text>
            <Text className="text-gray-800 font-semibold">{displayData.status}</Text>
          </View>

          {/* Tổng cộng */}
          <View className="flex-row justify-between border-t border-gray-300 pt-4">
            <Text className="text-gray-600 font-semibold">Tổng cộng :</Text>
            <Text className="text-gray-800 font-semibold">
              {displayData.total}
            </Text>
          </View>

          {/* Nút QR Code */}
          <TouchableOpacity
            onPress={() => setShowQRModal(true)}
            className="border border-gray-300 rounded-full py-3 mt-4"
          >
            <Text className="text-center text-gray-800 font-semibold">
              Mã QR
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleZaloPayPayment}
            disabled={paying || !canPay}
            className={`rounded-full py-3 mt-4 items-center justify-center ${
              paying || !canPay ? "bg-blue-300" : "bg-[#0068FF]"
            }`}
          >
            {paying ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold">
                {canPay ? "Thanh toán qua ZaloPay" : "Đơn đã hoàn tất"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Nút Quay lại */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-red-500 p-3 rounded-full mt-4"
          >
            <Text className="text-center text-white font-semibold text-lg">
              Quay lại
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={showQRModal}
        onRequestClose={() => setShowQRModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white p-6 rounded-lg">
            <Image
              source={require("../../../assets/images/qr.png")}
              className="w-64 h-64"
              resizeMode="contain"
            />
            <TouchableOpacity
              onPress={() => setShowQRModal(false)}
              className="bg-red-500 p-3 rounded mt-4"
            >
              <Text className="text-center text-white font-semibold">Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default HistoryDetail;
