import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import chatService from "@/src/services/chat.service";
import type { ChatConversation } from "@/src/types/chat.types";
import API_CONFIG from "@/src/config/api.config";

const resolveRole = async (): Promise<"owner" | "player"> => {
  try {
    const [userDataRaw, profileRaw] = await Promise.all([
      AsyncStorage.getItem("userData"),
      AsyncStorage.getItem("userProfile"),
    ]);

    const userRole = userDataRaw ? JSON.parse(userDataRaw)?.role : null;
    const profileRole = profileRaw ? JSON.parse(profileRaw)?.role : null;
    const role = String(userRole || profileRole || "").toLowerCase();

    if (role === "owner" || role === "organizer") {
      return "owner";
    }

    return "player";
  } catch {
    return "player";
  }
};

export default function ConversationsScreen() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"owner" | "player">("player");
  const [phoneInput, setPhoneInput] = useState("");
  const [resolvingPhone, setResolvingPhone] = useState(false);

  const loadConversations = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);
      const result = await chatService.getConversations({ offset: 0, limit: 30 });
      setConversations(result.conversations || []);
    } catch (loadError: any) {
      setError(loadError?.message || "Không thể tải danh sách hội thoại");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const nextRole = await resolveRole();
      setRole(nextRole);
      await loadConversations(false);
    };

    init();
  }, [loadConversations]);

  const tryResolvePhoneToUser = async (phone: string) => {
    const trimmed = phone.trim();
    if (!trimmed) {
      Alert.alert("Lỗi", "Vui lòng nhập số điện thoại");
      return null;
    }

    setResolvingPhone(true);
    try {
      const token = await AsyncStorage.getItem("authToken");
      const candidates = [
        `${API_CONFIG.BASE_URL}/users/lookup?phone=${encodeURIComponent(trimmed)}`,
        `${API_CONFIG.BASE_URL}/users/search?phone=${encodeURIComponent(trimmed)}`,
        `${API_CONFIG.BASE_URL}/users?phone=${encodeURIComponent(trimmed)}`,
        `${API_CONFIG.BASE_URL}/players/phone/${encodeURIComponent(trimmed)}`,
      ];

      for (const url of candidates) {
        try {
          const res = await fetch(url, {
            method: "GET",
            headers: token
              ? { accept: "application/json", Authorization: `Bearer ${token}` }
              : { accept: "application/json" },
          });

          if (!res.ok) continue;
          const payload = await res.json().catch(() => null);
          const data = payload?.data || payload || null;
          const id = data?.id || data?.user?.id || data?.user_id || data?.player_id || null;
          const name = data?.fullName || data?.first_name
            ? [data.first_name, data.last_name].filter(Boolean).join(" ")
            : data?.name || data?.email || null;

          if (id) return { id: String(id), name: name || `User #${id}` };
        } catch (e) {
          // try next candidate
        }
      }

      return null;
    } finally {
      setResolvingPhone(false);
    }
  };

  const title = useMemo(
    () => (role === "owner" ? "Hội thoại với người chơi" : "Hội thoại với chủ sân"),
    [role]
  );

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity
          className="w-10 h-10 rounded-xl border border-gray-200 items-center justify-center"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#1f2937" />
        </TouchableOpacity>
        <View className="ml-3 flex-1">
          <Text className="text-gray-900 font-bold text-lg">{title}</Text>
          <Text className="text-gray-500 text-sm">Chọn hội thoại để nhắn tin</Text>
        </View>
      </View>

      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <TextInput
          value={phoneInput}
          onChangeText={setPhoneInput}
          placeholder="Nhập số điện thoại để bắt đầu chat"
          keyboardType="phone-pad"
          className="bg-gray-100 px-3 py-2 rounded-lg"
        />
        <TouchableOpacity
          className="bg-blue-500 rounded-lg p-3 mt-3 items-center"
          onPress={async () => {
            const resolved = await tryResolvePhoneToUser(phoneInput);
            if (!resolved) {
              Alert.alert("Không tìm thấy", "Không tìm thấy người dùng với số điện thoại này");
              return;
            }

            router.push({
              pathname: "/chat",
              params: { receiverId: resolved.id, name: resolved.name },
            } as any);
          }}
          disabled={resolvingPhone}
        >
          {resolvingPhone ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold">Bắt đầu chat</Text>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-gray-600 mt-3">Đang tải hội thoại...</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.other_user_id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadConversations(true)} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              className="bg-white rounded-2xl border border-gray-200 px-4 py-3 mb-3"
              onPress={() =>
                router.push({
                  pathname: "/chat",
                  params: {
                    receiverId: String(item.other_user_id),
                    name: item.other_user_name || item.other_user_email || `User #${item.other_user_id}`,
                  },
                } as any)
              }
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-gray-900 font-bold text-base">
                    {item.other_user_name || `User #${item.other_user_id}`}
                  </Text>
                  <Text className="text-gray-500 text-xs mt-0.5">{item.other_user_email}</Text>
                  <Text className="text-gray-700 mt-2" numberOfLines={1}>
                    {item.last_message || "(Không có nội dung)"}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-gray-400 text-xs">
                    {item.last_message_time
                      ? new Date(item.last_message_time).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "--:--"}
                  </Text>
                  {item.unread_count > 0 && (
                    <View className="mt-2 min-w-[22px] h-[22px] px-1 rounded-full bg-red-500 items-center justify-center">
                      <Text className="text-white text-xs font-bold">
                        {item.unread_count > 99 ? "99+" : item.unread_count}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Ionicons name="chatbubbles-outline" size={54} color="#9ca3af" />
              <Text className="text-gray-500 mt-3">Chưa có hội thoại nào</Text>
            </View>
          }
        />
      )}

      {error && (
        <View className="px-4 pb-3">
          <Text className="text-red-500 text-sm">{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
