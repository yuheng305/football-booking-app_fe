/**
 * Single elimination: số vòng = ceil(log2(N)).
 * Vòng 1: N − 2^(k−1) trận (2 đội/trận), phần còn lại được "bye".
 */

export function bracketRoundCount(teamCount: number): number {
  if (teamCount < 2) return 0;
  return Math.ceil(Math.log2(teamCount));
}

/** Vòng đánh số từ 1 .. bracketRoundCount(n). */
export function matchCountForBracketRound(teamCount: number, roundNumber: number): number {
  const k = bracketRoundCount(teamCount);
  if (roundNumber < 1 || roundNumber > k) return 0;
  if (roundNumber === 1) return teamCount - Math.pow(2, k - 1);
  return Math.pow(2, k - roundNumber);
}

/** Số đội không phải đá ở vòng 1 (chờ vòng sau). */
export function byeCountRound1(teamCount: number): number {
  const m = matchCountForBracketRound(teamCount, 1);
  return Math.max(0, teamCount - 2 * m);
}
