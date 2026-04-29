import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
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
import { resolveUserRoleFromStorage as resolveUserRole } from "@/src/utils/role.util";

type PaymentFilter = "all" | "unpaid" | "paid" | "expired";
type AppRole = "player" | "owner";

type GroupedTournamentPayment = {
  groupKey: string;
  tournamentId: number;
  totalAmount: number;
  status: string;
  itemCount: number;
  latestCreatedAt: string;
  paymentIds: number[];
  isTemporaryGroup: boolean;
};

const normalizeStatus = (status: string) => status.toLowerCase();

const isUnpaidStatus = (status: string) => {
  const normalized = normalizeStatus(status);
  return (
    normalized === "pending" ||
    normalized === "confirmed" ||
    normalized === "payment_required"
  );
};

const isPayableStatus = (status: string) => {
  const normalized = normalizeStatus(status);
  return normalized === "confirmed" || normalized === "payment_required";
};

const isPaidStatus = (status: string) => {
  const normalized = normalizeStatus(status);
  return normalized === "success" || normalized === "completed";
};

const isExpiredStatus = (status: string) => normalizeStatus(status) === "expired";

const getGroupedTournamentStatus = (items: PaymentItem[]): string => {
  if (items.length === 0) return "pending";

  const statuses = items.map((item) => normalizeStatus(item.status));

  if (statuses.every((status) => isPaidStatus(status))) {
    return "completed";
  }

  if (statuses.some((status) => isExpiredStatus(status) || status === "failed" || status === "canceled")) {
    return "expired";
  }

  if (statuses.some((status) => isPayableStatus(status) || isUnpaidStatus(status))) {
    return "payment_required";
  }

  return "pending";
};

// Role resolution now handled by `src/utils/role.util.ts`

