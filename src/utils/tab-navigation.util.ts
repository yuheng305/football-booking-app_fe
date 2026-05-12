export type TabLayoutKind = "player" | "owner";

export const PLAYER_TAB_ROOTS = {
  home: "/(tabs)/home",
  stadium: "/(tabs)/stadium",
  tournament: "/(tabs)/tournament",
  account: "/(tabs)/account",
  payment: "/(tabs)/payment",
} as const;

export const OWNER_TAB_ROOTS = {
  home: "/(owners)/home",
  "(stadium)/clusterList": "/(owners)/(stadium)/clusterList",
  "(booking)/ownerBookingManagement": "/(owners)/(booking)/ownerBookingManagement",
  "(account)/account": "/(owners)/(account)/account",
} as const;

export type PlayerTabRouteName = keyof typeof PLAYER_TAB_ROOTS;
export type OwnerTabRouteName = keyof typeof OWNER_TAB_ROOTS;

type ResolveTabPressResetHrefParams = {
  layout: TabLayoutKind;
  routeName: string;
  pathname?: string | null;
};

export const normalizeRoutePath = (path?: string | null) => {
  const clean = String(path || "")
    .split("?")[0]
    .split("#")[0]
    .trim();

  if (!clean) return "/";

  const withoutGroups = clean
    .split("/")
    .filter((segment) => segment && !(segment.startsWith("(") && segment.endsWith(")")))
    .join("/");

  const normalized = `/${withoutGroups}`.replace(/\/+/g, "/");
  return normalized.length > 1 ? normalized.replace(/\/$/, "") : normalized;
};

export const getTabRootHref = (layout: TabLayoutKind, routeName: string) => {
  const roots: Record<string, string> =
    layout === "player" ? PLAYER_TAB_ROOTS : OWNER_TAB_ROOTS;
  return roots[routeName] || null;
};

export const resolveTabPressResetHref = ({
  layout,
  routeName,
  pathname,
}: ResolveTabPressResetHrefParams) => {
  const rootHref = getTabRootHref(layout, routeName);
  if (!rootHref) return null;

  if (!pathname) {
    return rootHref;
  }

  return normalizeRoutePath(pathname) === normalizeRoutePath(rootHref) ? null : rootHref;
};
