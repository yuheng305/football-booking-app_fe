/**
 * API Configuration
 * Dễ dàng thay đổi endpoint tùy theo environment
 */

/**
 * API Configuration
 * Read from Expo public env / app.json extra.API_BASE_URL or fallback to default
 */

import Constants from 'expo-constants';

const DEFAULT_API_BASE_URL = "https://datn-be-9zkr.onrender.com/api/v1";
const GOPITCH_API_BASE_URL = "https://gopitch.site/api/v1";

const splitBaseUrls = (value?: string) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const uniqueBaseUrls = (urls: string[]) => {
  const seen = new Set<string>();
  return urls.filter((url) => {
    const normalized = url.replace(/\/+$/, "");
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};

const getApiBaseUrl = () => {
  const publicEnvUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  const extraApiUrl = Constants.expoConfig?.extra?.API_BASE_URL?.trim();
  const extraLegacyEnvUrl = Constants.expoConfig?.extra?.EXPO_API_BASE_URL?.trim();

  return publicEnvUrl || extraApiUrl || extraLegacyEnvUrl || DEFAULT_API_BASE_URL;
};

const API_BASE_URL = getApiBaseUrl();

const getApiFallbackBaseUrls = () => {
  const publicEnvUrls = splitBaseUrls(process.env.EXPO_PUBLIC_API_FALLBACK_BASE_URLS);
  const extraFallbackUrls = splitBaseUrls(
    Constants.expoConfig?.extra?.API_FALLBACK_BASE_URLS
  );

  return uniqueBaseUrls([
    ...publicEnvUrls,
    ...extraFallbackUrls,
    GOPITCH_API_BASE_URL,
    DEFAULT_API_BASE_URL,
  ]).filter((url) => url.replace(/\/+$/, "") !== API_BASE_URL.replace(/\/+$/, ""));
};

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  FALLBACK_BASE_URLS: getApiFallbackBaseUrls(),
  LEGACY_BASE_URL: API_BASE_URL,
  AUTH_ENDPOINTS: {
    LOGIN: "/auth/login",
    SIGNUP: "/auth/signup",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
    ME: "/auth/me",
    UPDATE_ME: "/users/me",
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
    GET_ORGANIZER_PAYMENTS: "/payments/organizer/:organizerId",
    GET_OWNER_PAYMENTS: "/payments/owner",
    CREATE_PAYMENT: "/payments",
    CREATE_ZALOPAY_ORDER: "/payments/zalopay/:bookingId",
    CREATE_TOURNAMENT_ZALOPAY_ORDER: "/payments/zalopay/tournament/:tournamentId",
    GET_OWNER_REVENUE: "/payments/owner/revenue",
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
  TOURNAMENT_ENDPOINTS: {
    CREATE: "/tournaments",
    CREATE_LEVEL_2: "/tournaments/v2",
    DETAIL: "/tournaments/:id",
    /** Danh sách toàn bộ trận giải level 2 (FE lọc theo round_id / round_number). */
    LEVEL_2_ALL_MATCHES: "/tournaments/:id/matches",
    /** Cập nhật extra_data (vd. team_win) cho một trận — không cần roundId trong path. */
    LEVEL_2_PATCH_MATCH: "/tournaments/:id/matches/:matchId",
    /** @deprecated BE không còn endpoint theo vòng — giữ key để khỏi gãy tham chiếu cũ. */
    LEVEL_2_ROUND_MATCHES: "/tournaments/:id/rounds/:roundId/matches",
    LEVEL_2_UPDATE_MATCH: "/tournaments/:id/rounds/:roundId/matches/:matchId",
    LEVEL_2_AVAILABLE_SLOTS: "/tournaments/:id/rounds/:roundId/available-slots",
    LEVEL_2_SCHEDULE_ROUND: "/tournaments/:id/rounds/:roundId/schedule",
    /** Đổi lịch một booking thuộc giải level 2 (BTC). */
    LEVEL_2_BOOKING_RESCHEDULE: "/tournaments/:id/bookings/:bookingId/reschedule",
    OWNER_CONFIRM: "/tournaments/:id?action=owner-confirm",
    OWNER_REJECT: "/tournaments/:id?action=owner-reject",
    OWNER_LIST: "/tournaments/owner",
    ORGANIZER_LIST: "/tournaments/organizer/:organizerId",
  },
  CHAT_ENDPOINTS: {
    LIST_CONVERSATIONS: "/chats/conversations",
    SEND_MESSAGE: "/chats/messages",
    LIST_MESSAGES: "/chats/messages/:receiverId",
  },
  TIMEOUT: 30000, // 30 seconds
};

export default API_CONFIG;
