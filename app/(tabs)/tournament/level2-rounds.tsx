import { useCallback, useMemo, useState } from "react";
import { Alert, Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { router, useFocusEffect } from "expo-router";
import HeaderUser from "@/component/HeaderUser";
import { goBackOrReplace } from "@/src/utils/navigation.helper";
import paymentService from "@/src/services/payment.service";
import tournamentService from "@/src/services/tournament.service";
import tournamentLevel2DraftService from "@/src/services/tournament-level2-draft.service";
import { Level2FlowDraft, Level2TournamentRound } from "@/src/types/tournament.types";
import type { TournamentRoundMatch } from "@/src/types/tournament.types";

const formatDate = (value: string) => {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const roundLabel = (roundNumber: number, totalRounds: number) => {
  if (roundNumber === totalRounds) return "Chung kết";
  if (roundNumber === totalRounds - 1) return "Bán kết";
  return `Vòng ${roundNumber}`;
};

export default function TournamentLevel2RoundsScreen() {
  const navigation = useNavigation();
  const [draft, setDraft] = useState<Level2FlowDraft>({ rounds: [], selections: [], owner_confirmed: false });
  const [paying, setPaying] = useState(false);
  const [expandedRounds, setExpandedRounds] = useState<number[]>([]);
  const [matchesByRound, setMatchesByRound] = useState<Record<number, { loading: boolean; matches: TournamentRoundMatch[] }>>({});

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const current = await tournamentLevel2DraftService.getDraft();
        setDraft(current);
      };

      load();
    }, [])
  );

  const rounds = draft.rounds || [];
  const totalRounds = rounds.length;

  const allScheduled = useMemo(() => rounds.length > 0 && rounds.every((round) => round.status === "scheduled"), [rounds]);

  const handlePay = async () => {
    if (!draft.tournament_id) return;
    if (!draft.owner_confirmed) {
      Alert.alert("Chưa được xác nhận", "Chủ sân chưa xác nhận lịch. Vui lòng đợi chủ sân xác nhận trước khi thanh toán.");
      return;
    }

    try {
      setPaying(true);
      const paymentData = await paymentService.getTournamentZaloPayOrder(draft.tournament_id);
      if (paymentData.order_url) {
        await Linking.openURL(paymentData.order_url);
      }
    } catch (error: any) {
      Alert.alert("Không mở được thanh toán", error?.message || "Vui lòng thử lại sau.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <HeaderUser
        title={draft.tournament_name || "Giải đấu theo vòng"}
        subtitle="Tóm tắt giải đấu"
        showBackButton
        onBackPress={() => goBackOrReplace(navigation, "/(tabs)/tournament")}
      />

      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="border border-slate-200 bg-slate-50 rounded-2xl p-3 mb-3">
          <Text className="text-slate-900 font-semibold">Tóm tắt</Text>
          <Text className="text-slate-600 mt-1 text-sm">
            Hệ thống tự động xếp lịch trận theo khung ngày giờ bạn thiết lập. Nhấn vào mỗi vòng để xem danh sách
            trận đã được xếp.
          </Text>

          {draft.tournament_id ? (
            <TouchableOpacity
              className="mt-3 bg-indigo-600 rounded-xl py-2.5 items-center"
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/tournament/level2-bracket",
                  params: { tournamentId: String(draft.tournament_id) },
                })
              }
            >
              <Text className="text-white font-semibold">Xem sơ đồ nhánh đấu</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {rounds.length === 0 ? (
          <View className="border border-amber-200 bg-amber-50 rounded-xl p-3">
            <Text className="text-amber-800">Chưa có dữ liệu giải đấu theo vòng.</Text>
            <TouchableOpacity
              className="mt-2 bg-amber-500 rounded-lg py-2 items-center"
              onPress={() => router.replace("/(tabs)/tournament/level2-create")}
            >
              <Text className="text-white font-semibold">Quay lại tạo giải</Text>
            </TouchableOpacity>
          </View>
        ) : (
          rounds
            .slice()
            .sort((a, b) => a.round_number - b.round_number)
            .map((round) => {
              const done = round.status === "scheduled";
              return (
                <>
                  <RoundPreviewCard
                    key={round.id}
                    round={round}
                    totalRounds={totalRounds}
                    done={done}
                    tournamentId={draft.tournament_id}
                    onOpenRound={async (id: number) => {
                      // toggle expand/collapse and load matches when expanding
                      const isExpanded = expandedRounds.includes(id);
                      if (isExpanded) {
                        setExpandedRounds((prev) => prev.filter((x) => x !== id));
                        return;
                      }

                      if (!draft.tournament_id) {
                        Alert.alert("Thiếu dữ liệu", "Không tìm thấy mã giải đấu để tải trận.");
                        return;
                      }

                      // If already loaded, just expand
                      const cached = matchesByRound[id];
                      if (cached && cached.matches && cached.matches.length > 0) {
                        setExpandedRounds((prev) => [...prev, id]);
                        return;
                      }

                      setMatchesByRound((prev) => ({ ...prev, [id]: { loading: true, matches: [] } }));
                      try {
                        const resp = await tournamentService.getLevel2RoundMatches(Number(draft.tournament_id), id);
                        setMatchesByRound((prev) => ({ ...prev, [id]: { loading: false, matches: resp.matches } }));
                        setExpandedRounds((prev) => [...prev, id]);
                      } catch (err: any) {
                        setMatchesByRound((prev) => ({ ...prev, [id]: { loading: false, matches: [] } }));
                        Alert.alert("Không tải được trận", err?.message || "Vui lòng thử lại.");
                      }
                    }}
                  />

                  {expandedRounds.includes(round.id) ? (
                    <View className="pl-3 pr-3 mb-2">
                      {matchesByRound[round.id]?.loading ? (
                        <Text className="text-sm text-gray-500">Đang tải trận...</Text>
                      ) : matchesByRound[round.id]?.matches?.length ? (
                        matchesByRound[round.id].matches.map((m) => (
                          <View key={m.id} className="border border-gray-100 rounded-lg p-3 mb-2 bg-white">
                            <Text className="text-gray-900 font-medium">{(m.team_a_name || "—") + " vs " + (m.team_b_name || "—")}</Text>
                            <Text className="text-xs text-gray-600 mt-1">{m.booking_date ? formatDate(m.booking_date) : "--"} {m.start_time ? m.start_time.slice(0,5) : "--:--"} — {m.end_time ? m.end_time.slice(0,5) : "--:--"}</Text>
                            {m.field_name ? <Text className="text-xs text-gray-600">Sân: {m.field_name}</Text> : null}
                          </View>
                        ))
                      ) : (
                        <Text className="text-sm text-gray-500">Chưa có trận cho vòng này.</Text>
                      )}
                    </View>
                  ) : null}
                </>
              );
            })
        )}

        {allScheduled && (
          <View className="mt-2 border border-indigo-200 bg-indigo-50 rounded-2xl p-4">
            <Text className="text-indigo-900 font-semibold">Tất cả vòng đã có lịch</Text>
            <Text className="text-indigo-700 text-sm mt-1">
              Chủ sân sẽ xác nhận lịch thông qua hệ thống riêng. Sau khi chủ sân xác nhận, bạn mới có thể thanh toán một lần.
            </Text>

            <TouchableOpacity
              className={`mt-3 rounded-xl py-3 items-center ${paying || !draft.owner_confirmed ? "bg-gray-300" : "bg-emerald-600"}`}
              onPress={handlePay}
              disabled={paying || !draft.owner_confirmed}
            >
              <Text className="text-white font-semibold">
                {paying ? "Đang mở ZaloPay..." : draft.owner_confirmed ? "Thanh toán ZaloPay" : "Chờ chủ sân xác nhận"}
              </Text>
            </TouchableOpacity>

            {!draft.owner_confirmed ? (
              <Text className="text-xs text-indigo-700 mt-2">Chủ sân chưa xác nhận lịch. Vui lòng đợi chủ sân xác nhận trước khi thanh toán.</Text>
            ) : (
              <Text className="text-xs text-indigo-700 mt-2">Nếu chủ sân đã xác nhận nhưng thanh toán lỗi, hệ thống sẽ báo chi tiết. Vui lòng thử lại sau.</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RoundPreviewCard({
  round,
  totalRounds,
  done,
  tournamentId,
  onOpenRound,
}: {
  round: Level2TournamentRound;
  totalRounds: number;
  done: boolean;
  tournamentId?: number | null;
  onOpenRound?: (roundId: number) => void;
}) {
  const onPress = () => {
    if (done) {
      onOpenRound?.(round.id);
    } else {
      router.push({ pathname: "/(tabs)/tournament/level2-slots", params: { roundId: String(round.id) } });
    }
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} className="mb-2">
      <View className="border border-gray-200 rounded-xl p-3">
        <View className="flex-row items-start justify-between">
          <View className="pr-2 flex-1">
            <Text className="text-gray-900 font-semibold">
              {roundLabel(round.round_number, totalRounds)} - {round.match_count} trận
            </Text>
            <Text className="text-gray-600 text-xs mt-1">
              {formatDate(round.start_date)} - {formatDate(round.end_date)}
            </Text>
            <Text className="text-gray-600 text-xs">
              {round.daily_start_time.slice(0, 5)} - {round.daily_end_time.slice(0, 5)} | {round.match_duration_mins} phút/trận
            </Text>
          </View>
          <Text className={`text-xs font-semibold ${done ? "text-emerald-600" : "text-amber-600"}`}>
            {done ? "Đã có lịch" : "Chưa có lịch"}
          </Text>
        </View>
        <Text className="text-xs text-slate-500 mt-2">Lịch trận trong vòng này do hệ thống tự phân bổ trong khung giờ trên. Nhấn để xem chi tiết.</Text>
      </View>
    </TouchableOpacity>
  );
}
