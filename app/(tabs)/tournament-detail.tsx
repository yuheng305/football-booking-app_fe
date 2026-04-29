import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import HeaderUser from "@/component/HeaderUser";
import clusterService from "@/src/services/cluster.service";
import paymentService from "@/src/services/payment.service";
import tournamentService from "@/src/services/tournament.service";
import {
  TournamentDetailData,
  TournamentDetailRound,
  TournamentRoundMatch,
} from "@/src/types/tournament.types";

type MatchesState = {
  loading: boolean;
  data: TournamentRoundMatch[];
  loaded: boolean;
};

type MatchEditValue = {
  team_a_name: string;
  team_b_name: string;
};

const formatDate = (value?: string) => {
  if (!value) return "--";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const formatTime = (value?: string) => {
  if (!value) return "--";
  return value.slice(0, 5);
};

const toVnd = (value?: number) => `${(value || 0).toLocaleString("vi-VN")} VND`;

const statusLabel = (status?: string) => {
  if (status === "pending") return "Chờ xác nhận";
  if (status === "confirmed") return "Đã xác nhận";
  if (status === "success") return "Thành công";
  if (status === "canceled") return "Đã hủy";
  if (status === "scheduled") return "Đã xếp lịch";
  return status || "--";
};

const statusClasses = (status?: string) => {
  if (status === "success" || status === "scheduled") {
    return "text-emerald-700 bg-emerald-100";
  }

  if (status === "confirmed") {
    return "text-indigo-700 bg-indigo-100";
  }

  if (status === "canceled") {
    return "text-rose-700 bg-rose-100";
  }

  return "text-amber-700 bg-amber-100";
};

export default function TournamentDetailScreen() {
  const params = useLocalSearchParams<{ id?: string; paymentStatus?: string }>();
  const tournamentId = Number(params.id);

  const [detail, setDetail] = useState<TournamentDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedRounds, setExpandedRounds] = useState<number[]>([]);
  const [matchesByRound, setMatchesByRound] = useState<Record<number, MatchesState>>({});
  const [editingByMatch, setEditingByMatch] = useState<Record<number, MatchEditValue>>({});
  const [savingMatchIds, setSavingMatchIds] = useState<number[]>([]);
  const [clusterNamesById, setClusterNamesById] = useState<Record<number, string>>({});
  const [isPayingTournament, setIsPayingTournament] = useState(false);

  const paymentStatus = detail?.payment_status || params.paymentStatus || "";

  const paymentStatusLabel = (status?: string) => {
    if (status === "paid") return "Đã thanh toán";
    if (status === "pending") return "Chờ chủ sân duyệt";
    if (status === "confirmed") return "Chờ thanh toán";
    if (status === "no_bookings") return "Chưa có booking";
    return status || "Không rõ";
  };

  const paymentStatusClasses = (status?: string) => {
    if (status === "paid") return "bg-emerald-100 text-emerald-700";
    if (status === "pending") return "bg-sky-100 text-sky-700";
    if (status === "confirmed") return "bg-amber-100 text-amber-700";
    if (status === "no_bookings") return "bg-slate-100 text-slate-600";
    return "bg-slate-100 text-slate-600";
  };

  const loadDetail = useCallback(async (silent?: boolean) => {
    if (!tournamentId || Number.isNaN(tournamentId)) {
      setLoading(false);
      return;
    }

    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await tournamentService.getTournamentDetail(tournamentId);
      setDetail(data);
    } catch (error: any) {
      Alert.alert("Không tải được chi tiết", error?.message || "Vui lòng thử lại.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tournamentId]);

  useFocusEffect(
    useCallback(() => {
      loadDetail();
    }, [loadDetail])
  );

  const rounds = useMemo(() => {
    return (detail?.rounds || []).slice().sort((a, b) => a.round_number - b.round_number);
  }, [detail?.rounds]);

  useEffect(() => {
    if (!detail) return;

    const clusterIds = Array.from(
      new Set(
        [
          detail.cluster_id,
          ...(detail.rounds || []).map((round) => round.cluster_id),
        ].filter((id): id is number => typeof id === "number" && id > 0)
      )
    );

    const missingIds = clusterIds.filter((id) => !clusterNamesById[id]);
    if (missingIds.length === 0) return;

    let active = true;
    const loadClusterNames = async () => {
      const entries = await Promise.all(
        missingIds.map(async (clusterId) => {
          try {
            const cluster = await clusterService.getCluster(clusterId);
            return [clusterId, cluster.name] as const;
          } catch {
            return [clusterId, `Cụm #${clusterId}`] as const;
          }
        })
      );

      if (!active) return;
      setClusterNamesById((prev) => {
        const next = { ...prev };
        entries.forEach(([id, name]) => {
          next[id] = name;
        });
        return next;
      });
    };

    loadClusterNames();

    return () => {
      active = false;
    };
  }, [clusterNamesById, detail]);

  const clusterSummary = useMemo(() => {
    if (!detail) return "--";

    if (typeof detail.cluster_id === "number") {
      return clusterNamesById[detail.cluster_id] || `Cụm #${detail.cluster_id}`;
    }

    const uniqueRoundClusters = Array.from(
      new Set(
        (detail.rounds || [])
          .map((round) =>
            typeof round.cluster_id === "number"
              ? clusterNamesById[round.cluster_id] || `Cụm #${round.cluster_id}`
              : round.cluster_name
          )
          .filter(Boolean)
      )
    ) as string[];

    if (uniqueRoundClusters.length > 0) {
      return uniqueRoundClusters.join(", ");
    }

    return "--";
  }, [clusterNamesById, detail]);

  const loadRoundMatches = async (round: TournamentDetailRound) => {
    if (!detail || detail.level !== 2) {
      return;
    }

    const cached = matchesByRound[round.id];
    if (cached?.loaded || cached?.loading) {
      return;
    }

    setMatchesByRound((prev) => ({
      ...prev,
      [round.id]: {
        loading: true,
        loaded: false,
        data: [],
      },
    }));

    try {
      const response = await tournamentService.getLevel2RoundMatches(detail.id, round.id);

      const seededEdits: Record<number, MatchEditValue> = {};
      response.matches.forEach((match) => {
        seededEdits[match.id] = {
          team_a_name: match.team_a_name || "",
          team_b_name: match.team_b_name || "",
        };
      });

      setEditingByMatch((prev) => ({
        ...prev,
        ...seededEdits,
      }));

      setMatchesByRound((prev) => ({
        ...prev,
        [round.id]: {
          loading: false,
          loaded: true,
          data: response.matches,
        },
      }));
    } catch (error: any) {
      setMatchesByRound((prev) => ({
        ...prev,
        [round.id]: {
          loading: false,
          loaded: false,
          data: [],
        },
      }));
      Alert.alert("Không tải được trận đấu", error?.message || "Vui lòng thử lại.");
    }
  };

  const toggleRound = (round: TournamentDetailRound) => {
    const isExpanded = expandedRounds.includes(round.id);
    if (isExpanded) {
      setExpandedRounds((prev) => prev.filter((item) => item !== round.id));
      return;
    }

    setExpandedRounds((prev) => [...prev, round.id]);
    loadRoundMatches(round);
  };

  const updateMatchEdit = (matchId: number, key: "team_a_name" | "team_b_name", value: string) => {
    setEditingByMatch((prev) => ({
      ...prev,
      [matchId]: {
        team_a_name: prev[matchId]?.team_a_name ?? "",
        team_b_name: prev[matchId]?.team_b_name ?? "",
        [key]: value,
      },
    }));
  };

  const isSavingMatch = (matchId: number) => savingMatchIds.includes(matchId);

  const handleSaveMatchTeams = async (roundId: number, match: TournamentRoundMatch) => {
    if (!detail) return;

    const draft = editingByMatch[match.id] || {
      team_a_name: match.team_a_name || "",
      team_b_name: match.team_b_name || "",
    };

    const payload: { team_a_name?: string; team_b_name?: string } = {};
    const nextTeamA = draft.team_a_name.trim();
    const nextTeamB = draft.team_b_name.trim();

    if (nextTeamA !== (match.team_a_name || "")) {
      payload.team_a_name = nextTeamA;
    }

    if (nextTeamB !== (match.team_b_name || "")) {
      payload.team_b_name = nextTeamB;
    }

    if (!payload.team_a_name && !payload.team_b_name) {
      Alert.alert("Chưa có thay đổi", "Bạn chưa chỉnh tên đội nào cho trận này.");
      return;
    }

    try {
      setSavingMatchIds((prev) => [...prev, match.id]);
      const updated = await tournamentService.updateLevel2MatchTeams(
        detail.id,
        roundId,
        match.id,
        payload
      );

      setMatchesByRound((prev) => {
        const roundState = prev[roundId];
        if (!roundState) return prev;

        return {
          ...prev,
          [roundId]: {
            ...roundState,
            data: roundState.data.map((item) =>
              item.id === updated.id
                ? {
                    ...item,
                    team_a_name: updated.team_a_name,
                    team_b_name: updated.team_b_name,
                    updated_at: updated.updated_at,
                  }
                : item
            ),
          },
        };
      });

      setEditingByMatch((prev) => ({
        ...prev,
        [match.id]: {
          team_a_name: updated.team_a_name || "",
          team_b_name: updated.team_b_name || "",
        },
      }));

      Alert.alert("Thành công", "Đã cập nhật tên đội cho trận đấu.");
    } catch (error: any) {
      Alert.alert("Cập nhật thất bại", error?.message || "Vui lòng thử lại.");
    } finally {
      setSavingMatchIds((prev) => prev.filter((item) => item !== match.id));
    }
  };

  const handlePayTournament = async () => {
    if (!detail || !tournamentId) return;

    try {
      setIsPayingTournament(true);
      const order = await paymentService.getTournamentZaloPayOrder(tournamentId);

      if (!order.order_url) {
        throw new Error("Không có link thanh toán cho giải đấu này");
      }

      const supported = await Linking.canOpenURL(order.order_url);
      if (!supported) {
        Alert.alert("Không thể mở ZaloPay", "Thiết bị không hỗ trợ mở link thanh toán này.");
        return;
      }

      await Linking.openURL(order.order_url);

      Alert.alert(
        "Đã tạo đơn thanh toán",
        `Mã giao dịch: ${order.app_trans_id}\nSố tiền: ${order.amount.toLocaleString("vi-VN")}đ`
      );
    } catch (error: any) {
      Alert.alert("Lỗi thanh toán", error?.message || "Không thể tạo link thanh toán giải đấu");
    } finally {
      setIsPayingTournament(false);
    }
  };

  if (!tournamentId || Number.isNaN(tournamentId)) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <HeaderUser
          title="Chi tiết giải đấu"
          subtitle="Không tìm thấy giải đấu"
          showBackButton
          onBackPress={() => router.replace("/(tabs)/tournament")}
        />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-gray-600 text-center">ID giải đấu không hợp lệ.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <HeaderUser
        title={detail?.name || `Giải #${tournamentId}`}
        subtitle="Chi tiết giải đấu"
        showBackButton
        onBackPress={() => router.replace("/(tabs)/tournament")}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : !detail ? (
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-gray-600 text-center">Không có dữ liệu chi tiết giải đấu.</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadDetail(true)} />
          }
        >
          <View className="border border-gray-200 rounded-xl p-3 mb-3">
            <Text className="text-gray-900 text-base font-semibold">Thông tin cơ bản</Text>
            <Text className="text-gray-600 mt-2 text-sm">Môn: {detail.sport_type}</Text>
            <Text className="text-gray-600 text-sm">Cấp độ: Level {detail.level}</Text>
            <Text className="text-gray-600 text-sm">Quy mô: {detail.size} đội</Text>
            <Text className="text-gray-600 text-sm">Phí tham gia: {toVnd(detail.entry_fee)}</Text>
            {detail.created_at ? (
              <Text className="text-gray-600 text-sm">Tạo lúc: {formatDate(detail.created_at.slice(0, 10))}</Text>
            ) : null}
          </View>

          <View className="border border-indigo-200 bg-indigo-50 rounded-xl p-3 mb-3">
            <Text className="text-indigo-900 text-base font-semibold">Cụm sân</Text>
            <Text className="text-indigo-800 mt-2 text-sm">{clusterSummary}</Text>
          </View>

          <View className="border border-gray-200 rounded-xl p-3 mb-3">
            <Text className="text-gray-900 text-base font-semibold">Thanh toán giải đấu</Text>
            <View className="mt-2 self-start">
              <Text
                className={`text-xs font-semibold px-2 py-1 rounded-full ${paymentStatusClasses(
                  paymentStatus
                )}`}
              >
                {paymentStatusLabel(paymentStatus)}
              </Text>
            </View>

            {paymentStatus === "confirmed" ? (
              <TouchableOpacity
                className={`mt-3 rounded-xl py-2.5 items-center ${
                  isPayingTournament ? "bg-gray-300" : "bg-amber-600"
                }`}
                onPress={handlePayTournament}
                disabled={isPayingTournament}
              >
                <Text className="text-white font-semibold">
                  {isPayingTournament ? "Đang tạo link thanh toán..." : "Thanh toán ngay"}
                </Text>
              </TouchableOpacity>
            ) : paymentStatus === "pending" ? (
              <Text className="text-gray-600 text-sm mt-2">
                Giải đấu đang chờ chủ sân duyệt. Sau khi được duyệt, trạng thái sẽ chuyển sang "Chờ thanh toán".
              </Text>
            ) : paymentStatus === "no_bookings" ? (
              <Text className="text-gray-600 text-sm mt-2">
                Chưa có booking được xác nhận nên chưa thể tạo thanh toán.
              </Text>
            ) : null}
          </View>

          <View className="border border-gray-200 rounded-xl p-3">
            <Text className="text-gray-900 text-base font-semibold mb-2">Danh sách vòng đấu</Text>
            {rounds.length === 0 ? (
              <Text className="text-gray-500 text-sm">Level 1 không có danh sách vòng.</Text>
            ) : (
              rounds.map((round) => {
                const isExpanded = expandedRounds.includes(round.id);
                const matchesState = matchesByRound[round.id];

                return (
                  <View key={round.id} className="border border-gray-200 rounded-xl p-3 mb-2">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-2">
                        <Text className="text-gray-900 font-semibold">Vòng {round.round_number}</Text>
                        <Text className="text-gray-600 text-xs mt-1">
                          Cụm: {round.cluster_id ? clusterNamesById[round.cluster_id] || `Cụm #${round.cluster_id}` : "--"}
                        </Text>
                        <Text className="text-gray-600 text-xs mt-1">Số trận: {round.match_count}</Text>
                        {round.start_date && round.end_date ? (
                          <Text className="text-gray-600 text-xs">
                            {formatDate(round.start_date)} - {formatDate(round.end_date)}
                          </Text>
                        ) : null}
                      </View>

                      <Text
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${statusClasses(round.status)}`}
                      >
                        {statusLabel(round.status)}
                      </Text>
                    </View>

                    {detail.level === 2 && (
                      <TouchableOpacity
                        className="mt-3 bg-indigo-600 rounded-xl py-2 items-center"
                        onPress={() => toggleRound(round)}
                      >
                        <Text className="text-white font-semibold">
                          {isExpanded ? "Ẩn danh sách trận" : "Xem danh sách trận"}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {isExpanded && detail.level === 2 && (
                      <View className="mt-3 border-t border-gray-100 pt-3">
                        {matchesState?.loading ? (
                          <ActivityIndicator size="small" color="#4f46e5" />
                        ) : !matchesState?.loaded ? (
                          <Text className="text-gray-500 text-sm">Chưa tải được danh sách trận.</Text>
                        ) : matchesState.data.length === 0 ? (
                          <Text className="text-gray-500 text-sm">Chưa có trận đấu trong vòng này.</Text>
                        ) : (
                          matchesState.data.map((match) => (
                            <View
                              key={match.id}
                              className="border border-gray-200 rounded-lg p-3 mb-2"
                            >
                              {(!match.team_a_name || !match.team_b_name) && (
                                <View className="mb-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
                                  <Text className="text-amber-800 text-xs font-semibold mb-2">
                                    Chưa đủ tên đội, vui lòng nhập nhanh:
                                  </Text>
                                  <TextInput
                                    className="border border-amber-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
                                    placeholder="Tên đội A"
                                    value={editingByMatch[match.id]?.team_a_name ?? match.team_a_name ?? ""}
                                    onChangeText={(text) => updateMatchEdit(match.id, "team_a_name", text)}
                                  />
                                  <TextInput
                                    className="border border-amber-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white mt-2"
                                    placeholder="Tên đội B"
                                    value={editingByMatch[match.id]?.team_b_name ?? match.team_b_name ?? ""}
                                    onChangeText={(text) => updateMatchEdit(match.id, "team_b_name", text)}
                                  />
                                  <TouchableOpacity
                                    className={`mt-2 rounded-lg py-2 items-center ${
                                      isSavingMatch(match.id) ? "bg-gray-300" : "bg-amber-600"
                                    }`}
                                    onPress={() => handleSaveMatchTeams(round.id, match)}
                                    disabled={isSavingMatch(match.id)}
                                  >
                                    <Text className="text-white font-semibold text-xs">
                                      {isSavingMatch(match.id) ? "Đang lưu..." : "Lưu tên đội"}
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              )}

                              <Text className="text-gray-900 font-medium">
                                {match.team_a_name || "TBD"} vs {match.team_b_name || "TBD"}
                              </Text>
                              <Text className="text-gray-600 text-xs mt-1">
                                {formatDate(match.booking_date)} | {formatTime(match.start_time)} - {formatTime(match.end_time)}
                              </Text>
                              <Text className="text-gray-600 text-xs">
                                Sân: {match.field_description || match.field_name || "--"}
                              </Text>
                              <Text className="text-gray-600 text-xs mt-1">
                                Trạng thái: {statusLabel(match.status)}
                              </Text>
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
