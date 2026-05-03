/** Parse extra_data JSON và lấy team_win (chuỗi — thường là tên đội thắng; có thể là "A"/"B" dữ liệu cũ). */

export function extractTeamWinString(extra_data: unknown): string | null {
  if (extra_data == null) return null;
  let obj: Record<string, unknown> | null = null;
  if (typeof extra_data === "string") {
    try {
      const parsed = JSON.parse(extra_data) as unknown;
      if (parsed && typeof parsed === "object") obj = parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (typeof extra_data === "object") {
    obj = extra_data as Record<string, unknown>;
  }
  if (!obj) return null;
  const tw = obj.team_win;
  if (tw == null) return null;
  const s = typeof tw === "string" ? tw.trim() : String(tw).trim();
  return s || null;
}

function commaTokens(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * Xác định ô thắng (trên/dưới) từ team_win:
 * - Ưu tiên khớp đúng / không phân biệt hoa thường với team_a_name / team_b_name
 * - Sau đó khớp token trong chuỗi ghép ("B,A" vs "B")
 * - Cuối cùng legacy: team_win đúng một ký tự "A" / "B" (slot cũ)
 */
export function resolveWinnerSideFromExtra(
  extra_data: unknown,
  teamAName?: string | null,
  teamBName?: string | null
): "top" | "bottom" | null {
  const w = extractTeamWinString(extra_data);
  if (!w) return null;

  const a = teamAName?.trim() ?? "";
  const b = teamBName?.trim() ?? "";

  if (a && w.localeCompare(a, undefined, { sensitivity: "accent" }) === 0) return "top";
  if (b && w.localeCompare(b, undefined, { sensitivity: "accent" }) === 0) return "bottom";

  const wl = w.toLowerCase();
  if (a && wl === a.toLowerCase()) return "top";
  if (b && wl === b.toLowerCase()) return "bottom";

  for (const t of commaTokens(a)) {
    if (wl === t.toLowerCase()) return "top";
  }
  for (const t of commaTokens(b)) {
    if (wl === t.toLowerCase()) return "bottom";
  }

  if (w === "A" || w === "a") return "top";
  if (w === "B" || w === "b") return "bottom";

  return null;
}

const LEGACY_SLOT = /^[AaBb]$/;

/** Chữ hiển thị sau ✓ / dòng Thắng: — ưu tiên đúng giá trị team_win nếu là tên đội. */
export function formatWinnerBadgeLabel(
  extra_data: unknown,
  teamAName?: string | null,
  teamBName?: string | null
): string | null {
  const raw = extractTeamWinString(extra_data);
  if (!raw) return null;

  if (!LEGACY_SLOT.test(raw)) return raw;

  const side = resolveWinnerSideFromExtra(extra_data, teamAName, teamBName);
  if (side === "top") return teamAName?.trim() || raw;
  if (side === "bottom") return teamBName?.trim() || raw;
  return raw;
}
