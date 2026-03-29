import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import HeaderUser from "@/component/HeaderUser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { paymentService } from "@/src/services/payment.service";
import type { PaymentItem } from "@/src/types/payment.types";

type PaymentFilter = "all" | "unpaid" | "paid" | "expired";

const normalizeStatus = (status: string) => status.toLowerCase();

const isUnpaidStatus = (status: string) => {
  const normalized = normalizeStatus(status);
  return normalized === "pending";
};

const isPaidStatus = (status: string) => {
  const normalized = normalizeStatus(status);
  return normalized === "confirmed" || normalized === "success" || normalized === "completed";
};

const isExpiredStatus = (status: string) => normalizeStatus(status) === "expired";

const Payment = () => {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<PaymentFilter>("all");

  const getPlayerId = async (): Promise<number> => {
    const playerIdFromKey = await AsyncStorage.getItem("playerId");
    if (playerIdFromKey && Number.isFinite(Number(playerIdFromKey))) {
      return Number(playerIdFromKey);
    }

    const userDataRaw = await AsyncStorage.getItem("userData");
    if (userDataRaw) {
      const userData = JSON.parse(userDataRaw);
      const playerId = Number(userData?.player_id ?? userData?.user_id ?? userData?.id ?? userData?._id);
      if (Number.isFinite(playerId)) {
        return playerId;
      }
    }

    throw new Error("Không tìm thấy playerId. Vui lòng đăng nhập lại.");
  };

  const fetchPayments = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }
      setError(null);

      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        router.replace("/login");
        return;
      }

      const playerId = await getPlayerId();
      const response = await paymentService.getPlayerPayments({
        playerId,
        offset: 0,
        limit: 30,
      });

      setPayments(response.payments || []);
    } catch (err: any) {
      setError(err?.message || "Không thể tải danh sách thanh toán");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPayments(false);
    }, [fetchPayments])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments(true);
  };

  const pendingPayments = payments.filter((payment) => isUnpaidStatus(payment.status));

  const getStatusStyle = (status: string) => {
    switch (normalizeStatus(status)) {
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "confirmed":
      case "success":
      case "completed":
        return "bg-green-100 text-green-700";
      case "expired":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusText = (status: string) => {
    switch (normalizeStatus(status)) {
      case "pending":
        return "Chờ thanh toán";
      case "confirmed":
      case "success":
      case "completed":
        return "Đã thanh toán";
      case "expired":
        return "Hết hạn";
      default:
        return status;
    }
  };

  const getPaymentTypeText = (paymentType: string) => {
    switch (paymentType.toLowerCase()) {
      case "deposit":
        return "Cọc";
      case "remaining":
        return "Thanh toán còn lại";
      default:
        return paymentType;
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "Không giới hạn";
    return new Date(dateString).toLocaleString("vi-VN");
  };

  const handleOpenBookingDetail = async (bookingId: number) => {
    await AsyncStorage.setItem("currentBookingId", String(bookingId));
    router.push("/(tabs)/(stadiums)/booking-detail");
  };

  const filteredPayments = payments.filter((payment) => {
    if (activeFilter === "all") {
      return true;
    }

    if (activeFilter === "unpaid") {
      return isUnpaidStatus(payment.status);
    }

    if (activeFilter === "paid") {
      return isPaidStatus(payment.status);
    }

    return isExpiredStatus(payment.status);
  });

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <HeaderUser location="Thanh toán" time="" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#114F99" />
          <Text className="text-gray-600 mt-2">Đang tải danh sách thanh toán...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F7F9FC]" edges={["top"]}>
      <HeaderUser location="Thanh toán" time="" />

      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="bg-white rounded-xl p-4 mb-4 border border-blue-100">
          <Text className="text-lg font-bold text-[#1E232C]">Các đơn cần thanh toán</Text>
          <Text className="text-3xl font-bold text-[#114F99] mt-1">{pendingPayments.length}</Text>
          <Text className="text-gray-500 mt-1">Tổng đơn thanh toán gần đây: {payments.length}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          {[
            { key: "all", label: "Tất cả" },
            { key: "unpaid", label: "Chưa thanh toán" },
            { key: "paid", label: "Đã thanh toán" },
            { key: "expired", label: "Hết hạn" },
          ].map((filter) => {
            const isActive = activeFilter === filter.key;

            return (
              <TouchableOpacity
                key={filter.key}
                onPress={() => setActiveFilter(filter.key as PaymentFilter)}
                className={`mr-2 px-4 py-2 rounded-full border ${
                  isActive ? "bg-[#114F99] border-[#114F99]" : "bg-white border-gray-300"
                }`}
              >
                <Text className={`${isActive ? "text-white" : "text-gray-700"} font-semibold`}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <Text className="text-red-600">{error}</Text>
          </View>
        )}

        {filteredPayments.length === 0 ? (
          <View className="bg-white rounded-xl p-6 items-center">
            <Ionicons name="receipt-outline" size={40} color="#9ca3af" />
            <Text className="text-gray-500 mt-2 text-center">Không có đơn nào phù hợp bộ lọc hiện tại.</Text>
          </View>
        ) : (
          filteredPayments.map((payment) => (
            <View key={payment.id} className="bg-white rounded-xl p-4 mb-3 border border-gray-100">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-base font-bold text-[#1E232C]">Đơn #{payment.id}</Text>
                <View className={`px-3 py-1 rounded-full ${getStatusStyle(payment.status).split(" ")[0]}`}>
                  <Text className={`font-semibold ${getStatusStyle(payment.status).split(" ")[1]}`}>
                    {getStatusText(payment.status)}
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-500">Booking ID</Text>
                <Text className="text-gray-800 font-semibold">#{payment.booking_id}</Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-500">Loại thanh toán</Text>
                <Text className="text-gray-800 font-semibold">{getPaymentTypeText(payment.payment_type)}</Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-500">Số tiền</Text>
                <Text className="text-[#114F99] font-bold">{payment.amount.toLocaleString()}đ</Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-500">Hạn thanh toán</Text>
                <Text className="text-gray-800 font-semibold">{formatDateTime(payment.expires_at)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-500">Tạo lúc</Text>
                <Text className="text-gray-800 font-semibold">{formatDateTime(payment.created_at)}</Text>
              </View>

              {isUnpaidStatus(payment.status) && (
                <TouchableOpacity
                  className="bg-[#0068FF] mt-3 py-3 rounded-lg"
                  onPress={() => handleOpenBookingDetail(payment.booking_id)}
                >
                  <Text className="text-white text-center font-semibold">Đi đến đơn đặt sân để thanh toán</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Payment;
