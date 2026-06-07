import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  PanResponder,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotifications } from "@/src/context/notifications.context";
import chatService from "@/src/services/chat.service";

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

const FAB_SIZE = 56;
const FAB_GAP = 12;
const STACK_HEIGHT = FAB_SIZE + FAB_GAP + FAB_SIZE;
const EDGE_MARGIN = 16;

const POSITION_STORAGE_KEY = "globalFloatingFabPosition";

type FabPosition = { left: number; top: number };

function clampPosition(
  left: number,
  top: number,
  screenW: number,
  screenH: number,
  insets: { top: number; bottom: number }
): FabPosition {
  const minL = EDGE_MARGIN;
  const maxL = screenW - FAB_SIZE - EDGE_MARGIN;
  const minT = insets.top + EDGE_MARGIN;
  const maxT = screenH - insets.bottom - EDGE_MARGIN - STACK_HEIGHT;
  return {
    left: Math.min(Math.max(left, minL), Math.max(minL, maxL)),
    top: Math.min(Math.max(top, minT), Math.max(minT, maxT)),
  };
}

function defaultBottomRight(screenW: number, screenH: number, insets: { top: number; bottom: number }): FabPosition {
  const bottomGap = Math.max(insets.bottom + 84, 96);
  const left = screenW - EDGE_MARGIN - FAB_SIZE;
  const top = screenH - bottomGap - STACK_HEIGHT;
  return clampPosition(left, top, screenW, screenH, insets);
}

/**
 * Nút thông báo + chat nổi, kéo được (không trùng với bell trên header — đã tắt mặc định).
 */
export default function GlobalFloatingActionGroup() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { unreadCount } = useNotifications();

  const [hasToken, setHasToken] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);

  const positionRef = useRef<FabPosition>(
    defaultBottomRight(screenW, screenH, insets)
  );
  const [position, setPosition] = useState<FabPosition>(() =>
    defaultBottomRight(screenW, screenH, insets)
  );
  const dragOriginRef = useRef<FabPosition>(positionRef.current);

  const shouldHide = useMemo(
    () =>
      HIDDEN_PATH_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
      ),
    [pathname]
  );

  const loadIdentityAndChat = useCallback(async () => {
    try {
      setLoadingChat(true);
      const token = await AsyncStorage.getItem("authToken");
      setHasToken(!!token);
      if (!token) {
        setChatUnread(0);
        return;
      }
      const result = await chatService.getConversations({ offset: 0, limit: 30 });
      const unreadCountSum = (result.conversations || []).reduce(
        (acc, item) => acc + (Number(item.unread_count) || 0),
        0
      );
      setChatUnread(unreadCountSum);
    } catch {
      setChatUnread(0);
    } finally {
      setLoadingChat(false);
    }
  }, []);

  useEffect(() => {
    if (shouldHide) return;
    loadIdentityAndChat();
  }, [loadIdentityAndChat, shouldHide, pathname]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(POSITION_STORAGE_KEY);
        if (!raw || cancelled) return;
        const parsed = JSON.parse(raw) as FabPosition;
        if (
          typeof parsed.left === "number" &&
          typeof parsed.top === "number" &&
          Number.isFinite(parsed.left) &&
          Number.isFinite(parsed.top)
        ) {
          const next = clampPosition(parsed.left, parsed.top, screenW, screenH, insets);
          positionRef.current = next;
          setPosition(next);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [screenW, screenH, insets.top, insets.bottom]);

  useEffect(() => {
    const next = clampPosition(
      positionRef.current.left,
      positionRef.current.top,
      screenW,
      screenH,
      insets
    );
    if (next.left !== positionRef.current.left || next.top !== positionRef.current.top) {
      positionRef.current = next;
      setPosition(next);
    }
  }, [screenW, screenH, insets.top, insets.bottom]);

  const persistPosition = useCallback(async (pos: FabPosition) => {
    try {
      await AsyncStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(pos));
    } catch {
      // ignore
    }
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gs) =>
          Math.abs(gs.dx) > 10 || Math.abs(gs.dy) > 10,
        onMoveShouldSetPanResponderCapture: (_, gs) =>
          Math.abs(gs.dx) > 10 || Math.abs(gs.dy) > 10,
        onPanResponderGrant: () => {
          dragOriginRef.current = { ...positionRef.current };
        },
        onPanResponderMove: (_, gs) => {
          const next = clampPosition(
            dragOriginRef.current.left + gs.dx,
            dragOriginRef.current.top + gs.dy,
            screenW,
            screenH,
            insets
          );
          positionRef.current = next;
          setPosition(next);
        },
        onPanResponderRelease: () => {
          void persistPosition(positionRef.current);
        },
        onPanResponderTerminate: () => {
          void persistPosition(positionRef.current);
        },
      }),
    [screenW, screenH, insets.top, insets.bottom, persistPosition]
  );

  if (shouldHide || !hasToken) {
    return null;
  }

  return (
    <View
      style={{
        position: "absolute",
        left: position.left,
        top: position.top,
        width: FAB_SIZE,
        zIndex: 9999,
        elevation: 40,
      }}
      pointerEvents="box-none"
      {...panResponder.panHandlers}
    >
      <View style={{ width: FAB_SIZE, height: FAB_SIZE, marginBottom: 12 }}>
        <TouchableOpacity
          style={{
            width: FAB_SIZE,
            height: FAB_SIZE,
            borderRadius: FAB_SIZE / 2,
            backgroundColor: "#17345c",
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={() => router.push("/notifications")}
          activeOpacity={0.85}
        >
          <Ionicons name="notifications-outline" size={25} color="#dbeafe" />
        </TouchableOpacity>
        {unreadCount > 0 && (
          <View
            className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-red-500 items-center justify-center"
            pointerEvents="none"
          >
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

      <View style={{ width: FAB_SIZE, height: FAB_SIZE }}>
        <TouchableOpacity
          style={{
            width: FAB_SIZE,
            height: FAB_SIZE,
            borderRadius: FAB_SIZE / 2,
            backgroundColor: "#2563eb",
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={() => router.push("/chats")}
          activeOpacity={0.85}
        >
          {loadingChat ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
          )}
        </TouchableOpacity>
        {chatUnread > 0 && (
          <View
            className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-red-500 items-center justify-center"
            pointerEvents="none"
          >
            <Text className="text-white text-xs font-bold">
              {chatUnread > 99 ? "99+" : chatUnread}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
