import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { io, Socket } from "socket.io-client";
import chatService from "@/src/services/chat.service";
import type { ChatMessage } from "@/src/types/chat.types";
import API_CONFIG from "@/src/config/api.config";

const resolveCurrentUserId = async (): Promise<number | null> => {
  try {
    const [userDataRaw, profileRaw] = await Promise.all([
      AsyncStorage.getItem("userData"),
      AsyncStorage.getItem("userProfile"),
    ]);

    if (userDataRaw) {
      const userData = JSON.parse(userDataRaw);
      const fromUserData = Number(userData?.user_id ?? userData?.id ?? userData?._id);
      if (Number.isFinite(fromUserData) && fromUserData > 0) {
        return fromUserData;
      }
    }

    if (profileRaw) {
      const profile = JSON.parse(profileRaw);
      const fromProfile = Number(profile?.id ?? profile?.user_id);
      if (Number.isFinite(fromProfile) && fromProfile > 0) {
        return fromProfile;
      }
    }

    return null;
  } catch {
    return null;
  }
};

const getMessageTimestamp = (message?: ChatMessage) => {
  const date = new Date(message?.created_at || "");
  return Number.isNaN(date.getTime()) ? null : date;
};

const isSameMessageDay = (left?: ChatMessage, right?: ChatMessage) => {
  const leftDate = getMessageTimestamp(left);
  const rightDate = getMessageTimestamp(right);
  if (!leftDate || !rightDate) {
    return false;
  }

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
};

