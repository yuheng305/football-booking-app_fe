import { io, Socket } from "socket.io-client";
import API_CONFIG from "../config/api.config";
import apiClient from "../utils/api.client";
import {
  ApiEnvelope,
  NotificationItem,
  NotificationListData,
} from "../types/notification.types";

type NotificationListResponse =
  | NotificationListData
  | { items: NotificationItem[] }
  | { notifications: NotificationItem[] }
  | NotificationItem[];

class NotificationService {
  private unwrapData<T>(payload: T | ApiEnvelope<T>): T {
    const candidate = payload as ApiEnvelope<T>;
    if (candidate && typeof candidate === "object" && "data" in candidate) {
      return candidate.data;
    }

    return payload as T;
  }

  getSocketServerUrl(): string {
    const baseUrl = API_CONFIG.BASE_URL;
    return baseUrl.replace(/\/api\/v\d+$/i, "");
  }

  connectSocket(): Socket {
    const serverUrl = this.getSocketServerUrl();

    return io(serverUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 10000,
    });
  }

  async getNotifications(offset = 0, limit = 30): Promise<NotificationItem[]> {
    const response = await apiClient.get<
      NotificationListResponse | ApiEnvelope<NotificationListResponse>
    >(API_CONFIG.NOTIFICATION_ENDPOINTS.LIST, {
      params: { offset, limit },
    });

    const data = this.unwrapData<NotificationListResponse>(response);

    if (Array.isArray(data)) {
      return data;
    }

    if ("items" in data) {
      return data.items || [];
    }

    if ("notifications" in data) {
      return data.notifications || [];
    }

    return [];
  }

  async markAsRead(notificationId: number): Promise<void> {
    const markAsReadEndpoint = API_CONFIG.NOTIFICATION_ENDPOINTS.MARK_AS_READ.replace(
      ":id",
      String(notificationId)
    );

    const updateEndpoint = API_CONFIG.NOTIFICATION_ENDPOINTS.UPDATE.replace(
      ":id",
      String(notificationId)
    );

    try {
      await apiClient.patch(markAsReadEndpoint, {});
      return;
    } catch (error) {
      console.log("[NOTIFICATIONS] MARK_AS_READ route failed, fallback to UPDATE", {
        notificationId,
      });
    }

    await apiClient.patch(updateEndpoint, { status: "read" });
  }
}

export const notificationService = new NotificationService();
export default notificationService;