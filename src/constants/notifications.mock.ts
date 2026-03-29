export type NotificationType = "booking" | "payment" | "club" | "system";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: NotificationType;
  isRead: boolean;
};

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n-001",
    title: "Đặt sân thành công",
    message: "Bạn đã đặt sân Mini A vào 19:00 - 20:30 ngày 16/03/2026.",
    time: "2 phút trước",
    type: "booking",
    isRead: false,
  },
  {
    id: "n-002",
    title: "Thanh toán đã xác nhận",
    message: "Giao dịch #PAY-34921 đã được xác nhận thành công.",
    time: "15 phút trước",
    type: "payment",
    isRead: false,
  },
  {
    id: "n-003",
    title: "Mời tham gia CLB",
    message: "CLB FC HCMUT đã gửi lời mời tham gia đội bóng.",
    time: "1 giờ trước",
    type: "club",
    isRead: true,
  },
  {
    id: "n-004",
    title: "Cập nhật hệ thống",
    message: "Ứng dụng vừa được cập nhật để cải thiện trải nghiệm đặt sân.",
    time: "Hôm qua",
    type: "system",
    isRead: true,
  },
];

export const MOCK_UNREAD_NOTIFICATION_COUNT = MOCK_NOTIFICATIONS.filter(
  (item) => !item.isRead
).length;
