import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "expo-router";
import { StatusBar, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Socket } from "socket.io-client";
import notificationService from "../services/notification.service";
import type { NotificationItem } from "../types/notification.types";
import { resolveProviderNotificationNavigation } from "../utils/notification-navigation.util";
import { getRawUserRoleFromStorage, resolveUserRoleFromStorage } from "../utils/role.util";

type NotificationsContextValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(
  undefined
);

function normalizeNotification(raw: any): NotificationItem {
  const source = raw?.notification && typeof raw.notification === "object"
    ? raw.notification
    : raw;

  return {
    id: Number(source?.id ?? 0),
    user_id: source?.user_id != null ? Number(source.user_id) : undefined,
    type: source?.type ?? "system",
    title: source?.title ?? "Thông báo",
    message: source?.message ?? "",
    entity_type: source?.entity_type ?? null,
    entity_id: source?.entity_id != null ? Number(source.entity_id) : null,
    data:
      source?.data && typeof source.data === "object"
        ? (source.data as Record<string, any>)
        : null,
    status: source?.status ?? "unread",
    read_at: source?.read_at ?? null,
    created_at: source?.created_at,
    updated_at: source?.updated_at,
  };
}

function getNotificationId(raw: any): number {
  const source = raw?.notification && typeof raw.notification === "object"
    ? raw.notification
    : raw;

  return Number(source?.id ?? source?.notification_id);
}

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const router = useRouter();
  const pathname = usePathname();
  const isGuestRoute =
    pathname === "/" ||
    pathname === "/index" ||
    pathname === "/onboarding" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password";
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [popupNotification, setPopupNotification] = useState<NotificationItem | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const popupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNotificationPress = useCallback(
    async (notification: NotificationItem) => {
      const appRole = await resolveUserRoleFromStorage();
      const rawRole = await getRawUserRoleFromStorage();
      const plan = resolveProviderNotificationNavigation(notification, { appRole, rawRole });

      if (plan.kind === "noop") {
        if (plan.reason === "missing_target") {
          console.log("[NOTIFICATIONS] No navigation target for notification:", {
            entity_type: notification.entity_type,
            entity_id: notification.entity_id,
          });
        } else {
          console.log(
            "[NOTIFICATIONS] Unknown entity_type for navigation:",
            notification.entity_type
          );
        }
        return;
      }

      try {
        if (plan.kind === "setCurrentBookingIdAndPush") {
          await AsyncStorage.setItem("currentBookingId", String(plan.bookingId));
          router.push(plan.pathname as never);
          return;
        }
        if (plan.kind === "pushHref") {
          router.push(plan.href as never);
          return;
        }
        router.push({ pathname: plan.pathname as never, params: plan.params as never });
      } catch (error) {
        console.error("[NOTIFICATIONS] Navigation failed:", error);
      }
    },
    [router]
  );

  const showPopupNotification = useCallback((notification: NotificationItem) => {
    if (popupTimeoutRef.current) {
      clearTimeout(popupTimeoutRef.current);
    }

    setPopupNotification(notification);
    popupTimeoutRef.current = setTimeout(() => {
      setPopupNotification(null);
    }, 4500);
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const notificationList = await notificationService.getNotifications(0, 50);

      const normalized = notificationList
        .map((item) => normalizeNotification(item))
        .filter((item) => item.id > 0)
        .sort(
          (left, right) =>
            new Date(right.created_at || 0).getTime() -
            new Date(left.created_at || 0).getTime()
        );

      setNotifications(normalized);
      setUnreadCount(
        normalized.filter((item) => (item.status || "").toLowerCase() === "unread").length
      );
    } catch (error) {
      console.error("[NOTIFICATIONS] Failed to refresh notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      const synced = await notificationService.markAsRead(notificationId);
      if (!synced) {
        console.log("[NOTIFICATIONS] markAsRead fallback to local state only", {
          notificationId,
        });
      }
    } catch (error) {
      console.error("[NOTIFICATIONS] markAsRead API failed:", error);
    } finally {
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, status: "read" } : item
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }, []);

  useEffect(() => {
    let disposed = false;

    if (isGuestRoute) {
      console.log("[NOTIFICATIONS] skip socket connect on guest route", { pathname });
      notificationService.disconnectSocket();
      socketRef.current = null;
      setLoading(false);
      return () => {
        disposed = true;
      };
    }

    const bootstrap = async () => {
      const [token, userDataRaw] = await Promise.all([
        AsyncStorage.getItem("authToken"),
        AsyncStorage.getItem("userData"),
      ]);

      if (!token || !userDataRaw) {
        console.log("[NOTIFICATIONS] skip socket connect: missing token or userData", {
          hasToken: !!token,
          hasUserData: !!userDataRaw,
          pathname,
        });
        setLoading(false);
        return;
      }

      await refreshNotifications();
      if (disposed) {
        return;
      }

      try {
        const userData = JSON.parse(userDataRaw);
        const userId = Number(userData?.user_id ?? userData?.id ?? userData?._id);

        if (!Number.isFinite(userId)) {
          console.warn("[NOTIFICATIONS] skip socket connect: invalid userId", {
            pathname,
            userData,
          });
          return;
        }

        const socket = notificationService.connectSocket();
        socketRef.current = socket;

        console.log("[NOTIFICATIONS] init socket", {
          pathname,
          userId,
          connected: socket.connected,
          active: socket.active,
        });

        socket.off("connect");
        socket.off("authenticated");
        socket.off("notification:created");
        socket.off("notification:read");
        socket.off("notification:archived");
        socket.off("notification:deleted");
        socket.off("notification:unread_count_updated");
        socket.off("connect_error");
        socket.off("error");
        socket.offAny();

        socket.on("connect", () => {
          console.log("[NOTIFICATIONS] socket connected", {
            socketId: socket.id,
            userId,
            pathname,
          });
          socket.emit("authenticate", { user_id: userId });
          console.log("[NOTIFICATIONS] authenticate emitted", { userId });
        });

        socket.on("authenticated", (payload: any) => {
          console.log("[NOTIFICATIONS] socket authenticated", {
            userId,
            payload,
          });
        });

        if (__DEV__) {
          socket.onAny((eventName, payload) => {
            console.log("[NOTIFICATIONS] socket event received", {
              eventName,
              payload,
            });
          });
        }

        socket.on("disconnect", (reason) => {
          console.log("[NOTIFICATIONS] socket disconnected", {
            reason,
            userId,
            pathname,
          });
        });

        socket.on("notification:created", (payload: any) => {
          console.log("[NOTIFICATIONS] notification:created received", { payload });
          const incoming = normalizeNotification(payload);
          if (!incoming.id) {
            console.warn("[NOTIFICATIONS] notification:created ignored due to missing id", {
              payload,
            });
            return;
          }

          let alreadyExists = false;
          setNotifications((prev) => {
            alreadyExists = prev.some((item) => item.id === incoming.id);
            const withoutDuplicate = prev.filter((item) => item.id !== incoming.id);
            return [incoming, ...withoutDuplicate];
          });

          if (!alreadyExists && (incoming.status || "").toLowerCase() === "unread") {
            setUnreadCount((prev) => prev + 1);
          }

          showPopupNotification(incoming);
          console.log("[NOTIFICATIONS] popup notification displayed", {
            notificationId: incoming.id,
            title: incoming.title,
          });
        });

        socket.on("notification:read", (payload: any) => {
          const notificationId = getNotificationId(payload);
          if (!Number.isFinite(notificationId)) {
            return;
          }

          let changedFromUnread = false;
          setNotifications((prev) =>
            prev.map((item) => {
              if (item.id === notificationId) {
                if ((item.status || "").toLowerCase() === "unread") {
                  changedFromUnread = true;
                }
                return { ...item, status: "read" };
              }

              return item;
            })
          );

          if (changedFromUnread) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        });

        socket.on("notification:archived", (payload: any) => {
          const notificationId = getNotificationId(payload);
          if (!Number.isFinite(notificationId)) {
            return;
          }

          setNotifications((prev) =>
            prev.map((item) =>
              item.id === notificationId ? { ...item, status: "archived" } : item
            )
          );
        });

        socket.on("notification:deleted", (payload: any) => {
          const notificationId = getNotificationId(payload);
          if (!Number.isFinite(notificationId)) {
            return;
          }

          setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
        });

        socket.on("notification:unread_count_updated", (payload: any) => {
          const nextUnread = Number(payload?.unread_count);
          if (!Number.isFinite(nextUnread)) {
            return;
          }

          setUnreadCount(nextUnread);
        });

        socket.on("connect_error", (error: any) => {
          console.error("[NOTIFICATIONS] socket connect_error:", {
            message: error?.message || "unknown",
            description: error?.description,
            context: error?.context,
          });
        });

        socket.on("error", (error: any) => {
          console.error("[NOTIFICATIONS] socket error:", error?.message || error);
        });
      } catch (error) {
        console.error("[NOTIFICATIONS] bootstrap socket failed:", error);
      }
    };

    bootstrap();

    return () => {
      disposed = true;
      // Keep socket alive while user navigates between authenticated screens.
      if (isGuestRoute) {
        console.log("[NOTIFICATIONS] cleanup socket", { pathname });
        notificationService.disconnectSocket();
        socketRef.current = null;
      }
      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current);
        popupTimeoutRef.current = null;
      }
    };
  }, [isGuestRoute, refreshNotifications, showPopupNotification]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      refreshNotifications,
      markAsRead,
    }),
    [notifications, unreadCount, loading, refreshNotifications, markAsRead]
  );

  return (
    <NotificationsContext.Provider value={value}>
      <View className="flex-1">
        {children}

        {popupNotification ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              handleNotificationPress(popupNotification);
              // Mark as read
              if ((popupNotification.status || "").toLowerCase() === "unread") {
                setNotifications((prev) =>
                  prev.map((item) =>
                    item.id === popupNotification.id
                      ? { ...item, status: "read" }
                      : item
                  )
                );
                setUnreadCount((prev) => Math.max(0, prev - 1));
                // Fire and forget: async mark as read on backend
                notificationService
                  .markAsRead(popupNotification.id)
                  .catch((err) =>
                    console.warn("[NOTIFICATIONS] markAsRead on tap failed:", err)
                  );
              }
              setPopupNotification(null);
            }}
            className="absolute z-50 bg-white rounded-2xl px-4 py-4 border border-[#dbe4f0]"
            style={{
              top: topInset + 16,
              left: 16,
              right: 16,
              elevation: 12,
              shadowColor: "#0f172a",
              shadowOpacity: 0.22,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 8 },
            }}
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[#2563eb] text-[11px] font-extrabold tracking-[0.8px]">
                THÔNG BÁO MỚI
              </Text>
              <TouchableOpacity
                onPress={() => setPopupNotification(null)}
                className="bg-[#0f172a] rounded-full px-3 py-1"
              >
                <Text className="text-white font-semibold text-[11px]">Đóng</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-[#0f172a] font-bold text-base" numberOfLines={2}>
              {popupNotification.title || "Thông báo mới"}
            </Text>

            {!!popupNotification.message && (
              <Text className="text-[#334155] text-sm mt-1 leading-5" numberOfLines={3}>
                {popupNotification.message}
              </Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications chỉ dùng bên trong NotificationsProvider");
  }

  return context;
};