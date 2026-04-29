import { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotifications } from "@/src/context/notifications.context";

const HIDDEN_PATH_PREFIXES = [
  "/",
  "/index",
  "/onboarding",
  "/login",
  "/signup",
  "/forgot-password",
  "/notifications",
  "/chat",
  "/chats",
];

export default function GlobalNotificationBubble() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();
  const [hasToken, setHasToken] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const shouldHide = useMemo(
    () =>
      HIDDEN_PATH_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
      ),
    [pathname]
  );

  useEffect(() => {
    const loadIdentity = async () => {
      const [token, userDataRaw, profileRaw] = await Promise.all([
        AsyncStorage.getItem("authToken"),
        AsyncStorage.getItem("userData"),
        AsyncStorage.getItem("userProfile"),
      ]);

      setHasToken(!!token);

      const rawRole = (
        (userDataRaw ? JSON.parse(userDataRaw)?.role : null) ||
        (profileRaw ? JSON.parse(profileRaw)?.role : null) ||
        ""
      )
        .toString()
        .trim()
        .toLowerCase();
      setRole(rawRole || null);
    };

    loadIdentity();
  }, [pathname]);

  const isOwnerRole = role === "owner" || role === "organizer";
  if (shouldHide || !hasToken || !isOwnerRole) {
    return null;
  }

  return (
    <View
      className="absolute right-5"
      style={{
        bottom: Math.max(insets.bottom + 148, 160),
        zIndex: 9999,
        elevation: 40,
      }}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        className="w-14 h-14 rounded-full items-center justify-center"
        style={{ backgroundColor: "#17345c" }}
        onPress={() => router.push("/notifications")}
      >
        <Ionicons name="notifications-outline" size={25} color="#dbeafe" />
      </TouchableOpacity>

      {unreadCount > 0 && (
        <View className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-red-500 items-center justify-center">
          <Text
            className="text-white text-xs font-bold"
            numberOfLines={1}
            allowFontScaling={false}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );
}
