import { router, useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";
import { Text, View, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import HeaderUser from "@/component/HeaderUser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { bookingService } from "@/src/services/booking.service";
import { Booking } from "@/src/types/booking.types";
import { getBookingStatusMeta, isBookingPayable } from "@/src/utils/booking-status";

const History = () => {
  const [history, setHistory] = useState<Booking[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserDataAndHistory = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    try {
      if (!silent) {
        setLoading(true);
      }

      const userDataString = await AsyncStorage.getItem("userData");
      if (!userDataString) {
        Alert.alert("Lỗi", "Không tìm thấy thông tin người dùng!");
        router.replace("/login");
        return;
      }

      const parsedUserData = JSON.parse(userDataString);
      setUserData(parsedUserData);

      const userId = parsedUserData.user_id || parsedUserData.id || parsedUserData._id;
      if (!userId) {
        Alert.alert("Lỗi", "Không tìm thấy userId!");
        return;
      }

      console.log("[HISTORY] Fetching bookings for player:", userId);
      const result = await bookingService.getPlayerBookings({
        playerId: Number(userId),
        offset: 0,
        limit: 30,
      });

      const bookings = result.bookings || [];
      const sortedBookings = [...bookings].sort(
        (left, right) =>
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      );

      console.log("[HISTORY] Loaded bookings:", {
        total: result.total,
        count: sortedBookings.length,
        topIds: sortedBookings.slice(0, 8).map((booking) => booking.id),
      });

      setHistory(sortedBookings);

      return {
        hasPayableBooking: sortedBookings.some((booking) => isBookingPayable(booking.status)),
      };
    } catch (error) {
      console.error("[HISTORY] Lỗi khi lấy lịch sử đặt sân:", error);
      if (!silent) {
        Alert.alert("Lỗi", "Không thể tải lịch sử đặt sân. Vui lòng thử lại!");
      }

      return { hasPayableBooking: false };
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isCancelled = false;
      let delayedRefresh: ReturnType<typeof setTimeout> | null = null;

      const load = async () => {
        const result = await fetchUserDataAndHistory();

        // Trigger one silent refresh shortly after focus to catch async payment callbacks.
        if (result?.hasPayableBooking && !isCancelled) {
          delayedRefresh = setTimeout(() => {
            if (!isCancelled) {
              fetchUserDataAndHistory({ silent: true });
            }
          }, 2200);
        }
      };

      load();

      return () => {
        isCancelled = true;
        if (delayedRefresh) {
          clearTimeout(delayedRefresh);
        }
      };
    }, [fetchUserDataAndHistory])
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text>Đang tải...</Text>
      </SafeAreaView>
    );
  }

  if (!userData) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text>Không tìm thấy thông tin người dùng</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <HeaderUser title="Lịch sử đặt sân" />

      <ScrollView className="flex-1 px-4 mt-4">
        <Text className="text-lg font-semibold mb-2 text-gray-900">Lịch sử đặt sân</Text>
        {history.length === 0 ? (
          <Text className="text-center text-gray-500 mt-6">
            Không có lịch sử đặt sân.
          </Text>
        ) : (
          history.map((item) => {
            const bookingDate = new Date(item.booking_date);
            const formattedDate = bookingDate.toLocaleDateString("vi-VN");
            
            // Parse time "HH:MM:SS" or "HH:MM:SS.ffffff"
            const startTime = item.start_time.substring(0, 5); // Get HH:MM
            const endTime = item.end_time.substring(0, 5);
            
            // Status translation
            const statusMeta = getBookingStatusMeta(item.status);

            return (
              <View
                key={item.id}
                className="border border-gray-300 rounded-lg p-4 mb-3 bg-white"
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1">
                    <Text className="text-xs text-gray-500">
                      Mã đơn: #{item.id}
                    </Text>
                    <Text className="text-sm font-semibold mt-1">
                      {formattedDate} • {startTime} - {endTime}
                    </Text>
                    <Text className="text-xs text-gray-600 mt-1">
                      Loại: {item.type === "half" ? "Nửa sân (Tìm đối)" : "Bao sân"}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className={`text-sm font-bold ${statusMeta.textColorClass}`}>
                      {statusMeta.label}
                    </Text>
                    <Text className="text-lg font-bold text-blue-600 mt-1">
                      {new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(item.total_price)}
                    </Text>
                  </View>
                </View>

                <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-gray-200">
                  <Text className="text-xs text-gray-500">
                    Đặt lúc: {new Date(item.created_at).toLocaleString("vi-VN")}
                  </Text>
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        const bookingId = item.id.toString();
                        await AsyncStorage.setItem("currentBookingId", bookingId);
                        console.log("[HISTORY] Navigate to stadium booking-detail with currentBookingId:", bookingId);
                        router.push("/(tabs)/(stadiums)/booking-detail");
                      } catch (error) {
                        console.error("[HISTORY] Failed to open booking detail:", error);
                        Alert.alert("Lỗi", "Không thể mở chi tiết đặt sân");
                      }
                    }}
                    className="border border-blue-500 px-4 py-1 rounded-full"
                  >
                    <Text className="text-blue-600 font-semibold text-sm">
                      Chi tiết
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
        
        {/* Button Quay lại bên trong ScrollView */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="items-center mt-6 mb-8"
        >
          <View className="border-2 border-red-500 px-8 py-2 rounded-full">
            <Text className="text-red-600 font-semibold text-lg">Quay lại</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default History;
