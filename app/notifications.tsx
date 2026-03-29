import React from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import HeaderWithBack from "../component/HeaderWithBack";
import { useNotifications } from "@/src/context/notifications.context";

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
  const { notifications, loading, refreshNotifications, markAsRead } = useNotifications();

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
              onPress={() => markAsRead(item.id)}
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
