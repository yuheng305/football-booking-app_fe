import type { NotificationItem } from "@/src/types/notification.types";
import { resolveProviderNotificationNavigation } from "@/src/utils/notification-navigation.util";

const base = (over: Partial<NotificationItem>): NotificationItem => ({
  id: 1,
  type: "system",
  title: "",
  message: "",
  status: "unread",
  ...over,
});

const playerCtx = { appRole: "player" as const, rawRole: "player" };
const ownerCtx = { appRole: "owner" as const, rawRole: "owner" };

describe("resolveProviderNotificationNavigation (popup / socket — khớp NotificationsProvider)", () => {
  it("noop khi thiếu entity", () => {
    const plan = resolveProviderNotificationNavigation(
      base({ entity_type: null, entity_id: 1 }),
      playerCtx
    );
    expect(plan).toEqual({ kind: "noop", reason: "missing_target" });
  });

  it("cluster → clusterDetail", () => {
    const plan = resolveProviderNotificationNavigation(
      base({ entity_type: "cluster", entity_id: 9 }),
      playerCtx
    );
    expect(plan).toMatchObject({
      kind: "push",
      pathname: "/(owners)/(stadium)/clusterDetail",
      params: { id: "9" },
    });
  });

  it("field → stadiumManagement", () => {
    const plan = resolveProviderNotificationNavigation(
      base({ entity_type: "field", entity_id: 3 }),
      playerCtx
    );
    expect(plan).toMatchObject({
      kind: "push",
      pathname: "/(owners)/(stadium)/stadiumManagement",
      params: { fieldId: "3" },
    });
  });

  it("booking → owner bookingDetail (luồng provider hiện tại)", () => {
    const plan = resolveProviderNotificationNavigation(
      base({ entity_type: "booking", entity_id: 42 }),
      playerCtx
    );
    expect(plan).toMatchObject({
      kind: "push",
      pathname: "/(owners)/(booking)/bookingDetail",
      params: { id: "42" },
    });
  });

  it("payment + xác nhận + bookingId hợp lệ → set currentBookingId + booking-detail", () => {
    const plan = resolveProviderNotificationNavigation(
      base({
        entity_type: "payment",
        entity_id: 100,
        type: "payment_confirmed",
        data: { booking_id: 55 },
      }),
      playerCtx
    );
    expect(plan).toEqual({
      kind: "setCurrentBookingIdAndPush",
      bookingId: 55,
      pathname: "/(tabs)/stadium/booking-detail",
    });
  });

  it("payment + xác nhận nhưng không parse được booking → history", () => {
    const plan = resolveProviderNotificationNavigation(
      base({
        entity_type: "payment",
        entity_id: -1,
        type: "payment_confirmed",
        message: "test",
      }),
      playerCtx
    );
    expect(plan).toEqual({ kind: "pushHref", href: "/(tabs)/(users)/history" });
  });

  it("isPayment (generic) + owner → ownerBookingManagement", () => {
    const plan = resolveProviderNotificationNavigation(
      base({
        entity_type: "invoice",
        entity_id: 1,
        type: "payment_pending",
        message: "thanh toán",
      }),
      ownerCtx
    );
    expect(plan).toEqual({
      kind: "pushHref",
      href: "/(owners)/(booking)/ownerBookingManagement",
    });
  });

  it("isPayment (generic) + player → tab payment", () => {
    const plan = resolveProviderNotificationNavigation(
      base({
        entity_type: "invoice",
        entity_id: 1,
        type: "payment",
      }),
      playerCtx
    );
    expect(plan).toEqual({ kind: "pushHref", href: "/(tabs)/payment" });
  });

  it("tournament + field_owner → màn owner + source + paid khi payment_confirmed", () => {
    const plan = resolveProviderNotificationNavigation(
      base({
        entity_type: "tournament",
        entity_id: 7,
        type: "payment_confirmed",
      }),
      { appRole: "owner", rawRole: "field_owner" }
    );
    expect(plan).toMatchObject({
      kind: "push",
      pathname: "/(owners)/(booking)/tournament-detail",
      params: { id: "7", source: "owner", paymentStatus: "paid" },
    });
  });

  it("tournament + player → tabs tournament-detail, không paid", () => {
    const plan = resolveProviderNotificationNavigation(
      base({
        entity_type: "tournament",
        entity_id: 7,
        type: "tournament_update",
      }),
      { appRole: "player", rawRole: "player" }
    );
    expect(plan).toMatchObject({
      kind: "push",
      pathname: "/(tabs)/tournament/detail",
      params: { id: "7" },
    });
  });

  it("chat → /chat với receiverId", () => {
    const plan = resolveProviderNotificationNavigation(
      base({ entity_type: "chat", entity_id: 99 }),
      playerCtx
    );
    expect(plan).toMatchObject({
      kind: "push",
      pathname: "/chat",
      params: { receiverId: "99" },
    });
  });

  it("entity_type không hỗ trợ → unknown_entity", () => {
    const plan = resolveProviderNotificationNavigation(
      base({ entity_type: "unknownThing", entity_id: 1 }),
      playerCtx
    );
    expect(plan).toEqual({ kind: "noop", reason: "unknown_entity" });
  });

  it("entity tournament + type có chữ payment vẫn vào chi tiết giải (không bị isPayment hút sang tab thanh toán)", () => {
    const plan = resolveProviderNotificationNavigation(
      base({
        entity_type: "tournament",
        entity_id: 7,
        type: "payment_reminder",
        message: "thanh toán giải",
      }),
      playerCtx
    );
    expect(plan).toMatchObject({
      kind: "push",
      pathname: "/(tabs)/tournament/detail",
      params: { id: "7" },
    });
  });
});
