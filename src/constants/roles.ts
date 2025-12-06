/**
 * User Roles and Routes
 */

export const USER_ROLES = {
  ADMIN: "admin",
  PLAYER: "player",
  OWNER: "owner",
} as const;

/**
 * Navigation routes based on user role
 */
export const ROLE_ROUTES: Record<string, "/(tabs)/home" | "/(owners)/home"> = {
  [USER_ROLES.ADMIN]: "/(tabs)/home",
  [USER_ROLES.PLAYER]: "/(tabs)/home",
  [USER_ROLES.OWNER]: "/(owners)/home",
};
