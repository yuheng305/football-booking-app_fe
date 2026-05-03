import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import HeaderUser from "@/component/HeaderUser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import bookingService from "@/src/services/booking.service";
import paymentService from "@/src/services/payment.service";
import {
  getBookingStatusMeta,
  isBookingPaid,
  isBookingPayable,
} from "@/src/utils/booking-status";

const BookingPayment = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string>("");
  const [bookingStatus, setBookingStatus] = useState<string>("pending");
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const waitingPaymentResultRef = useRef(false);
  const lastAppStateRef = useRef(AppState.currentState);

  const loadPaymentInfo = useCallback(async (options?: { showLoading?: boolean; pollAfterPayment?: boolean }) => {
    const showLoading = options?.showLoading ?? true;
    const pollAfterPayment = options?.pollAfterPayment ?? false;

    try {
      if (showLoading) {
        setLoading(true);
      }

      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
        router.replace("/login");
        return;
      }

      const currentBookingId = await AsyncStorage.getItem("currentBookingId");
      if (!currentBookingId) {
        Alert.alert("Lỗi", "Không tìm thấy thông tin đặt sân");
        router.back();
        return;
      }

      const bookingIdNumber = Number(currentBookingId);
      if (!Number.isFinite(bookingIdNumber)) {
        throw new Error("Mã đặt sân không hợp lệ");
      }

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

      setBookingId(currentBookingId);
      setBookingStatus(data.status || "pending");
      setTotalAmount(data.total_price || 0);

      if (isBookingPaid(data.status)) {
        waitingPaymentResultRef.current = false;
      }
    } catch (error: any) {
      console.error("[BOOKING PAYMENT] Error:", error);
      if (showLoading) {
        Alert.alert("Lỗi", error?.message || "Không thể tải thông tin thanh toán");
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadPaymentInfo({ showLoading: true });
  }, [loadPaymentInfo]);

  useFocusEffect(
    useCallback(() => {
      loadPaymentInfo({ showLoading: false, pollAfterPayment: true });
    }, [loadPaymentInfo])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasBackground =
        lastAppStateRef.current === "background" || lastAppStateRef.current === "inactive";
      const isActive = nextState === "active";

      if (wasBackground && isActive) {
        loadPaymentInfo({ showLoading: false, pollAfterPayment: true });
      }

      lastAppStateRef.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, [loadPaymentInfo]);

  const handlePayment = async () => {
    if (!isBookingPayable(bookingStatus)) {
      Alert.alert("Thông báo", "Đơn đặt sân chưa đủ điều kiện để thanh toán");
      return;
    }

    try {
      setSubmitting(true);

      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
        router.replace("/login");
        return;
      }

      const bookingIdNumber = Number(bookingId);
      if (!Number.isFinite(bookingIdNumber)) {
        throw new Error("Mã đặt sân không hợp lệ");
      }

      const orderUrl = await paymentService.getZaloPayOrderUrl(bookingIdNumber);
      const canOpen = await Linking.canOpenURL(orderUrl);

      if (!canOpen) {
        throw new Error("Thiết bị không hỗ trợ mở link thanh toán ZaloPay");
      }

      await Linking.openURL(orderUrl);
      waitingPaymentResultRef.current = true;
      Alert.alert(
        "Đã mở ZaloPay",
        "Sau khi hoàn tất thanh toán, vui lòng quay lại chi tiết đơn để kiểm tra trạng thái.",
        [
          {
            text: "Xem chi tiết đơn",
            onPress: () => router.replace("/(tabs)/stadium/booking-detail"),
          },
        ]
      );
    } catch (error: any) {
      console.error("[BOOKING PAYMENT] Error:", error);
      Alert.alert(
        "Lỗi",
        error.message || "Không thể xử lý thanh toán. Vui lòng thử lại."
      );
    } finally {
      setSubmitting(false);
    }
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

  const bookingStatusMeta = getBookingStatusMeta(bookingStatus);

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={['top']}>
      <HeaderUser />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        <View className="p-4">
          {/* Header */}
          <View className="flex-row items-center mb-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-3 p-2 bg-white rounded-full"
            >
              <Ionicons name="arrow-back" size={24} color="#1e40af" />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-gray-800">
              Thanh toán
            </Text>
          </View>

          {/* Amount Section — nền solid (gradient Tailwind không render đúng trên RN → chữ trắng trên nền trắng). */}
          <View className="rounded-2xl p-6 mb-4 bg-blue-600 shadow-md border border-blue-700">
            <Text className="text-center text-sm mb-2 text-blue-50 font-medium">
              Tổng số tiền cần thanh toán
            </Text>
            <Text className="text-center text-4xl font-bold text-white">
              {totalAmount.toLocaleString("vi-VN")} đ
            </Text>
          </View>

          {/* Payment Methods */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <Text className="text-lg font-bold text-gray-800 mb-3">
              Phương thức thanh toán
            </Text>
            <View className="flex-row items-center p-4 rounded-lg border-2 bg-blue-50 border-blue-500">
              <View className="w-12 h-12 rounded-full items-center justify-center bg-blue-500">
                <Ionicons name="wallet-outline" size={24} color="white" />
              </View>
              <Text className="flex-1 ml-3 text-base font-semibold text-blue-700">
                ZaloPay
              </Text>
              <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
            </View>
          </View>

          {/* Payment Info */}
          <View className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4 rounded">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={24} color="#f59e0b" />
              <View className="flex-1 ml-2">
                <Text className="text-yellow-800 font-semibold mb-1">
                  Lưu ý thanh toán:
                </Text>
                <Text className="text-yellow-700 text-sm">
                  • Vui lòng kiểm tra kỹ thông tin trước khi thanh toán{"\n"}
                  • Thanh toán sẽ được xử lý trong vòng 5-10 phút{"\n"}
                  • Liên hệ hotline nếu có vấn đề: 1900 xxxx
                </Text>
              </View>
            </View>
          </View>

          {/* Payment Summary */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <Text className="text-lg font-bold text-gray-800 mb-3">
              Thông tin thanh toán
            </Text>
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-600">Mã đặt sân:</Text>
              <Text className="text-gray-800 font-semibold">#{bookingId.substring(0, 8)}</Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-600">Phương thức:</Text>
              <Text className="text-gray-800 font-semibold">ZaloPay</Text>
            </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600">Trạng thái đơn:</Text>
                <Text className="text-gray-800 font-semibold">{bookingStatusMeta.label}</Text>
              </View>
            <View className="border-t border-gray-200 mt-3 pt-3">
              <View className="flex-row justify-between">
                <Text className="text-lg font-bold text-gray-800">
                  Tổng cộng:
                </Text>
                <Text className="text-lg font-bold text-blue-600">
                  {totalAmount.toLocaleString()}đ
                </Text>
              </View>
            </View>
          </View>

          {/* Confirm Payment Button */}
          <TouchableOpacity
            onPress={handlePayment}
            disabled={submitting || !isBookingPayable(bookingStatus)}
            className={`py-4 rounded-lg ${
              submitting || !isBookingPayable(bookingStatus)
                ? "bg-gray-400"
                : "bg-green-500"
            }`}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-bold text-lg">
                Thanh toán bằng ZaloPay
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BookingPayment;
