import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Svg, { Line } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import HeaderUser from "@/component/HeaderUser";
import PickMatchWinnerModal from "@/component/PickMatchWinnerModal";
import tournamentService from "@/src/services/tournament.service";
import tournamentLevel2DraftService from "@/src/services/tournament-level2-draft.service";
import { goBackOrReplace } from "@/src/utils/navigation.helper";
import type { TournamentBracketData, TournamentBracketMatch } from "@/src/types/tournament.types";
import {
  resolveInheritedWinnerSlots,
  winnerPickSlotLabels,
} from "@/src/utils/tournament-bracket-resolve.util";
import {
  formatWinnerBadgeLabel,
  resolveWinnerSideFromExtra,
} from "@/src/utils/tournament-match.util";

const formatDate = (value?: string | null) => {
  if (!value) return "--";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

const formatTime = (value?: string | null) => {
  if (!value) return "--:--";
  return value.slice(0, 5);
};

/** Chuẩn hóa tên để token khớp (API đôi khi có "B,A") */
const normalizeToken = (s: string) => s.trim();

const splitTeams = (value?: string | null): string[] => {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => normalizeToken(item))
    .filter(Boolean);
};

const tokensFromMatch = (match?: TournamentBracketMatch): Set<string> => {
  if (!match) return new Set<string>();
  return new Set([...splitTeams(match.team_a_name), ...splitTeams(match.team_b_name)]);
};

const isByeMatch = (match: TournamentBracketMatch) => {
  const b = match.team_b_name?.trim();
  return !b;
};

type BracketSideVisual = { kind: "empty" } | { kind: "single"; name: string } | { kind: "pending" };

/** 1 đội → tên; ≥2 đội (phẩy) → không in chuỗi, dùng ô “chưa xác định”; trống → empty. */
const sideVisual = (raw?: string | null): BracketSideVisual => {
  const parts = splitTeams(raw);
  if (parts.length === 0) return { kind: "empty" };
  if (parts.length === 1) return { kind: "single", name: parts[0] };
  return { kind: "pending" };
};

const SLOT_EMPTY = "—";

/** Ô thể hiện “còn chọn đội / chưa xác định” thay vì liệt kê A,B,C,… */
function BracketTbdBox() {
  return (
    <View
      accessible
      accessibilityLabel="Chưa xác định đội"
      className="mt-0.5 self-start rounded-sm border-2 border-dashed border-gray-400 bg-white/80"
      style={{ width: 40, height: 18 }}
    />
  );
}

/** Kích thước và bước cột được nhân với zoom — kéo trôi nhẹ + vẫn đọc được chữ */
const DIM = (zoom: number) => {
  const z = Math.min(1.35, Math.max(0.65, zoom));
  const cardW = Math.round(152 * z);
  /** Tên đội + (tuỳ) lịch — chừa cao để đường nối khớp tâm ô */
  const cardH = Math.round(100 * z);
  return {
    zoom: z,
    CARD_WIDTH: Math.max(120, cardW),
    /** Cố định — đường nối dùng tâm ô; không cho ô tự cao theo nội dung */
    CARD_HEIGHT: Math.max(88, cardH),
    ROUND_Y_SPACING: Math.max(112, Math.round((100 + 36) * z)),
    ROUND_COLUMN_STEP: Math.max(176, Math.round(210 * z)),
  };
};

type MatchNode = {
  match: TournamentBracketMatch;
  children: MatchNode[];
  y: number;
  x: number;
};

const ZOOM_STEPS = [0.72, 0.84, 1, 1.14, 1.28];

const collectNodesDepthFirst = (node: MatchNode, out: MatchNode[]) => {
  out.push(node);
  node.children.forEach((child) => collectNodesDepthFirst(child, out));
};

