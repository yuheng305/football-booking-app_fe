/**
 * Deprecated Header Components
 * These are kept for backward compatibility only
 * New code should use HeaderUser, HeaderOwner, or HeaderWithBack directly
 */

import HeaderUser from "./HeaderUser";
import HeaderOwner from "./HeaderOwner";

/**
 * @deprecated Use HeaderUser with title/subtitle props instead
 */
export const HeaderWithLocation = HeaderUser;

/**
 * @deprecated Use HeaderOwner with title/subtitle props instead
 */
export const HeaderOwnerWithLocation = HeaderOwner;