const formatMessageDateHeader = (message?: ChatMessage) => {
  const date = getMessageTimestamp(message);
  if (!date) {
    return "";
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameMessageDay({ created_at: today.toISOString() } as ChatMessage, message)) {
    return "Hôm nay";
  }

  if (isSameMessageDay({ created_at: yesterday.toISOString() } as ChatMessage, message)) {
    return "Hôm qua";
  }

  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ receiverId?: string; name?: string }>();
  const receiverId = Number(params.receiverId);
  const receiverName = params.name ? String(params.name) : "Người dùng";

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const socketRef = useRef<Socket | null>(null);

  const getSocketServerUrl = () => {
    const envUrl = process.env.EXPO_PUBLIC_SOCKET_URL?.trim();
    if (envUrl) {
      return envUrl.replace(/\/$/, "");
    }

    return API_CONFIG.BASE_URL.replace(/\/$/, "").replace(/\/api\/v\d+$/i, "");
  };

  const getSocketPath = () => {
    const envPath = process.env.EXPO_PUBLIC_SOCKET_PATH?.trim();
    if (!envPath) {
      return "/socket.io";
    }

    return envPath.startsWith("/") ? envPath : `/${envPath}`;
  };

  const loadMessages = useCallback(async (showLoading = false) => {
    if (!Number.isFinite(receiverId) || receiverId <= 0) {
      setError("Receiver ID không hợp lệ");
      return;
    }

    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const result = await chatService.getMessages({
        receiverId,
        offset: 0,
        limit: 50,
      });

      const sorted = [...(result.messages || [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setMessages(sorted);
    } catch (loadError: any) {
      setError(loadError?.message || "Không thể tải tin nhắn");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [receiverId]);

  useEffect(() => {
    const init = async () => {
      const userId = await resolveCurrentUserId();
      setCurrentUserId(userId);
      await loadMessages(true);
    };

    init();
  }, [loadMessages]);

  const upsertIncomingMessage = useCallback(
    (incoming: ChatMessage) => {
      if (!currentUserId) {
        return;
      }

      const isCurrentConversation =
        (incoming.sender_id === currentUserId && incoming.receiver_id === receiverId) ||
        (incoming.sender_id === receiverId && incoming.receiver_id === currentUserId);

      if (!isCurrentConversation) {
        return;
      }

      setMessages((prev) => {
        const exists = prev.some((item) => item.id === incoming.id);
        if (exists) {
          return prev;
        }

        return [...prev, incoming].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
    },
    [currentUserId, receiverId]
  );

  useFocusEffect(
    useCallback(() => {
      if (!currentUserId || !Number.isFinite(receiverId) || receiverId <= 0) {
        return;
      }

      const socket = io(getSocketServerUrl(), {
        path: getSocketPath(),
        transports: ["websocket"],
        upgrade: false,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("authenticate", { user_id: currentUserId });
      });

      const handleRealtimeMessage = (payload: any) => {
        if (!payload || typeof payload !== "object") {
          return;
        }

        const normalized: ChatMessage | null =
          (payload?.data as ChatMessage) ||
          (payload?.message as ChatMessage) ||
          (payload as ChatMessage);

        if (!normalized?.id || !normalized?.sender_id || !normalized?.receiver_id) {
          return;
        }

        upsertIncomingMessage(normalized);
      };

      // Support multiple potential backend event names.
      socket.on("chat:message", handleRealtimeMessage);
      socket.on("chat:message:new", handleRealtimeMessage);
      socket.on("message:new", handleRealtimeMessage);

      // Keep light polling as fallback in case server event name differs.
      loadMessages(false);
      const timerId = setInterval(() => {
        loadMessages(false);
      }, 15000);

      return () => {
        clearInterval(timerId);
        socket.off("chat:message", handleRealtimeMessage);
        socket.off("chat:message:new", handleRealtimeMessage);
        socket.off("message:new", handleRealtimeMessage);
        socket.disconnect();
        socketRef.current = null;
      };
    },
    [currentUserId, loadMessages, receiverId, upsertIncomingMessage]
  ));

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) {
      return;
    }

    if (!Number.isFinite(receiverId) || receiverId <= 0) {
      setError("Receiver ID không hợp lệ");
      return;
    }

    try {
      setSending(true);
      const sent = await chatService.sendMessage({
        receiver_id: receiverId,
        content,
      });

      setMessages((prev) => [...prev, sent]);
      setInput("");
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    } catch (sendError: any) {
      setError(sendError?.message || "Không thể gửi tin nhắn");
    } finally {
      setSending(false);
    }
  };

  const canSend = useMemo(() => !!input.trim() && !sending, [input, sending]);

  return (
    <SafeAreaView className="flex-1 bg-[#eef2ff]" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 12}
      >
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200">
          <TouchableOpacity
            className="w-10 h-10 rounded-xl border border-gray-200 items-center justify-center"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#1f2937" />
          </TouchableOpacity>
          <View className="ml-3 flex-1">
            <Text className="text-gray-900 font-bold text-lg">Chat hỗ trợ</Text>
            <Text className="text-gray-500 text-sm">{receiverName}</Text>
          </View>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-gray-600 mt-3">Đang tải tin nhắn...</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => {
              const mine = item.sender_id === currentUserId;
              const showDateHeader = index === 0 || !isSameMessageDay(messages[index - 1], item);
              return (
                <View>
                  {showDateHeader ? (
                    <View className="items-center my-3">
                      <View className="bg-white/90 border border-gray-200 rounded-full px-3 py-1">
                        <Text className="text-xs font-semibold text-gray-500">
                          {formatMessageDateHeader(item)}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  <View className={`mb-2 ${mine ? "items-end" : "items-start"}`}>
                    <View
                      className={`max-w-[82%] px-3 py-2 rounded-2xl ${mine ? "bg-blue-600" : "bg-white border border-gray-200"}`}
                    >
                      <Text className={`${mine ? "text-white" : "text-gray-900"}`}>
                        {item.content}
                      </Text>
                      <Text className={`text-xs mt-1 ${mine ? "text-blue-100" : "text-gray-400"}`}>
                        {new Date(item.created_at).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View className="items-center justify-center py-16">
                <Ionicons name="chatbubble-ellipses-outline" size={48} color="#9ca3af" />
                <Text className="text-gray-500 mt-3">Chưa có tin nhắn</Text>
              </View>
            }
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {error && (
          <View className="px-4 pb-2">
            <Text className="text-red-500 text-sm">{error}</Text>
          </View>
        )}

        <View
          className="flex-row items-end px-3 py-2 bg-white border-t border-gray-200"
          style={{ paddingBottom: insets.bottom }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Nhập tin nhắn..."
            multiline
            className="flex-1 max-h-28 border border-gray-300 rounded-2xl px-3 py-2 text-gray-900"
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!canSend}
            className={`ml-2 w-11 h-11 rounded-full items-center justify-center ${canSend ? "bg-blue-600" : "bg-gray-300"}`}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
