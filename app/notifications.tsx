import React from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import HeaderWithBack from "../component/HeaderWithBack";
import { useNotifications } from "@/src/context/notifications.context";
import { NotificationItem } from "@/src/types/notification.types";

const formatTime = (dateValue?: string) => {
  if (!dateValue) {
    return "Vừa xong";
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "Vừa xong";
  }

  return date.toLocaleString("vi-VN");
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, loading, refreshNotifications, markAsRead } = useNotifications();

  const getBookingIdFromNotification = (item: NotificationItem): number | null => {
    if (item.entity_id && Number.isFinite(item.entity_id)) {
      return Number(item.entity_id);
    }

    const data = item.data || {};
    const candidates = [
      data.booking_id,
      data.bookingId,
      data.entity_id,
      data.entityId,
      data.id,
      data.order_id,
      data.orderId,
    ];

    for (const value of candidates) {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    const matchedInTitle = String(item.title || "").match(/#(\d+)/);
    if (matchedInTitle?.[1]) {
      return Number(matchedInTitle[1]);
    }

    const matchedInMessage = String(item.message || "").match(/#(\d+)/);
    if (matchedInMessage?.[1]) {
      return Number(matchedInMessage[1]);
    }

    return null;
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    await markAsRead(item.id);

    const type = String(item.type || "").toLowerCase();
    const entityType = String(item.entity_type || "").toLowerCase();
    const text = `${item.title || ""} ${item.message || ""}`.toLowerCase();

    const isBooking =
      type.includes("booking") ||
      entityType.includes("booking") ||
      text.includes("đặt sân") ||
      text.includes("booking");

    if (isBooking) {
      const bookingId = getBookingIdFromNotification(item);
      if (bookingId) {
        await AsyncStorage.setItem("currentBookingId", String(bookingId));
        router.push("/(tabs)/(stadiums)/booking-detail");
        return;
      }

      router.push("/(tabs)/(users)/history");
      return;
    }

    const isPayment =
      type.includes("payment") ||
      entityType.includes("payment") ||
      text.includes("thanh toán") ||
      text.includes("payment");
    if (isPayment) {
      router.push("/(tabs)/payment");
      return;
    }

    const isClub =
      type.includes("club") || entityType.includes("club") || text.includes("clb");
    if (isClub) {
      router.push("/(tabs)/(users)/club-management");
      return;
    }

    const isTournament =
      type.includes("tournament") ||
      entityType.includes("tournament") ||
      text.includes("giải");
    if (isTournament) {
      router.push("/(tabs)/tournament");
    }
  };

  return (
    <View className="flex-1 bg-white">
      <HeaderWithBack title="Thông báo" />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshNotifications} />
        }
      >
        {notifications.length === 0 ? (
          <View className="items-center justify-center py-16 px-4">
            <Text className="text-base text-slate-500">Chưa có thông báo nào</Text>
          </View>
        ) : (
          notifications.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleNotificationPress(item)}
              className="px-4 py-3 border-b border-slate-200"
              style={{
                backgroundColor:
                  (item.status || "").toLowerCase() === "unread" ? "#eff6ff" : "#ffffff",
              }}
              activeOpacity={0.8}
            >
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-base font-semibold text-slate-800 flex-1" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text className="text-xs text-slate-500 ml-2">
                  {formatTime(item.created_at)}
                </Text>
              </View>

              <Text className="text-sm text-slate-600" numberOfLines={2}>
                {item.message}
              </Text>

              {(item.status || "").toLowerCase() === "unread" && (
                <Text className="text-xs mt-2" style={{ color: "#1e3a5f" }}>
                  Mới
                </Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}
