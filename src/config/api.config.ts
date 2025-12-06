/**
 * API Configuration
 * Dễ dàng thay đổi endpoint tùy theo environment
 */

// API Base URL - Switch between local and production
const API_BASE_URL = __DEV__ 
  ? "https://datn-be-9zkr.onrender.com/api/v1" // Production for now
  : "https://datn-be-9zkr.onrender.com/api/v1";

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  AUTH_ENDPOINTS: {
    LOGIN: "/auth/login",
    SIGNUP: "/auth/signup",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
    UPDATE_PASSWORD: "/auth/update_password",
    FORGOT_PASSWORD: "/auth/forgot_password",
    RESEND_VERIFICATION_EMAIL: "/auth/resend_verified_email",
  },
  CLUSTER_ENDPOINTS: {
    LIST: "/clusters/list",
    CREATE: "/clusters",
    GET: "/clusters/:id",
    UPDATE: "/clusters/:id",
    DELETE: "/clusters/:id",
  },
  CLUB_ENDPOINTS: {
    CREATE: "/clubs",
    GET_PLAYER_CLUBS: "/players/:playerId/clubs",
    GET_CLUB_MEMBERS: "/clubs/:clubId/members",
    JOIN_CLUB: "/clubs/:clubId/members",
    LEAVE_CLUB: "/clubs/:clubId/members/:playerId",
  },
  TIMEOUT: 30000, // 30 seconds
};

export default API_CONFIG;
