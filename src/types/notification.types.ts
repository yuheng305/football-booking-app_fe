export type NotificationType = "booking" | "payment" | "club" | "system" | string;
export type NotificationStatus = "unread" | "read" | "archived" | "deleted" | string;

export interface NotificationItem {
  id: number;
  user_id?: number;
  type: NotificationType;
  title: string;
  message: string;
  entity_type?: string | null;
  entity_id?: number | null;
  data?: Record<string, any> | null;
  status: NotificationStatus;
  read_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationListData {
  items: NotificationItem[];
  total: number;
  offset: number;
  limit: number;
}

export interface ApiEnvelope<T> {
  data: T;
  api_version: string;
  errors: {
    msg: string[];
    code: null | string;
  };
}