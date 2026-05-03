import type { NotificationItem } from "@/src/types/notification.types";
import { isFieldOwnerRole } from "@/src/utils/role.util";

/**
 * Kết quả điều hướng từ thông báo (bong bóng / handler trong provider).
 * Tách ra để unit test — hành vi phải khớp `handleNotificationPress` trong notifications.context.
 */
export type ProviderNotificationNavPlan =
  | { kind: "push"; pathname: string; params?: Record<string, string> }
  | {
      kind: "setCurrentBookingIdAndPush";
      bookingId: number;
      pathname: string;
    }
  | { kind: "pushHref"; href: string }
  | { kind: "noop"; reason: "missing_target" | "unknown_entity" };

export type ProviderNavContext = {
  appRole: "player" | "owner";
  /** Từ getRawUserRoleFromStorage — dùng phân nhánh giải đấu owner vs user. */
  rawRole: string | null;
};

function paymentConfirmedFlags(notification: NotificationItem) {
  const type = String(notification.type || "").toLowerCase();
  const text = `${notification.title || ""} ${notification.message || ""}`.toLowerCase();
  const isPaymentConfirmed =
    type === "payment_confirmed" ||
    text.includes("xác nhận thanh toán") ||
    text.includes("đã được xác nhận");
  const isPayment =
    type.includes("payment") ||
    (notification.entity_type || "").toLowerCase().includes("payment") ||
    text.includes("thanh toán") ||
    text.includes("payment");
  return { isPaymentConfirmed, isPayment, type, text };
}

/**
 * Logic điều hướng cho popup/socket — `NotificationsProvider` gọi hàm này rồi `router.push`.
 * Thứ tự ưu tiên `tournament` trước `isPayment` để type có "payment" không đẩy nhầm khỏi chi tiết giải.
 */
export function resolveProviderNotificationNavigation(
  notification: NotificationItem,
  ctx: ProviderNavContext
): ProviderNotificationNavPlan {
  if (!notification.entity_type || !notification.entity_id) {
    return { kind: "noop", reason: "missing_target" };
  }

  const entityType = notification.entity_type.toLowerCase();
  const entityId = notification.entity_id;
  const data = notification.data || {};
  const { isPaymentConfirmed, isPayment, type, text } = paymentConfirmedFlags(notification);

  if (entityType === "cluster") {
    return {
      kind: "push",
      pathname: "/(owners)/(stadium)/clusterDetail",
      params: { id: String(entityId) },
    };
  }

  if (entityType === "field") {
    return {
      kind: "push",
      pathname: "/(owners)/(stadium)/stadiumManagement",
      params: { fieldId: String(entityId) },
    };
  }

  if (entityType === "booking") {
    return {
      kind: "push",
      pathname: "/(owners)/(booking)/bookingDetail",
      params: { id: String(entityId) },
    };
  }

  if (entityType === "payment" && isPaymentConfirmed) {
    const bookingId = Number(data.booking_id ?? data.bookingId ?? entityId);
    if (Number.isFinite(bookingId) && bookingId > 0) {
      return {
        kind: "setCurrentBookingIdAndPush",
        bookingId,
        pathname: "/(tabs)/stadium/booking-detail",
      };
    }
    return { kind: "pushHref", href: "/(tabs)/(users)/history" };
  }

  /** Trước `isPayment`: tránh type có chữ "payment" (vd. payment_confirmed) đẩy nhầm sang tab thanh toán thay vì chi tiết giải. */
  if (entityType === "tournament") {
    const paymentHint =
      type === "payment_confirmed" ||
      (type.includes("payment") &&
        (text.includes("thanh toán") || text.includes("payment")) &&
        (text.includes("thành công") || text.includes("success")));
    const ownerParams: Record<string, string> = {
      id: String(entityId),
      source: "owner",
    };
    const playerParams: Record<string, string> = { id: String(entityId) };
    if (paymentHint) {
      ownerParams.paymentStatus = "paid";
      playerParams.paymentStatus = "paid";
    }

    if (isFieldOwnerRole(ctx.rawRole)) {
      return {
        kind: "push",
        pathname: "/(owners)/(booking)/tournament-detail",
        params: ownerParams,
      };
    }
    return {
      kind: "push",
      pathname: "/(tabs)/tournament/detail",
      params: playerParams,
    };
  }

  if (isPayment) {
    if (ctx.appRole === "owner") {
      return { kind: "pushHref", href: "/(owners)/(booking)/ownerBookingManagement" };
    }
    return { kind: "pushHref", href: "/(tabs)/payment" };
  }

  if (entityType === "chat" || entityType === "message") {
    return {
      kind: "push",
      pathname: "/chat",
      params: { receiverId: String(entityId) },
    };
  }

  return { kind: "noop", reason: "unknown_entity" };
}