export default function TournamentLevel2BracketScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ tournamentId?: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TournamentBracketData | null>(null);
  const [tournamentName, setTournamentName] = useState("");
  const [activeTournamentId, setActiveTournamentId] = useState<number | null>(null);
  const [organizerId, setOrganizerId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [patchingMatchId, setPatchingMatchId] = useState<number | null>(null);
  const [pickWinnerModal, setPickWinnerModal] = useState<{
    matchId: number;
    topLabel: string;
    bottomLabel: string;
  } | null>(null);
  const [zoomIndex, setZoomIndex] = useState(2);

  const zoomPreset = ZOOM_STEPS[zoomIndex] ?? 1;
  const dim = useMemo(() => DIM(zoomPreset), [zoomPreset]);

  const tournamentIdParam = Number(params.tournamentId);

  useEffect(() => {
    (async () => {
      try {
        const userDataRaw = await AsyncStorage.getItem("userData");
        const profileRaw = await AsyncStorage.getItem("userProfile");
        const ud = userDataRaw ? JSON.parse(userDataRaw) : null;
        const pr = profileRaw ? JSON.parse(profileRaw) : null;
        const uid = Number(ud?.user_id ?? ud?.id ?? pr?.id ?? pr?.user_id);
        setCurrentUserId(Number.isFinite(uid) && uid > 0 ? uid : null);
      } catch {
        setCurrentUserId(null);
      }
    })();
  }, []);

  const canPickWinner = useMemo(() => {
    if (organizerId == null || currentUserId == null) return false;
    return Number(organizerId) === Number(currentUserId);
  }, [organizerId, currentUserId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        try {
          setLoading(true);

          const draft = await tournamentLevel2DraftService.getDraft();
          const fallbackId = draft.tournament_id;
          const tournamentId =
            Number.isFinite(tournamentIdParam) && tournamentIdParam > 0
              ? tournamentIdParam
              : fallbackId;

          if (!tournamentId) {
            throw new Error("Không tìm thấy mã giải đấu level 2");
          }

          if (active) setActiveTournamentId(tournamentId);

          const bracket = await tournamentService.getLevel2AllMatches(tournamentId);
          if (!active) return;

          try {
            const detail = await tournamentService.getTournamentDetail(tournamentId);
            if (active && detail?.name) setTournamentName(detail.name);
            else if (active)
              setTournamentName(draft.tournament_name || `Giải #${tournamentId}`);
            if (active && detail?.organizer_id != null)
              setOrganizerId(Number(detail.organizer_id));
            else if (active) setOrganizerId(null);
          } catch {
            if (active) setTournamentName(draft.tournament_name || `Giải #${tournamentId}`);
            if (active) setOrganizerId(null);
          }

          setData(bracket);
        } catch (error: any) {
          if (!active) return;
          Alert.alert("Không tải được nhánh đấu", error?.message || "Vui lòng thử lại.");
          setData(null);
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      load();

      return () => {
        active = false;
      };
    }, [tournamentIdParam])
  );

  const rounds = useMemo(() => {
    if (!data?.matches?.length) return [] as Array<{ round: number; matches: TournamentBracketMatch[] }>;

    const grouped = new Map<number, TournamentBracketMatch[]>();

    data.matches.forEach((match) => {
      const round = Number(match.round_number) || 1;
      if (!grouped.has(round)) {
        grouped.set(round, []);
      }
      grouped.get(round)?.push(match);
    });

    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([round, matches]) => ({
        round,
        matches: matches.sort((a, b) => a.id - b.id),
      }));
  }, [data?.matches]);

  /**
   * Cây neo ở vòng cuối (chung kết bên phải). round_number nhỏ hơn nằm bên trái.
   */
  const bracketLayout = useMemo(() => {
    const { CARD_WIDTH, CARD_HEIGHT, ROUND_Y_SPACING, ROUND_COLUMN_STEP } = dim;

    if (!rounds.length) {
      return {
        roots: [] as MatchNode[],
        flatNodes: [] as MatchNode[],
        lines: [] as Array<{ x1: number; y1: number; x2: number; y2: number }>,
        contentWidth: 400,
        contentHeight: 400,
        CARD_WIDTH,
        CARD_HEIGHT,
      };
    }

    const nodeMap = new Map<number, MatchNode>();

    const buildNode = (match: TournamentBracketMatch): MatchNode => {
      if (nodeMap.has(match.id)) {
        return nodeMap.get(match.id)!;
      }

      const parentTokens = tokensFromMatch(match);
      const prevRound = rounds.find((r) => r.round === match.round_number - 1);

      let children: MatchNode[] = [];
      if (prevRound) {
        const childMatches = prevRound.matches.filter((prev) => {
          const prevTokens = tokensFromMatch(prev);
          let overlap = 0;
          prevTokens.forEach((token) => {
            if (parentTokens.has(token)) overlap += 1;
          });
          return overlap > 0;
        });

        children = childMatches.map((child) => buildNode(child));
      }

      const node: MatchNode = {
        match,
        children,
        y: 0,
        /** Vòng đầu sát trái, vòng cuối sát phải **/
        x: (match.round_number - 1) * ROUND_COLUMN_STEP,
      };

      nodeMap.set(match.id, node);
      return node;
    };

    const maxRound = rounds[rounds.length - 1].round;
    const rootMatches = rounds.find((r) => r.round === maxRound)?.matches ?? [];
    const roots = rootMatches.map((m) => buildNode(m));

    let cursorY = 20;
    const assignYPositions = (node: MatchNode) => {
      if (!node.children.length) {
        node.y = cursorY;
        cursorY += ROUND_Y_SPACING;
      } else {
        node.children.forEach((child) => assignYPositions(child));
        const first = node.children[0].y;
        const last = node.children[node.children.length - 1];
        const spanBottom = last.y + CARD_HEIGHT;
        node.y = (first + spanBottom) / 2 - CARD_HEIGHT / 2;
      }
    };

    roots.forEach((root) => assignYPositions(root));

    const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    const BUS_INSET = Math.max(14, Math.round(16 * dim.zoom));

    /** Nối con → cha: 1 con = một đoạn; ≥2 con = ngang tới trục + trục dọc + ngang vào cha (tránh lệch tâm). */
    const addLines = (node: MatchNode) => {
      const py = node.y + CARD_HEIGHT / 2;
      const pxLeft = node.x;

      if (node.children.length === 0) return;

      if (node.children.length === 1) {
        const child = node.children[0];
        const cy = child.y + CARD_HEIGHT / 2;
        lines.push({
          x1: child.x + CARD_WIDTH,
          y1: cy,
          x2: pxLeft,
          y2: py,
        });
        addLines(child);
        return;
      }

      const joinX = pxLeft - BUS_INSET;
      node.children.forEach((child) => {
        const cy = child.y + CARD_HEIGHT / 2;
        lines.push({
          x1: child.x + CARD_WIDTH,
          y1: cy,
          x2: joinX,
          y2: cy,
        });
        addLines(child);
      });

      const cys = node.children.map((c) => c.y + CARD_HEIGHT / 2);
      const minY = Math.min(...cys);
      const maxY = Math.max(...cys);
      lines.push({ x1: joinX, y1: minY, x2: joinX, y2: maxY });
      lines.push({ x1: joinX, y1: py, x2: pxLeft, y2: py });
    };

    roots.forEach((root) => addLines(root));

    const flatNodes: MatchNode[] = [];
    roots.forEach((r) => collectNodesDepthFirst(r, flatNodes));

    let maxRight = CARD_WIDTH + 40;
    let maxBottom = CARD_HEIGHT + 40;
    flatNodes.forEach((n) => {
      maxRight = Math.max(maxRight, n.x + CARD_WIDTH + 24);
      maxBottom = Math.max(maxBottom, n.y + CARD_HEIGHT + 24);
    });

    return {
      roots,
      flatNodes,
      lines,
      contentWidth: maxRight,
      contentHeight: maxBottom,
      CARD_WIDTH,
      CARD_HEIGHT,
    };
  }, [rounds, dim]);

  const roundColors: Record<number, string> = {
    1: "bg-blue-50 border-blue-200",
    2: "bg-purple-50 border-purple-200",
    3: "bg-pink-50 border-pink-200",
    4: "bg-rose-50 border-rose-200",
    5: "bg-orange-50 border-orange-200",
    6: "bg-teal-50 border-teal-200",
    7: "bg-cyan-50 border-cyan-200",
  };

  const getRoundColor = (round: number) => roundColors[round] ?? "bg-slate-50 border-slate-200";

  const openPickWinnerModal = (match: TournamentBracketMatch) => {
    if (!activeTournamentId || patchingMatchId != null || !data?.matches?.length) return;
    const { top, bottom } = winnerPickSlotLabels(match, data.matches);
    setPickWinnerModal({ matchId: match.id, topLabel: top, bottomLabel: bottom });
  };

  const submitMatchWinner = async (matchId: number, winnerTeamName: string) => {
    if (!activeTournamentId) return;
    const name = winnerTeamName.trim();
    if (!name) return;
    try {
      setPatchingMatchId(matchId);
      await tournamentService.patchLevel2Match(activeTournamentId, matchId, {
        extra_data: { team_win: name },
      });
      const bracket = await tournamentService.getLevel2AllMatches(activeTournamentId);
      setData(bracket);
      setPickWinnerModal(null);
    } catch (error: any) {
      Alert.alert("Không lưu được", error?.message || "Thử lại sau.");
    } finally {
      setPatchingMatchId(null);
    }
  };

  /** Quay lại màn trước (chi tiết giải / tóm tắt / …) — không ép về “bước 3/3”. */
  const leaveBracket = () => goBackOrReplace(navigation, "/(tabs)/tournament");

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <PickMatchWinnerModal
        visible={pickWinnerModal != null}
        onDismiss={() => setPickWinnerModal(null)}
        topLabel={pickWinnerModal?.topLabel ?? ""}
        bottomLabel={pickWinnerModal?.bottomLabel ?? ""}
        loading={
          pickWinnerModal != null &&
          patchingMatchId === pickWinnerModal.matchId
        }
        onPickTop={() =>
          pickWinnerModal != null &&
          void submitMatchWinner(pickWinnerModal.matchId, pickWinnerModal.topLabel)
        }
        onPickBottom={() =>
          pickWinnerModal != null &&
          void submitMatchWinner(pickWinnerModal.matchId, pickWinnerModal.bottomLabel)
        }
      />

      <HeaderUser
        title={tournamentName || "Sơ đồ nhánh đấu"}
        showBackButton
        onBackPress={leaveBracket}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : !data || rounds.length === 0 ? (
        <View className="flex-1 px-4 pt-4">
          <View className="border border-amber-200 bg-amber-50 rounded-xl p-3">
            <Text className="text-amber-800">Chưa có dữ liệu nhánh đấu.</Text>
            <TouchableOpacity className="mt-3 bg-indigo-600 rounded-xl py-3 items-center" onPress={leaveBracket}>
              <Text className="text-white font-semibold">Quay lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <View className="px-4 pt-2 pb-1 shrink-0 flex-row items-center justify-end flex-wrap">
            <TouchableOpacity
              className="bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1 mr-1.5"
              disabled={zoomIndex <= 0}
              onPress={() => setZoomIndex((i) => Math.max(0, i - 1))}
            >
              <Text className={`text-sm font-semibold ${zoomIndex <= 0 ? "text-gray-300" : "text-gray-800"}`}>−</Text>
            </TouchableOpacity>
            <Text className="text-[11px] text-gray-700 font-medium min-w-[36px] text-center mr-1.5">
              {Math.round((ZOOM_STEPS[zoomIndex] ?? 1) * 100)}%
            </Text>
            <TouchableOpacity
              className="bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1 mr-1.5"
              disabled={zoomIndex >= ZOOM_STEPS.length - 1}
              onPress={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
            >
              <Text className={`text-sm font-semibold ${zoomIndex >= ZOOM_STEPS.length - 1 ? "text-gray-300" : "text-gray-800"}`}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1" onPress={() => setZoomIndex(2)}>
              <Text className="text-[11px] text-gray-800 font-medium">100%</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 mt-2" nestedScrollEnabled showsVerticalScrollIndicator>
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              <View
                style={{
                  width: bracketLayout.contentWidth,
                  height: bracketLayout.contentHeight,
                  position: "relative",
                }}
              >
                <Svg
                  width={bracketLayout.contentWidth}
                  height={bracketLayout.contentHeight}
                  style={{ position: "absolute", top: 0, left: 0 }}
                >
                  {bracketLayout.lines.map((line, idx) => (
                    <Line
                      key={`line-${idx}`}
                      x1={line.x1}
                      y1={line.y1}
                      x2={line.x2}
                      y2={line.y2}
                      stroke="#6366f1"
                      strokeWidth="2"
                      strokeOpacity={0.75}
                    />
                  ))}
                </Svg>

                {bracketLayout.flatNodes.map(({ match, x, y }) => {
                  const cw = bracketLayout.CARD_WIDTH;
                  const ch = bracketLayout.CARD_HEIGHT;
                  const hasSchedule = !!match.booking_date;
                  const allMatches = data!.matches;
                  const { inheritedTop, inheritedBottom } = resolveInheritedWinnerSlots(match, allMatches);
                  const va = sideVisual(match.team_a_name);
                  const vb = sideVisual(match.team_b_name);
                  const bye = isByeMatch(match);
                  const winSide = resolveWinnerSideFromExtra(
                    match.extra_data,
                    match.team_a_name,
                    match.team_b_name
                  );
                  const winUpper = winSide === "top";
                  const winLower = winSide === "bottom";
                  const cardTouchable =
                    canPickWinner && !bye && !!match.team_b_name?.trim() && patchingMatchId !== match.id;

                  const renderUpper = () => {
                    const ring = winUpper ? "border border-emerald-500 rounded px-0.5 -mx-0.5" : "";
                    if (inheritedTop?.trim()) {
                      return (
                        <View className={ring}>
                          <Text
                            className="text-[11px] text-emerald-900 font-semibold mt-0.5 leading-[14px]"
                            numberOfLines={2}
                          >
                            {inheritedTop.trim()}
                          </Text>
                        </View>
                      );
                    }
                    if (va.kind === "single") {
                      return (
                        <View className={ring}>
                          <Text className="text-[11px] text-gray-900 font-semibold mt-0.5 leading-[14px]" numberOfLines={2}>
                            {va.name}
                          </Text>
                        </View>
                      );
                    }
                    if (va.kind === "pending")
                      return (
                        <View className={ring}>
                          <BracketTbdBox />
                        </View>
                      );
                    return (
                      <Text className="text-[11px] text-gray-400 font-semibold mt-0.5 leading-[14px]" numberOfLines={1}>
                        {SLOT_EMPTY}
                      </Text>
                    );
                  };

                  const renderLower = () => {
                    const ring = winLower ? "border border-emerald-500 rounded px-0.5 -mx-0.5" : "";
                    if (inheritedBottom?.trim()) {
                      return (
                        <View className={ring}>
                          <Text className="text-[11px] text-emerald-900 font-semibold leading-[14px]" numberOfLines={2}>
                            {inheritedBottom.trim()}
                          </Text>
                        </View>
                      );
                    }
                    if (vb.kind === "single") {
                      return (
                        <View className={ring}>
                          <Text className="text-[11px] text-gray-900 font-semibold leading-[14px]" numberOfLines={2}>
                            {vb.name}
                          </Text>
                        </View>
                      );
                    }
                    if (vb.kind === "pending")
                      return (
                        <View className={ring}>
                          <BracketTbdBox />
                        </View>
                      );
                    return (
                      <Text className="text-[11px] text-gray-400 font-semibold leading-[14px]" numberOfLines={1}>
                        {SLOT_EMPTY}
                      </Text>
                    );
                  };

                  const renderInnerCard = () => (
                    <View
                      className={`rounded-lg border border-gray-200 px-2 py-1 ${getRoundColor(match.round_number)}`}
                      style={{ flex: 1, justifyContent: "center" }}
                    >
                      <Text className="text-[9px] font-semibold text-gray-500 uppercase" numberOfLines={1}>
                        V{match.round_number}
                      </Text>
                      {bye ? (
                        <>
                          {va.kind === "single" ? (
                            <Text className="text-[11px] text-gray-900 font-semibold mt-0.5 leading-[14px]" numberOfLines={2}>
                              {va.name}
                            </Text>
                          ) : va.kind === "pending" ? (
                            <BracketTbdBox />
                          ) : (
                            <Text className="text-[11px] text-gray-400 font-semibold mt-0.5 leading-[14px]" numberOfLines={1}>
                              {SLOT_EMPTY}
                            </Text>
                          )}
                        </>
                      ) : (
                        <>
                          {renderUpper()}
                          <Text className="text-[9px] text-gray-500 mt-0.5">vs</Text>
                          {renderLower()}
                        </>
                      )}
                      {winSide ? (
                        <Text className="text-[9px] text-emerald-700 font-bold mt-0.5" numberOfLines={1}>
                          ✓{" "}
                          {formatWinnerBadgeLabel(
                            match.extra_data,
                            match.team_a_name,
                            match.team_b_name
                          )}
                        </Text>
                      ) : null}
                      {hasSchedule ? (
                        <>
                          <Text className="text-[10px] text-gray-800 font-medium mt-1 leading-4" numberOfLines={1}>
                            {formatDate(match.booking_date)}
                          </Text>
                          <Text className="text-[10px] text-gray-600 leading-4" numberOfLines={1}>
                            {formatTime(match.start_time)} – {formatTime(match.end_time)}
                          </Text>
                        </>
                      ) : null}
                      {patchingMatchId === match.id ? (
                        <View className="mt-1 items-start">
                          <ActivityIndicator size="small" color="#059669" />
                        </View>
                      ) : cardTouchable ? (
                        <Text className="text-[8px] text-indigo-600 font-semibold mt-0.5">
                          Chạm để chọn đội thắng
                        </Text>
                      ) : null}
                    </View>
                  );

                  return (
                    <View
                      key={`card-${match.id}`}
                      style={{
                        position: "absolute",
                        left: x,
                        top: y,
                        width: cw,
                        height: ch,
                        overflow: "hidden",
                      }}
                    >
                      {cardTouchable ? (
                        <TouchableOpacity activeOpacity={0.85} onPress={() => openPickWinnerModal(match)} style={{ flex: 1 }}>
                          {renderInnerCard()}
                        </TouchableOpacity>
                      ) : (
                        renderInnerCard()
                      )}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </ScrollView>

          <View className="px-4 pb-4 pt-2 border-t border-gray-100 shrink-0">
            <TouchableOpacity className="rounded-xl py-3 items-center bg-emerald-600" onPress={leaveBracket}>
              <Text className="text-white font-semibold">Quay lại</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
