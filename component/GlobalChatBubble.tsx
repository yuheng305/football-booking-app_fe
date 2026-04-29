import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import chatService from "@/src/services/chat.service";

const HIDDEN_PATH_PREFIXES = [
  "/",
  "/index",
  "/onboarding",
  "/login",
  "/signup",
  "/forgot-password",
  "/chat",
  "/chats",
];

export default function GlobalChatBubble() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [hasToken, setHasToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);

  const shouldHide = useMemo(
    () => HIDDEN_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)),
    [pathname]
  );

  const loadUnread = useCallback(async () => {
    try {
      setLoading(true);
      const [token, userDataRaw, profileRaw] = await Promise.all([
        AsyncStorage.getItem("authToken"),
        AsyncStorage.getItem("userData"),
        AsyncStorage.getItem("userProfile"),
      ]);

      const isAuthed = !!token;
      setHasToken(isAuthed);

      const rawRole = (
        (userDataRaw ? JSON.parse(userDataRaw)?.role : null) ||
        (profileRaw ? JSON.parse(profileRaw)?.role : null) ||
        ""
      )
        .toString()
        .trim()
        .toLowerCase();

      if (!isAuthed) {
        setUnread(0);
        return;
      }

      const result = await chatService.getConversations({ offset: 0, limit: 30 });
      const unreadCount = (result.conversations || []).reduce(
        (acc, item) => acc + (Number(item.unread_count) || 0),
        0
      );
      setUnread(unreadCount);
    } catch {
      // Keep bubble visible even if conversations API is temporarily unavailable.
      setUnread(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (shouldHide) {
      return;
    }

    loadUnread();
  }, [loadUnread, shouldHide, pathname]);

  if (shouldHide || !hasToken) {
    return null;
  }

  return (
    <View
      className="absolute right-5"
      style={{
        bottom: Math.max(insets.bottom + 84, 96),
        zIndex: 9999,
        elevation: 40,
      }}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        className="w-14 h-14 rounded-full bg-blue-600 items-center justify-center shadow"
        onPress={() => router.push("/chats")}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
        )}
      </TouchableOpacity>

      {unread > 0 && (
        <View className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-red-500 items-center justify-center">
          <Text className="text-white text-xs font-bold">{unread > 99 ? "99+" : unread}</Text>
        </View>
      )}
    </View>
  );
}
