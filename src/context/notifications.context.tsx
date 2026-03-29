import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Socket } from "socket.io-client";
import notificationService from "../services/notification.service";
import type { NotificationItem } from "../types/notification.types";

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
  return {
    id: Number(raw?.id ?? 0),
    type: raw?.type ?? "system",
    title: raw?.title ?? "Thông báo",
    message: raw?.message ?? "",
    entity_type: raw?.entity_type ?? null,
    entity_id: raw?.entity_id != null ? Number(raw.entity_id) : null,
    status: raw?.status ?? "unread",
    created_at: raw?.created_at,
    updated_at: raw?.updated_at,
  };
}

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

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
      await notificationService.markAsRead(notificationId);
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

    const bootstrap = async () => {
      const [token, userDataRaw] = await Promise.all([
        AsyncStorage.getItem("authToken"),
        AsyncStorage.getItem("userData"),
      ]);

      if (!token || !userDataRaw) {
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
          return;
        }

        const socket = notificationService.connectSocket();
        socketRef.current = socket;

        socket.on("connect", () => {
          socket.emit("authenticate", { user_id: userId });
        });

        socket.on("authenticated", () => {
          console.log("[NOTIFICATIONS] socket authenticated");
        });

        socket.on("notification:created", (payload: any) => {
          const incoming = normalizeNotification(payload);
          if (!incoming.id) {
            return;
          }

          setNotifications((prev) => {
            const withoutDuplicate = prev.filter((item) => item.id !== incoming.id);
            return [incoming, ...withoutDuplicate];
          });
          if ((incoming.status || "").toLowerCase() === "unread") {
            setUnreadCount((prev) => prev + 1);
          }
        });

        socket.on("notification:read", (payload: any) => {
          const notificationId = Number(payload?.id ?? payload?.notification_id);
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
          const notificationId = Number(payload?.id ?? payload?.notification_id);
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
          const notificationId = Number(payload?.id ?? payload?.notification_id);
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
          console.error("[NOTIFICATIONS] socket connect_error:", error?.message || error);
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
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [refreshNotifications]);

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
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }

  return context;
};