/**
 * Chuẩn hóa tên môn thể thao (BE thường trả slug tiếng Anh) → nhãn tiếng Việt cho UI.
 */

const SPORT_TYPE_VI_MAP: Record<string, string> = {
  football: "Bóng đá",
  soccer: "Bóng đá",
  "bóng đá": "Bóng đá",
  badminton: "Cầu lông",
  "cầu lông": "Cầu lông",
  tennis: "Quần vợt",
  "quần vợt": "Quần vợt",
  pickleball: "Pickleball",
  basketball: "Bóng rổ",
  "bóng rổ": "Bóng rổ",
};

/** ID phổ biến từ BE (cụm/sân): 1 bóng đá, 2 cầu lông, 3 pickleball, 4 tennis, 5 bóng rổ */
export const SPORT_TYPE_ID_LABEL_VI: Record<number, string> = {
  1: "Bóng đá",
  2: "Cầu lông",
  3: "Pickleball",
  4: "Quần vợt",
  5: "Bóng rổ",
};

/** Dùng chung form chọn môn (chủ sân tạo cụm / sân). */
export const SPORT_TYPE_PICKER_OPTIONS: { id: number; label: string }[] = [
  { id: 1, label: "Bóng đá" },
  { id: 2, label: "Cầu lông" },
  { id: 3, label: "Pickleball" },
  { id: 4, label: "Quần vợt" },
  { id: 5, label: "Bóng rổ" },
];

export const toVietnameseSportType = (value?: string | null): string => {
  if (!value) {
    return "Chưa xác định";
  }

  const raw = value.trim();
  const normalized = raw.toLowerCase();
  if (SPORT_TYPE_VI_MAP[normalized]) {
    return SPORT_TYPE_VI_MAP[normalized];
  }

  const slug = normalized.replace(/\s+/g, "_");
  if (SPORT_TYPE_VI_MAP[slug]) {
    return SPORT_TYPE_VI_MAP[slug];
  }

  const first = normalized.split(/[\s_/,-]+/).filter(Boolean)[0];
  if (first && SPORT_TYPE_VI_MAP[first]) {
    return SPORT_TYPE_VI_MAP[first];
  }

  return raw;
};

/** Có tên từ API thì Việt hóa slug; không có thì fallback theo id. */
export const formatSportDisplay = (
  name?: string | null,
  sportTypeId?: number | null
): string => {
  const trimmed = name?.trim();
  if (trimmed) {
    return toVietnameseSportType(trimmed);
  }
  if (typeof sportTypeId === "number" && sportTypeId > 0) {
    return SPORT_TYPE_ID_LABEL_VI[sportTypeId] ?? `Môn #${sportTypeId}`;
  }
  return "Chưa xác định";
};

export default toVietnameseSportType;
