/**
 * Cấu hình chung cho bản đồ MapLibre.
 * Tile lấy từ OpenFreeMap (free, không cần API key, không giới hạn lượt tải).
 */

/** Style vector của OpenFreeMap — không cần token. */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

/** Tâm mặc định khi chưa có tọa độ — [longitude, latitude], lấy TP.HCM. */
export const DEFAULT_CENTER: [number, number] = [106.700981, 10.77653];

/** Mức zoom mặc định. */
export const ZOOM_WITH_COORDS = 16;
export const ZOOM_DEFAULT = 11;
