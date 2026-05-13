import React, { useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import HeaderWithBack from "../component/HeaderWithBack";
import { useNotifications } from "@/src/context/notifications.context";
import { NotificationItem } from "@/src/types/notification.types";
import { getRawUserRoleFromStorage, isFieldOwnerRole } from "@/src/utils/role.util";

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

  useFocusEffect(
    useCallback(() => {
      refreshNotifications();
    }, [refreshNotifications])
  );

  const getCurrentUserRole = async (): Promise<string | null> => {
    try {
      const [userDataRaw, profileRaw, legacyRole] = await Promise.all([
        AsyncStorage.getItem("userData"),
        AsyncStorage.getItem("userProfile"),
        AsyncStorage.getItem("userRole"),
      ]);

      const rawRole = (
        (userDataRaw ? JSON.parse(userDataRaw)?.role : null) ||
        (profileRaw ? JSON.parse(profileRaw)?.role : null) ||
        legacyRole ||
        ""
      )
        .toString()
        .trim()
        .toLowerCase();

      if (rawRole === "user") return "player";
      if (rawRole === "organizer") return "owner";
      return rawRole || null;
    } catch {
      return null;
    }
  };

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

  const getTournamentIdFromNotification = (item: NotificationItem): number | null => {
    if (item.entity_id && Number.isFinite(item.entity_id)) {
      return Number(item.entity_id);
    }

    const data = item.data || {};
    const candidates = [
      data.tournament_id,
      data.tournamentId,
      data.entity_id,
      data.entityId,
      data.id,
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

  const getClusterIdFromNotification = (item: NotificationItem): number | null => {
    const data = item.data || {};
    const candidates = [data.cluster_id, data.clusterId, item.entity_id, data.id];

    for (const value of candidates) {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return null;
  };

  const getFieldIdFromNotification = (item: NotificationItem): number | null => {
    const data = item.data || {};
    const candidates = [data.field_id, data.fieldId, item.entity_id, data.id];

    for (const value of candidates) {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return null;
  };

  const getPaymentBookingIdFromNotification = (item: NotificationItem): number | null => {
    const data = item.data || {};
    const candidates = [data.booking_id, data.bookingId, item.entity_id, data.id];

    for (const value of candidates) {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return null;
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    await markAsRead(item.id);

    const currentRole = await getCurrentUserRole();

    const type = String(item.type || "").toLowerCase();
    const entityType = String(item.entity_type || "").toLowerCase();
    const text = `${item.title || ""} ${item.message || ""}`.toLowerCase();

    const isBooking =
      type.includes("booking") ||
      entityType.includes("booking") ||
      text.includes("đặt sân") ||
      text.includes("booking");

    const isTournament =
      type.includes("tournament") ||
      entityType.includes("tournament") ||
      text.includes("giải");

    const isPaymentConfirmed =
      type === "payment_confirmed" ||
      text.includes("xác nhận thanh toán") ||
      text.includes("đã được xác nhận");

    const isPayment =
      type.includes("payment") ||
      entityType.includes("payment") ||
      text.includes("thanh toán") ||
      text.includes("payment");

    if (entityType === "cluster") {
      const clusterId = getClusterIdFromNotification(item);
      if (clusterId) {
        router.push({
          pathname: "/(owners)/(stadium)/clusterDetail",
          params: { id: String(clusterId) },
        });
        return;
      }

      router.push("/(owners)/(stadium)/clusterList");
      return;
    }

    if (entityType === "field") {
      const fieldId = getFieldIdFromNotification(item);
      if (fieldId) {
        router.push({
          pathname: "/(owners)/(stadium)/stadiumManagement",
          params: { fieldId: String(fieldId) },
        });
        return;
      }

      router.push("/(owners)/(stadium)/stadiumManagement");
      return;
    }

    if (isTournament) {
      const tournamentId = getTournamentIdFromNotification(item);
      if (tournamentId) {
        const rawRole = await getRawUserRoleFromStorage();
        /** Thanh toán giải vừa xong — BE đôi khi chưa kịp trả payment_status; gửi hint để không hiện "Không rõ". */
        const paymentHint =
          type === "payment_confirmed" ||
          (type.includes("payment") &&
            (text.includes("thanh toán") || text.includes("payment")) &&
            (text.includes("thành công") || text.includes("success")));
        const paidParams = paymentHint ? { paymentStatus: "paid" as const } : {};

        if (isFieldOwnerRole(rawRole)) {
          router.push({
            pathname: "/(owners)/(booking)/tournament-detail",
            params: { id: String(tournamentId), source: "owner", ...paidParams },
          });
        } else {
          router.push({
            pathname: "/(tabs)/tournament/detail",
            params: { id: String(tournamentId), ...paidParams },
          });
        }
        return;
      }

      router.push("/(tabs)/tournament");
      return;
    }

    if (isPaymentConfirmed) {
      const bookingId = getPaymentBookingIdFromNotification(item);
      if (bookingId) {
        await AsyncStorage.setItem("currentBookingId", String(bookingId));
        if (currentRole === "owner") {
          router.push({
            pathname: "/(owners)/(booking)/bookingDetail",
            params: { id: String(bookingId) },
          });
        } else {
          router.push("/(tabs)/stadium/booking-detail");
        }
        return;
      }

      if (currentRole === "owner") {
        router.push("/(owners)/(booking)/ownerBookingManagement");
      } else {
        router.push("/(tabs)/(users)/history");
      }
      return;
    }

    if (isPayment) {
      if (currentRole === "owner") {
        router.push("/(owners)/(booking)/ownerBookingManagement");
      } else {
        router.push("/(tabs)/payment");
      }
      return;
    }

    if (isBooking) {
      const bookingId = getBookingIdFromNotification(item);
      if (bookingId) {
        await AsyncStorage.setItem("currentBookingId", String(bookingId));
        if (currentRole === "owner") {
          router.push({
            pathname: "/(owners)/(booking)/bookingDetail",
            params: { id: String(bookingId) },
          });
        } else {
          router.push("/(tabs)/stadium/booking-detail");
        }
        return;
      }

      if (currentRole === "owner") {
        router.push("/(owners)/(booking)/ownerBookingManagement");
      } else {
        router.push("/(tabs)/(users)/history");
      }
      return;
    }

    const isClub =
      type.includes("club") || entityType.includes("club") || text.includes("clb");
    if (isClub) {
      router.push("/(tabs)/(users)/club-management");
      return;
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
