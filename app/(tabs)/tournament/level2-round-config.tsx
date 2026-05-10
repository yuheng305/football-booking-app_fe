import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { router, useFocusEffect } from "expo-router";
import { Calendar } from "react-native-calendars";
import HeaderUser from "@/component/HeaderUser";
import { clusterService } from "@/src/services/cluster.service";
import tournamentService from "@/src/services/tournament.service";
import tournamentLevel2DraftService from "@/src/services/tournament-level2-draft.service";
import type { Cluster } from "@/src/types/cluster.types";
import type {
  CreateLevel2TournamentPayload,
  Level2RoundConfigInput,
  Level2SetupDraft,
  TournamentSportType,
} from "@/src/types/tournament.types";
import {
  bracketRoundCount,
  byeCountRound1,
  matchCountForBracketRound,
} from "@/src/utils/bracket";
import { goBackOrReplace } from "@/src/utils/navigation.helper";

const SPORT_TYPE_ID_MAP: Record<TournamentSportType, number> = {
  football: 1,
  badminton: 2,
  tennis: 3,
  pickleball: 4,
  basketball: 5,
};

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);
const todayISO = toIsoDate(new Date());

const normalizeTime = (value: string): string => {
  const raw = value.trim().replace(/[^\d:]/g, "");
  const [hourRaw = "", minuteRaw = ""] = raw.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "";
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return "";

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
};

const displayTime = (value: string) => value.slice(0, 5);

const parseTimeToMinutes = (value: string): number => {
  const normalized = normalizeTime(value);
  if (!normalized) return -1;
  const [hour, minute] = normalized.split(":");
  return Number(hour) * 60 + Number(minute);
};

const TIME_OPTIONS: string[] = Array.from({ length: 48 }).map((_, index) => {
  const totalMinutes = index * 30;
  const hour = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minute = String(totalMinutes % 60).padStart(2, "0");
  return `${hour}:${minute}:00`;
});

type RoundForm = {
  round_number: number;
  match_count: number;
  start_date: string;
  end_date: string;
  daily_start_time: string;
  daily_end_time: string;
  match_duration_mins: string;
};

const createBracketRoundForms = (teamCount: number): RoundForm[] => {
  const k = bracketRoundCount(teamCount);
  const rounds: RoundForm[] = [];

  for (let i = 1; i <= k; i += 1) {
    rounds.push({
      round_number: i,
      match_count: matchCountForBracketRound(teamCount, i),
      start_date: todayISO,
      end_date: todayISO,
      daily_start_time: "06:00:00",
      daily_end_time: "10:00:00",
      match_duration_mins: "90",
    });
  }

  return rounds;
};

const clusterAddressLine = (c: Cluster) =>
  [c.street, c.district, c.city].filter(Boolean).join(", ");

