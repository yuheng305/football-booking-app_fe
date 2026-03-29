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
  LEGACY_BASE_URL: API_BASE_URL,
  AUTH_ENDPOINTS: {
    LOGIN: "/auth/login",
    SIGNUP: "/auth/signup",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
    ME: "/auth/me",
    UPDATE_PASSWORD: "/auth/update_password",
    FORGOT_PASSWORD: "/auth/forgot_password",
    RESEND_VERIFICATION_EMAIL: "/auth/resend_verified_email",
  },
  CLUSTER_ENDPOINTS: {
    LIST: "/clusters/list",
    SEARCH: "/clusters/search",
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
    UPDATE_CLUB: "/clubs/:clubId",
    DELETE_CLUB: "/clubs/:clubId",
    GET_CLUB: "/clubs/:clubId",
  },
  BOOKING_ENDPOINTS: {
    GET_PLAYER_BOOKINGS: "/bookings/player/:playerId",
    GET_BOOKING: "/bookings/:id",
    CREATE_BOOKING: "/bookings",
    UPDATE_BOOKING: "/bookings/:id",
    CANCEL_BOOKING: "/bookings/:id/cancel",
    GET_OWNER_BOOKINGS: "/bookings/owner/history",
  },
  PAYMENT_ENDPOINTS: {
    GET_PLAYER_PAYMENTS: "/payments/player/:playerId",
    CREATE_PAYMENT: "/payments",
    CREATE_ZALOPAY_ORDER: "/payments/zalopay/:bookingId",
  },
  NOTIFICATION_ENDPOINTS: {
    LIST: "/notifications",
    MARK_AS_READ: "/notifications/:id/read",
    UPDATE: "/notifications/:id",
  },
  FIELD_ENDPOINTS: {
    GET_BY_CLUSTER: "/fields/cluster/:clusterId",
    GET_AVAILABILITY: "/fields/cluster/:clusterId/availability",
    GET_FIELD_AVAILABILITY_BY_ID: "/fields/:fieldId/availability",
    GET_OWNER_FIELDS: "/fields/owner/:ownerId",
  },
  TIMEOUT: 30000, // 30 seconds
};

export default API_CONFIG;
