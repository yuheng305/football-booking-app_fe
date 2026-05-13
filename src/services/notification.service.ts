import { io, Socket } from "socket.io-client";
import API_CONFIG from "../config/api.config";
import apiClient from "../utils/api.client";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  private socket: Socket | null = null;

  private isRetryableMarkReadError(error: unknown): boolean {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    return (
      message.includes("not found") ||
      message.includes("method not allowed") ||
      message.includes("404") ||
      message.includes("405")
    );
  }

  private unwrapData<T>(payload: T | ApiEnvelope<T>): T {
    const candidate = payload as ApiEnvelope<T>;
    if (candidate && typeof candidate === "object" && "data" in candidate) {
      return candidate.data;
    }

    return payload as T;
  }

  getSocketServerUrl(): string {
    const envUrl = process.env.EXPO_PUBLIC_SOCKET_URL?.trim();
    if (envUrl) {
      return envUrl.replace(/\/$/, "");
    }

    const baseUrl = API_CONFIG.BASE_URL.replace(/\/$/, "");
    return baseUrl.replace(/\/api\/v\d+$/i, "");
  }

  private getSocketPath(): string {
    const envPath = process.env.EXPO_PUBLIC_SOCKET_PATH?.trim();
    if (!envPath) {
      return "/socket.io";
    }

    return envPath.startsWith("/") ? envPath : `/${envPath}`;
  }

  private getSocketNamespace(): string {
    const envNamespace = process.env.EXPO_PUBLIC_SOCKET_NAMESPACE?.trim();
    if (!envNamespace) {
      return "";
    }

    return envNamespace.startsWith("/") ? envNamespace : `/${envNamespace}`;
  }

  connectSocket(): Socket {
    if (this.socket && (this.socket.connected || this.socket.active)) {
      return this.socket;
    }

    const serverUrl = this.getSocketServerUrl();
    const socketPath = this.getSocketPath();
    const socketNamespace = this.getSocketNamespace();
    const socketUrl = `${serverUrl}${socketNamespace}`;

    this.socket = io(socketUrl, {
      path: socketPath,
      transports: ["websocket"],
      upgrade: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 10000,
    });

    return this.socket;
  }

  disconnectSocket(): void {
    if (!this.socket) {
      return;
    }

    this.socket.disconnect();
    this.socket = null;
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

  async markAsRead(notificationId: number): Promise<boolean> {
    const markAsReadEndpoint = API_CONFIG.NOTIFICATION_ENDPOINTS.MARK_AS_READ.replace(
      ":id",
      String(notificationId)
    );

    const updateEndpoint = API_CONFIG.NOTIFICATION_ENDPOINTS.UPDATE.replace(
      ":id",
      String(notificationId)
    );

    try {
      await apiClient.put(markAsReadEndpoint, undefined, {
        headers: { accept: "application/json" },
      });
      return true;
    } catch (readError) {
      if (!this.isRetryableMarkReadError(readError)) {
        throw readError;
      }
    }

    // Backward-compatible fallback for environments still using generic update endpoint.
    await apiClient.patch(updateEndpoint, { status: "read" }, {
      headers: { accept: "application/json" },
    });
    return true;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