export default function TournamentLevel2RoundConfigScreen() {
  const navigation = useNavigation();
  const [setup, setSetup] = useState<Level2SetupDraft | null>(null);
  const [rounds, setRounds] = useState<RoundForm[]>([]);
  const setupSigRef = useRef("");

  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loadingClusters, setLoadingClusters] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showClusterPicker, setShowClusterPicker] = useState(false);
  const [sharedClusterId, setSharedClusterId] = useState<number | null>(null);
  const [sharedClusterName, setSharedClusterName] = useState("");
  const [datePicker, setDatePicker] = useState<{
    roundIndex: number;
    key: "start_date" | "end_date";
  } | null>(null);
  const [timePicker, setTimePicker] = useState<{
    roundIndex: number;
    key: "daily_start_time" | "daily_end_time";
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        const draft = await tournamentLevel2DraftService.getSetupDraft();
        if (!active) return;

        if (!draft) {
          Alert.alert("Thiếu dữ liệu", "Vui lòng nhập thông tin giải và danh sách đội trước.", [
            { text: "Đồng ý", onPress: () => router.replace("/(tabs)/tournament/level2-create") },
          ]);
          return;
        }

        const sig = `${draft.size}:${draft.teams.join("|")}`;
        if (sig !== setupSigRef.current) {
          setupSigRef.current = sig;
          setRounds(createBracketRoundForms(draft.size));
          setSharedClusterId(null);
          setSharedClusterName("");
        }

        setSetup(draft);
      };

      load();

      return () => {
        active = false;
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      const sportType = setup?.sport_type;
      if (!sportType) return;

      let cancelled = false;

      const loadClusters = async () => {
        try {
          setLoadingClusters(true);
          const result = await clusterService.searchClusters({
            sport_type_id: SPORT_TYPE_ID_MAP[sportType],
            limit: 40,
            offset: 0,
          });
          if (!cancelled) {
            setClusters(
              result.clusters.filter((cluster) => cluster.status === "active" && cluster.is_accepted)
            );
          }
        } catch {
          if (!cancelled) setClusters([]);
        } finally {
          if (!cancelled) setLoadingClusters(false);
        }
      };

      loadClusters();

      return () => {
        cancelled = true;
      };
    }, [setup?.sport_type])
  );

  const canSubmit = useMemo(() => {
    if (!setup) return false;

    if (!sharedClusterId || sharedClusterId <= 0) return false;

    return rounds.every((round) => {
      if (!round.start_date || !round.end_date || round.end_date < round.start_date) return false;

      const startTime = normalizeTime(round.daily_start_time);
      const endTime = normalizeTime(round.daily_end_time);
      if (!startTime || !endTime) return false;

      const duration = Number(round.match_duration_mins);
      if (!Number.isFinite(duration) || duration < 30) return false;

      const windowMinutes =
        parseTimeToMinutes(round.daily_end_time) - parseTimeToMinutes(round.daily_start_time);
      if (!Number.isFinite(windowMinutes) || windowMinutes < duration) return false;

      return true;
    });
  }, [setup, rounds, sharedClusterId]);

  const updateRound = (index: number, patch: Partial<RoundForm>) => {
    setRounds((prev) => prev.map((round, i) => (i === index ? { ...round, ...patch } : round)));
  };

  const getWindowMinutes = (round: RoundForm) => {
    return parseTimeToMinutes(round.daily_end_time) - parseTimeToMinutes(round.daily_start_time);
  };

  const handleCreateTournamentByRounds = async () => {
    if (!setup || !canSubmit) {
      Alert.alert("Thiếu thông tin", "Vui lòng chọn nơi tổ chức và điền đầy đủ ngày giờ cho từng vòng.");
      return;
    }

    const payloadRounds: Level2RoundConfigInput[] = rounds.map((round) => ({
      round_number: round.round_number,
      cluster_id: Number(sharedClusterId),
      start_date: round.start_date,
      end_date: round.end_date,
      daily_start_time: normalizeTime(round.daily_start_time),
      daily_end_time: normalizeTime(round.daily_end_time),
      match_duration_mins: Number(round.match_duration_mins),
    }));

    const payload: CreateLevel2TournamentPayload = {
      name: setup.name.trim(),
      sport_type: setup.sport_type,
      size: setup.size,
      teams: setup.teams.map((t) => t.trim()),
      entry_fee: 0,
      rounds: payloadRounds,
    };

    try {
      setCreating(true);
      const created = await tournamentService.createTournamentLevel2(payload);
      await tournamentLevel2DraftService.clearSetupDraft();
      setupSigRef.current = "";
      await tournamentLevel2DraftService.setCreatedTournament({
        tournament_id: created.id,
        tournament_name: created.name,
        rounds: created.rounds,
      });
      router.push("/(tabs)/tournament/level2-rounds" as never);
    } catch (error: any) {
      Alert.alert("Không thể tạo giải", error?.message || "Vui lòng kiểm tra lại cấu hình.");
    } finally {
      setCreating(false);
    }
  };

  const teamCount = setup?.size ?? 0;
  const totalRounds = bracketRoundCount(teamCount);
  const byeR1 = setup ? byeCountRound1(setup.size) : 0;
  const playR1 = setup ? matchCountForBracketRound(setup.size, 1) : 0;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <HeaderUser
        title="Cấu hình các vòng"
        subtitle="Địa điểm và khung thời gian"
        showBackButton
        onBackPress={() => goBackOrReplace(navigation, "/(tabs)/tournament/level2-create")}
      />

      {!setup ? (
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <>
          <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 24 }}>
            <View className="border border-indigo-200 bg-indigo-50 rounded-2xl p-3 mb-4">
              <Text className="text-indigo-900 font-semibold">{setup.name}</Text>
              <Text className="text-indigo-800 text-xs mt-1">
                {setup.size} đội · {totalRounds} vòng loại trực tiếp
                {playR1 > 0 ? (
                  <>
                    {" "}
                    · Vòng 1: {playR1} trận
                    {byeR1 > 0 ? `, ${byeR1} đội chờ vòng sau` : ""}
                  </>
                ) : null}
              </Text>
            </View>

            <Text className="text-sm text-gray-500 mb-1">Nơi tổ chức</Text>
            <TouchableOpacity
              className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
              onPress={() => setShowClusterPicker(true)}
            >
              <Text className={sharedClusterName ? "text-gray-800" : "text-gray-400"}>
                {sharedClusterName || "Chọn cụm sân"}
              </Text>
            </TouchableOpacity>

            {rounds.map((round, index) => {
              const windowMinutes = getWindowMinutes(round);
              const duration = Number(round.match_duration_mins || "0");
              const isWindowValid = windowMinutes >= duration && windowMinutes > 0;

              return (
                <View key={round.round_number} className="border border-gray-200 rounded-2xl p-4 mb-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-gray-900 font-semibold">Vòng {round.round_number}</Text>
                    <Text className="text-xs text-gray-500">{round.match_count} trận</Text>
                  </View>

                  <View className="flex-row">
                    <View className="flex-1 mr-2">
                      <Text className="text-sm text-gray-500 mb-1">Từ ngày</Text>
                      <TouchableOpacity
                        onPress={() => setDatePicker({ roundIndex: index, key: "start_date" })}
                        className="border border-gray-300 rounded-xl px-4 py-3"
                      >
                        <Text className="text-gray-800">{round.start_date || todayISO}</Text>
                      </TouchableOpacity>
                    </View>

                    <View className="flex-1 ml-2">
                      <Text className="text-sm text-gray-500 mb-1">Đến ngày</Text>
                      <TouchableOpacity
                        onPress={() => setDatePicker({ roundIndex: index, key: "end_date" })}
                        className="border border-gray-300 rounded-xl px-4 py-3"
                      >
                        <Text className="text-gray-800">{round.end_date || todayISO}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="flex-row mt-3">
                    <View className="flex-1 mr-2">
                      <Text className="text-sm text-gray-500 mb-1">Giờ bắt đầu</Text>
                      <TouchableOpacity
                        className="border border-gray-300 rounded-xl px-4 py-3"
                        onPress={() =>
                          setTimePicker({
                            roundIndex: index,
                            key: "daily_start_time",
                          })
                        }
                      >
                        <Text className="text-xs text-gray-500">Nhấn để chọn</Text>
                        <Text className="text-gray-800 font-semibold mt-1">
                          {displayTime(round.daily_start_time || "")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View className="flex-1 ml-2">
                      <Text className="text-sm text-gray-500 mb-1">Giờ kết thúc</Text>
                      <TouchableOpacity
                        className="border border-gray-300 rounded-xl px-4 py-3"
                        onPress={() =>
                          setTimePicker({
                            roundIndex: index,
                            key: "daily_end_time",
                          })
                        }
                      >
                        <Text className="text-xs text-gray-500">Nhấn để chọn</Text>
                        <Text className="text-gray-800 font-semibold mt-1">
                          {displayTime(round.daily_end_time || "")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text className="text-sm text-gray-500 mt-3 mb-1">Thời lượng mỗi trận (phút)</Text>
                  <TextInput
                    value={round.match_duration_mins || "90"}
                    onChangeText={(text) =>
                      updateRound(index, {
                        match_duration_mins: text.replace(/[^\d]/g, ""),
                      })
                    }
                    keyboardType="number-pad"
                    className="border border-gray-300 rounded-xl px-4 py-3"
                  />

                  {windowMinutes > 0 ? (
                    <Text className={`text-xs mt-2 ${isWindowValid ? "text-emerald-700" : "text-red-600"}`}>
                      Khung giờ hiện tại: {windowMinutes} phút
                      {!isWindowValid ? " - ngắn hơn thời lượng mỗi trận" : ""}
                    </Text>
                  ) : (
                    <Text className="text-xs mt-2 text-red-600">Giờ kết thúc phải lớn hơn giờ bắt đầu</Text>
                  )}
                </View>
              );
            })}

            <TouchableOpacity
              onPress={handleCreateTournamentByRounds}
              disabled={!canSubmit || creating}
              className={`rounded-xl py-3 items-center mb-2 ${
                !canSubmit || creating ? "bg-gray-300" : "bg-emerald-600"
              }`}
            >
              <Text className="text-white font-semibold">{creating ? "Đang tạo..." : "Tạo giải đấu"}</Text>
            </TouchableOpacity>
            {/* <Text className="text-xs text-gray-500 text-center mb-2">
              Sau khi tạo, hệ thống tự xếp lịch trận. Màn hình kế tiếp chỉ để xem lại tóm tắt giải.
            </Text> */}
          </ScrollView>

          <Modal
            visible={showClusterPicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowClusterPicker(false)}
          >
            <View className="flex-1 bg-black/35 justify-end">
              <View className="bg-white rounded-t-3xl p-4 max-h-[70%]">
                <Text className="text-base font-semibold text-gray-900 mb-3">Chọn cụm sân</Text>
                {loadingClusters ? (
                  <View className="py-8 items-center">
                    <ActivityIndicator size="small" color="#4f46e5" />
                  </View>
                ) : (
                  <ScrollView>
                    {clusters.length === 0 ? (
                      <Text className="text-sm text-gray-500">Không có cụm sân phù hợp.</Text>
                    ) : (
                      clusters.map((cluster) => (
                        <TouchableOpacity
                          key={cluster.id}
                          className="border border-gray-200 rounded-xl p-3 mb-2"
                          onPress={() => {
                            setSharedClusterId(cluster.id);
                            setSharedClusterName(cluster.name);
                            setShowClusterPicker(false);
                          }}
                        >
                          <Text className="text-gray-900 font-medium">{cluster.name}</Text>
                          <Text className="text-xs text-gray-500 mt-1">{clusterAddressLine(cluster)}</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                )}
                <TouchableOpacity
                  className="mt-3 bg-slate-200 rounded-xl py-3 items-center"
                  onPress={() => setShowClusterPicker(false)}
                >
                  <Text className="text-slate-700 font-semibold">Đóng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal
            visible={!!datePicker}
            transparent
            animationType="fade"
            onRequestClose={() => setDatePicker(null)}
          >
            <View className="flex-1 bg-black/30 items-center justify-center px-5">
              <View className="bg-white rounded-2xl p-4 w-full max-w-[360px]">
                <Calendar
                  minDate={todayISO}
                  markedDates={
                    datePicker
                      ? {
                          [rounds[datePicker.roundIndex]?.[datePicker.key] || todayISO]: {
                            selected: true,
                            selectedColor: "#4f46e5",
                          },
                        }
                      : undefined
                  }
                  onDayPress={(day) => {
                    if (!datePicker) return;
                    updateRound(datePicker.roundIndex, {
                      [datePicker.key]: day.dateString,
                    });
                    setDatePicker(null);
                  }}
                />
                <TouchableOpacity
                  className="mt-3 bg-slate-200 rounded-xl py-3 items-center"
                  onPress={() => setDatePicker(null)}
                >
                  <Text className="text-slate-700 font-semibold">Đóng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal
            visible={!!timePicker}
            transparent
            animationType="slide"
            onRequestClose={() => setTimePicker(null)}
          >
            <View className="flex-1 bg-black/35 justify-end">
              <View className="bg-white rounded-t-3xl p-4 max-h-[72%]">
                <Text className="text-base font-semibold text-gray-900 mb-2">
                  {timePicker?.key === "daily_start_time" ? "Chọn giờ bắt đầu" : "Chọn giờ kết thúc"}
                </Text>
                <Text className="text-xs text-gray-500 mb-3">Không cần nhập bàn phím, chỉ cần chạm để chọn.</Text>

                <ScrollView>
                  {TIME_OPTIONS.map((timeValue) => {
                    if (!timePicker) return null;
                    const currentValue = rounds[timePicker.roundIndex]?.[timePicker.key];
                    const active = currentValue === timeValue;
                    return (
                      <TouchableOpacity
                        key={timeValue}
                        className={`border rounded-xl p-3 mb-2 ${
                          active ? "border-indigo-600 bg-indigo-50" : "border-gray-200"
                        }`}
                        onPress={() => {
                          updateRound(timePicker.roundIndex, {
                            [timePicker.key]: timeValue,
                          });
                          setTimePicker(null);
                        }}
                      >
                        <Text className={active ? "text-indigo-700 font-semibold" : "text-gray-800"}>
                          {displayTime(timeValue)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <TouchableOpacity
                  className="mt-2 bg-slate-200 rounded-xl py-3 items-center"
                  onPress={() => setTimePicker(null)}
                >
                  <Text className="text-slate-700 font-semibold">Đóng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}
    </SafeAreaView>
  );
}