const Payment = () => {
  const [role, setRole] = useState<AppRole>("player");
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [groupedTournamentPayments, setGroupedTournamentPayments] = useState<GroupedTournamentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payingTournamentId, setPayingTournamentId] = useState<number | null>(null);
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
      const playerId = Number(
        userData?.player_id ?? userData?.user_id ?? userData?.id ?? userData?._id
      );
      if (Number.isFinite(playerId)) {
        return playerId;
      }
    }

    throw new Error("Không tìm thấy playerId. Vui lòng đăng nhập lại.");
  };

  const fetchPlayerPayments = useCallback(async () => {
    const playerId = await getPlayerId();
    const response = await paymentService.getPlayerPayments({
      playerId,
      offset: 0,
      limit: 30,
    });

    setPayments(response.payments || []);
  }, []);

  const getOrganizerId = async (): Promise<number> => {
    const userDataRaw = await AsyncStorage.getItem("userData");
    const userProfileRaw = await AsyncStorage.getItem("userProfile");

    const userData = userDataRaw ? JSON.parse(userDataRaw) : null;
    const userProfile = userProfileRaw ? JSON.parse(userProfileRaw) : null;

    const organizerId = Number(
      userData?.user_id ?? userData?.id ?? userData?._id ?? userProfile?.id
    );

    if (!Number.isFinite(organizerId) || organizerId <= 0) {
      throw new Error("Không tìm thấy organizerId. Vui lòng đăng nhập lại.");
    }

    return organizerId;
  };

  const fetchOrganizerTournaments = useCallback(async () => {
    const organizerId = await getOrganizerId();

    const response = await paymentService.getOrganizerPayments({
      organizerId,
      offset: 0,
      limit: 100,
    });

    const byTournament = new Map<string, PaymentItem[]>();
    (response.payments || []).forEach((payment) => {
      const hasTournamentId = Number.isFinite(Number(payment.tournament_id));
      const key = hasTournamentId
        ? `t-${Number(payment.tournament_id)}`
        : `tmp-${String(payment.created_at || "unknown")}`;
      const current = byTournament.get(key) || [];
      current.push(payment);
      byTournament.set(key, current);
    });

    const grouped: GroupedTournamentPayment[] = Array.from(byTournament.entries()).map(
      ([groupKey, items]) => {
        const tournamentIdValue = Number(items[0]?.tournament_id);
        const hasTournamentId = Number.isFinite(tournamentIdValue);
        const totalAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const latestCreatedAt = [...items]
          .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0]?.created_at;

        return {
          groupKey,
          tournamentId: hasTournamentId ? tournamentIdValue : -1,
          totalAmount,
          status: getGroupedTournamentStatus(items),
          itemCount: items.length,
          latestCreatedAt: latestCreatedAt || new Date().toISOString(),
          paymentIds: items.map((item) => item.id),
          isTemporaryGroup: !hasTournamentId,
        };
      }
    );

    grouped.sort((a, b) => b.latestCreatedAt.localeCompare(a.latestCreatedAt));

    setGroupedTournamentPayments(grouped);
  }, []);

  const fetchPayments = useCallback(
    async (isRefresh = false) => {
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

        const nextRole = await resolveUserRole();
        setRole(nextRole);

        if (nextRole === "owner") {
          await fetchOrganizerTournaments();
          setPayments([]);
        } else {
          await fetchPlayerPayments();
          setGroupedTournamentPayments([]);
        }
      } catch (err: any) {
        setError(err?.message || "Không thể tải danh sách thanh toán");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchOrganizerTournaments, fetchPlayerPayments]
  );

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
      case "payment_required":
        return "bg-orange-100 text-orange-700";
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
        return "Chờ duyệt";
      case "confirmed":
        return "Đã xác nhận";
      case "payment_required":
        return "Chờ thanh toán";
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

  const handlePayTournament = async (tournamentId: number) => {
    try {
      setPayingTournamentId(tournamentId);
      const order = await paymentService.getTournamentZaloPayOrder(tournamentId);

      if (!order.order_url) {
        throw new Error("Không có link thanh toán cho giải đấu này");
      }

      const supported = await Linking.canOpenURL(order.order_url);
      if (!supported) {
        Alert.alert("Không thể mở ZaloPay", "Thiết bị không hỗ trợ mở link thanh toán này.");
        return;
      }

      await Linking.openURL(order.order_url);

      Alert.alert(
        "Đã tạo đơn thanh toán",
        `Mã giao dịch: ${order.app_trans_id}\nSố tiền: ${order.amount.toLocaleString("vi-VN")}đ`
      );
    } catch (error: any) {
      Alert.alert("Lỗi thanh toán", error?.message || "Không thể tạo link thanh toán giải đấu");
    } finally {
      setPayingTournamentId(null);
    }
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
        {role === "owner" ? (
          <>
            <View className="bg-white rounded-xl p-4 mb-4 border border-blue-100">
              <Text className="text-lg font-bold text-[#1E232C]">Thanh toán giải đấu</Text>
              <Text className="text-3xl font-bold text-[#114F99] mt-2">{groupedTournamentPayments.length}</Text>
              <Text className="text-gray-500 mt-1">Số cụm thanh toán theo giải</Text>
            </View>

            {error && (
              <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <Text className="text-red-600">{error}</Text>
              </View>
            )}

            {groupedTournamentPayments.length === 0 ? (
              <View className="bg-white rounded-xl p-6 items-center mb-4">
                <Ionicons name="trophy-outline" size={40} color="#9ca3af" />
                <Text className="text-gray-500 mt-2 text-center">
                  Chưa có giải đấu.
                </Text>
                <TouchableOpacity
                  className="mt-4 px-4 py-2 rounded-lg bg-[#114F99]"
                  onPress={() => router.push("/(tabs)/tournament")}
                >
                  <Text className="text-white font-semibold">Đi đến Giải đấu</Text>
                </TouchableOpacity>
              </View>
            ) : (
              groupedTournamentPayments.map((groupedPayment) => {
                const isPaying = payingTournamentId === groupedPayment.tournamentId;
                const canPay = !isPaidStatus(groupedPayment.status);

                return (
                  <View
                    key={groupedPayment.groupKey}
                    className="bg-white rounded-xl p-4 mb-3 border border-gray-100"
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <Text className="text-base font-bold text-[#1E232C] flex-1 pr-3">
                        {groupedPayment.isTemporaryGroup
                          ? "Cụm thanh toán tạm"
                          : `Giải đấu #${groupedPayment.tournamentId}`}
                      </Text>
                      <View className={`px-3 py-1 rounded-full ${getStatusStyle(groupedPayment.status).split(" ")[0]}`}>
                        <Text className={`font-semibold ${getStatusStyle(groupedPayment.status).split(" ")[1]}`}>
                          {getStatusText(groupedPayment.status)}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row justify-between mb-1">
                      <Text className="text-gray-500">Tổng tiền</Text>
                      <Text className="text-[#114F99] font-bold">
                        {groupedPayment.totalAmount.toLocaleString("vi-VN")}đ
                      </Text>
                    </View>
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-gray-500">Số dòng thanh toán</Text>
                      <Text className="text-gray-800 font-semibold">{groupedPayment.itemCount}</Text>
                    </View>
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-gray-500">Cập nhật</Text>
                      <Text className="text-gray-800 font-semibold">
                        {formatDateTime(groupedPayment.latestCreatedAt)}
                      </Text>
                    </View>

                    {canPay && !groupedPayment.isTemporaryGroup ? (
                      <TouchableOpacity
                        className="bg-[#0068FF] mt-3 py-3 rounded-lg"
                        onPress={() => handlePayTournament(groupedPayment.tournamentId)}
                        disabled={isPaying}
                      >
                        {isPaying ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text className="text-white text-center font-semibold">
                            Thanh toán toàn bộ giải đấu
                          </Text>
                        )}
                      </TouchableOpacity>
                    ) : groupedPayment.isTemporaryGroup ? (
                      <View className="bg-amber-50 mt-3 py-3 rounded-lg border border-amber-200">
                        <Text className="text-amber-700 text-center font-semibold">
                          Chờ backend trả tournament_id để thanh toán giải
                        </Text>
                      </View>
                    ) : (
                      <View className="bg-green-50 mt-3 py-3 rounded-lg border border-green-200">
                        <Text className="text-green-700 text-center font-semibold">Đã thanh toán</Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </>
        ) : (
          <>
            <View className="bg-white rounded-xl p-4 mb-4 border border-blue-100">
              <Text className="text-lg font-bold text-[#1E232C]">Các đơn chưa thanh toán</Text>
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
                <Text className="text-gray-500 mt-2 text-center">
                  Không có đơn nào phù hợp bộ lọc hiện tại.
                </Text>
              </View>
            ) : (
              filteredPayments.map((payment) => (
                <View key={payment.id} className="bg-white rounded-xl p-4 mb-3 border border-gray-100">
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-base font-bold text-[#1E232C]">Đơn #{payment.id}</Text>
                    <View
                      className={`px-3 py-1 rounded-full ${getStatusStyle(payment.status).split(" ")[0]}`}
                    >
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
                    <Text className="text-gray-800 font-semibold">
                      {getPaymentTypeText(payment.payment_type)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-gray-500">Số tiền</Text>
                    <Text className="text-[#114F99] font-bold">
                      {payment.amount.toLocaleString("vi-VN")}đ
                    </Text>
                  </View>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-gray-500">Hạn thanh toán</Text>
                    <Text className="text-gray-800 font-semibold">
                      {formatDateTime(payment.expires_at)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-gray-500">Tạo lúc</Text>
                    <Text className="text-gray-800 font-semibold">
                      {formatDateTime(payment.created_at)}
                    </Text>
                  </View>

                  {isPayableStatus(payment.status) && (
                    <TouchableOpacity
                      className="bg-[#0068FF] mt-3 py-3 rounded-lg"
                      onPress={() => handleOpenBookingDetail(payment.booking_id)}
                    >
                      <Text className="text-white text-center font-semibold">
                        Đi đến đơn đặt sân để thanh toán
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Payment;
