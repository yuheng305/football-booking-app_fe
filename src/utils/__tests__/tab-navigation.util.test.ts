import {
  normalizeRoutePath,
  resolveTabPressResetHref,
} from "@/src/utils/tab-navigation.util";

describe("tab navigation reset", () => {
  it("normalizes Expo Router group segments before comparing paths", () => {
    expect(normalizeRoutePath("/(tabs)/stadium/booking-detail")).toBe(
      "/stadium/booking-detail"
    );
    expect(normalizeRoutePath("/(owners)/(stadium)/clusterList")).toBe("/clusterList");
    expect(normalizeRoutePath("/(tabs)/payment?from=notification")).toBe("/payment");
  });

  it("resets player stadium tab from booking detail to the stadium root", () => {
    expect(
      resolveTabPressResetHref({
        layout: "player",
        routeName: "stadium",
        pathname: "/stadium/booking-detail",
      })
    ).toBe("/(tabs)/stadium");
  });

  it("does not reset when player is already on the target tab root", () => {
    expect(
      resolveTabPressResetHref({
        layout: "player",
        routeName: "stadium",
        pathname: "/(tabs)/stadium",
      })
    ).toBeNull();
  });

  it("resets player payment tab from another nested flow to payment root", () => {
    expect(
      resolveTabPressResetHref({
        layout: "player",
        routeName: "payment",
        pathname: "/stadium/booking-success",
      })
    ).toBe("/(tabs)/payment");
  });

  it("resets owner stadium tab from cluster detail to cluster list", () => {
    expect(
      resolveTabPressResetHref({
        layout: "owner",
        routeName: "(stadium)/clusterList",
        pathname: "/clusterDetail",
      })
    ).toBe("/(owners)/(stadium)/clusterList");
  });

  it("resets owner management tab from booking detail to management root", () => {
    expect(
      resolveTabPressResetHref({
        layout: "owner",
        routeName: "(booking)/ownerBookingManagement",
        pathname: "/bookingDetail",
      })
    ).toBe("/(owners)/(booking)/ownerBookingManagement");
  });

  it("ignores hidden or unmapped routes", () => {
    expect(
      resolveTabPressResetHref({
        layout: "player",
        routeName: "stadium/booking-detail",
        pathname: "/stadium/booking-detail",
      })
    ).toBeNull();
  });
});
