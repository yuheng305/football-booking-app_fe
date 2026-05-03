import {
  extractTeamWinString,
  resolveWinnerSideFromExtra,
} from "@/src/utils/tournament-match.util";

/** Token đội từ chuỗi API (có thể "A" hoặc "B,A"). */
export function bracketTeamTokens(teamA?: string | null, teamB?: string | null): Set<string> {
  const split = (v?: string | null) =>
    !v ? [] : v.split(",").map((s) => s.trim()).filter(Boolean);
  return new Set([...split(teamA), ...split(teamB)]);
}

export type BracketResolveMatch = {
  id: number;
  round_number: number;
  team_a_name: string | null;
  team_b_name: string | null;
  extra_data?: unknown;
};

/** Trận vòng (round_number - 1) có token trùng với trận hiện tại — cùng heuristic với sơ đồ nhánh. */
export function getBracketFeederMatches(
  match: BracketResolveMatch,
  allMatches: readonly BracketResolveMatch[]
): BracketResolveMatch[] {
  const rn = Number(match.round_number);
  const prevRound = rn - 1;
  if (prevRound < 1) return [];

  const parentTokens = bracketTeamTokens(match.team_a_name, match.team_b_name);
  const prevMatches = allMatches.filter((m) => Number(m.round_number) === prevRound);

  return prevMatches
    .filter((prev) => {
      const pt = bracketTeamTokens(prev.team_a_name, prev.team_b_name);
      let overlap = 0;
      pt.forEach((t) => {
        if (parentTokens.has(t)) overlap += 1;
      });
      return overlap > 0;
    })
    .sort((a, b) => a.id - b.id);
}

/**
 * Tên đội được đưa vào trận tiếp theo: đọc extra_data.team_win ở trận vòng trước.
 * Trận bye (không có đội B): coi đội A là vào vòng sau (chưa cần PATCH).
 */
export function winnerLabelFromFeeder(feeder: BracketResolveMatch | undefined | null): string | null {
  if (!feeder) return null;
  const raw = extractTeamWinString(feeder.extra_data);
  if (raw) {
    const legacy = raw === "A" || raw === "a" || raw === "B" || raw === "b";
    if (!legacy) return raw.trim();
    const side = resolveWinnerSideFromExtra(feeder.extra_data, feeder.team_a_name, feeder.team_b_name);
    if (side === "top") return feeder.team_a_name?.trim() || null;
    if (side === "bottom") return feeder.team_b_name?.trim() || null;
    return raw.trim();
  }

  const b = feeder.team_b_name?.trim();
  if (!b && feeder.team_a_name?.trim()) return feeder.team_a_name.trim();

  return null;
}

/** Hai ô A/B trên trận vòng sau: map feeder[0] → cạnh trên, feeder[1] → cạnh dưới (sort id). */
export function resolveInheritedWinnerSlots(
  match: BracketResolveMatch,
  allMatches: readonly BracketResolveMatch[]
): { inheritedTop: string | null; inheritedBottom: string | null } {
  const feeders = getBracketFeederMatches(match, allMatches);
  return {
    inheritedTop: winnerLabelFromFeeder(feeders[0]),
    inheritedBottom: winnerLabelFromFeeder(feeders[1]),
  };
}

/**
 * Nhãn hiển thị cho modal “chọn thắng”: ưu tiên tên đội đã rõ từ vòng trước (team_win),
 * tránh hiển thị chuỗi ghép BE kiểu "B,A" khi đã biết thắng là B.
 */
export function winnerPickSlotLabels(
  match: BracketResolveMatch,
  allMatches: readonly BracketResolveMatch[]
): { top: string; bottom: string } {
  const { inheritedTop, inheritedBottom } = resolveInheritedWinnerSlots(match, allMatches);
  const rawTop = match.team_a_name?.trim() || "";
  const rawBottom = match.team_b_name?.trim() || "";
  const top = (inheritedTop?.trim() || rawTop || "Chưa rõ").trim();
  const bottom = (inheritedBottom?.trim() || rawBottom || "Chưa rõ").trim();
  return { top, bottom };
}
