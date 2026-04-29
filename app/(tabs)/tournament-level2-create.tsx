import { useEffect, useMemo, useState } from "react";
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
import { router } from "expo-router";
import { Calendar } from "react-native-calendars";
import HeaderUser from "@/component/HeaderUser";
import { clusterService } from "@/src/services/cluster.service";
import tournamentService from "@/src/services/tournament.service";
import tournamentLevel2DraftService from "@/src/services/tournament-level2-draft.service";
import { Cluster } from "@/src/types/cluster.types";
import {
  CreateLevel2TournamentPayload,
  Level2RoundConfigInput,
  TournamentSportType,
} from "@/src/types/tournament.types";

const SPORTS: Array<{ key: TournamentSportType; label: string }> = [
  { key: "football", label: "Bóng đá" },
  { key: "badminton", label: "Cầu lông" },
  { key: "tennis", label: "Tennis" },
  { key: "pickleball", label: "Pickleball" },
  { key: "basketball", label: "Bóng rổ" },
];

const SIZE_OPTIONS = [8, 16, 32, 64];

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
const toVnd = (value: number) => `${value.toLocaleString("vi-VN")} VND`;

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
  cluster_id: number | null;
  cluster_name: string;
  start_date: string;
  end_date: string;
  daily_start_time: string;
  daily_end_time: string;
  match_duration_mins: string;
};

const createRoundsForm = (size: number): RoundForm[] => {
  const totalRounds = Math.log2(size);
  const rounds: RoundForm[] = [];

  for (let i = 1; i <= totalRounds; i += 1) {
    const matchCount = size / Math.pow(2, i);
    rounds.push({
      round_number: i,
      match_count: matchCount,
      cluster_id: null,
      cluster_name: "",
      start_date: todayISO,
      end_date: todayISO,
      daily_start_time: "06:00:00",
      daily_end_time: "10:00:00",
      match_duration_mins: "90",
    });
  }

  return rounds;
};

export default function TournamentLevel2CreateScreen() {
  const [name, setName] = useState("");
  const [sportType, setSportType] = useState<TournamentSportType>("football");
  const [size, setSize] = useState<number>(8);
  const [entryFee, setEntryFee] = useState("100000");
  const [rounds, setRounds] = useState<RoundForm[]>(createRoundsForm(8));
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loadingClusters, setLoadingClusters] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showClusterPicker, setShowClusterPicker] = useState(false);
  const [clusterRoundIndex, setClusterRoundIndex] = useState<number | null>(null);
  const [datePicker, setDatePicker] = useState<{
    roundIndex: number;
    key: "start_date" | "end_date";
  } | null>(null);
  const [timePicker, setTimePicker] = useState<{
    roundIndex: number;
    key: "daily_start_time" | "daily_end_time";
  } | null>(null);

  useEffect(() => {
    const nextRounds = createRoundsForm(size);
    setRounds((prev) => {
      return nextRounds.map((round, idx) => {
        const existing = prev[idx];
        if (!existing) {
          return round;
        }

        return {
          ...round,
          cluster_id: existing.cluster_id,
          cluster_name: existing.cluster_name,
          start_date: existing.start_date,
          end_date: existing.end_date,
          daily_start_time: existing.daily_start_time,
          daily_end_time: existing.daily_end_time,
          match_duration_mins: existing.match_duration_mins,
        };
      });
    });
  }, [size]);

  useEffect(() => {
    const loadClusters = async () => {
      try {
        setLoadingClusters(true);
        const result = await clusterService.searchClusters({
          sport_type_id: SPORT_TYPE_ID_MAP[sportType],
          limit: 40,
          offset: 0,
        });
        setClusters(
          result.clusters.filter((cluster) => cluster.status === "active" && cluster.is_accepted)
        );
      } catch {
        setClusters([]);
      } finally {
        setLoadingClusters(false);
      }
    };

    loadClusters();
  }, [sportType]);

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false;

    const fee = Number(entryFee);
    if (!Number.isFinite(fee) || fee < 0) return false;

    return rounds.every((round) => {
      if (!round.cluster_id) return false;
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
  }, [entryFee, name, rounds]);

  const updateRound = (index: number, patch: Partial<RoundForm>) => {
    setRounds((prev) => prev.map((round, i) => (i === index ? { ...round, ...patch } : round)));
  };

  const getWindowMinutes = (round: RoundForm) => {
    return parseTimeToMinutes(round.daily_end_time) - parseTimeToMinutes(round.daily_start_time);
  };

  const handleCreateTournamentByRounds = async () => {
    if (!canSubmit) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập đầy đủ thông tin và cấu hình cho tất cả vòng.");
      return;
    }

    const payloadRounds: Level2RoundConfigInput[] = rounds.map((round) => ({
      round_number: round.round_number,
      cluster_id: Number(round.cluster_id),
      start_date: round.start_date,
      end_date: round.end_date,
      daily_start_time: normalizeTime(round.daily_start_time),
      daily_end_time: normalizeTime(round.daily_end_time),
      match_duration_mins: Number(round.match_duration_mins),
    }));

    const payload: CreateLevel2TournamentPayload = {
      name: name.trim(),
      sport_type: sportType,
      size,
      entry_fee: Number(entryFee),
      rounds: payloadRounds,
    };

    try {
      setCreating(true);
      const created = await tournamentService.createTournamentLevel2(payload);
      await tournamentLevel2DraftService.setCreatedTournament({
        tournament_id: created.id,
        tournament_name: created.name,
        rounds: created.rounds,
      });
      router.replace("/(tabs)/tournament-level2-rounds" as never);
    } catch (error: any) {
      Alert.alert("Không thể tạo giải", error?.message || "Vui lòng kiểm tra lại cấu hình.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <HeaderUser
        title="Tạo giải đấu theo vòng"
        subtitle="Bước 1/3: Cấu hình các vòng"
        showBackButton
        onBackPress={() => router.replace("/(tabs)/tournament")}
      />

      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="border border-indigo-200 bg-indigo-50 rounded-2xl p-3 mb-4">
          <Text className="text-indigo-900 font-semibold">Giải đấu loại trực tiếp</Text>
          <Text className="text-indigo-800 text-xs mt-1">
            Mỗi vòng có cấu hình riêng về cụm sân, ngày và khung giờ. Hệ thống sẽ dùng cấu hình đó để gợi ý slot trống.
          </Text>
        </View>

        <Text className="text-sm text-gray-500 mb-1">Tên giải đấu</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="VD: Giải hè 2026"
          className="border border-gray-300 rounded-xl px-4 py-3 text-base mb-3"
        />

        <Text className="text-sm text-gray-500 mb-2">Môn thể thao</Text>
        <View className="flex-row flex-wrap mb-3">
          {SPORTS.map((sport) => {
            const active = sport.key === sportType;
            return (
              <TouchableOpacity
                key={sport.key}
                onPress={() => setSportType(sport.key)}
                className={`mr-2 mb-2 px-3 py-2 rounded-full border ${
                  active ? "border-indigo-600 bg-indigo-50" : "border-gray-300"
                }`}
              >
                <Text className={active ? "text-indigo-700 font-semibold" : "text-gray-700"}>
                  {sport.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text className="text-sm text-gray-500 mb-2">Số đội</Text>
        <View className="flex-row flex-wrap mb-3">
          {SIZE_OPTIONS.map((option) => {
            const active = option === size;
            return (
              <TouchableOpacity
                key={option}
                onPress={() => setSize(option)}
                className={`mr-2 mb-2 px-4 py-2 rounded-xl border ${
                  active ? "border-emerald-600 bg-emerald-50" : "border-gray-300"
                }`}
              >
                <Text className={active ? "text-emerald-700 font-semibold" : "text-gray-700"}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text className="text-sm text-gray-500 mb-1">Phí tham gia (VND)</Text>
        <TextInput
          value={entryFee}
          onChangeText={(text) => setEntryFee(text.replace(/[^\d]/g, ""))}
          keyboardType="number-pad"
          className="border border-gray-300 rounded-xl px-4 py-3 text-base mb-2"
        />
        <Text className="text-xs text-gray-500 mb-4">Ước tính: {toVnd(Number(entryFee || "0"))}</Text>

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

              <Text className="text-sm text-gray-500 mb-1">Cụm sân</Text>
              <TouchableOpacity
                className="border border-gray-300 rounded-xl px-4 py-3 mb-3"
                onPress={() => {
                  setClusterRoundIndex(index);
                  setShowClusterPicker(true);
                }}
              >
                <Text className={round.cluster_name ? "text-gray-800" : "text-gray-400"}>
                  {round.cluster_name || "Chọn cụm sân cho vòng này"}
                </Text>
              </TouchableOpacity>

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
                    <Text className="text-gray-800 font-semibold mt-1">{displayTime(round.daily_start_time || "")}</Text>
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
                    <Text className="text-gray-800 font-semibold mt-1">{displayTime(round.daily_end_time || "")}</Text>
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
                        if (clusterRoundIndex !== null) {
                          updateRound(clusterRoundIndex, {
                            cluster_id: cluster.id,
                            cluster_name: cluster.name,
                          });
                        }
                        setShowClusterPicker(false);
                      }}
                    >
                      <Text className="text-gray-900 font-medium">{cluster.name}</Text>
                      <Text className="text-xs text-gray-500 mt-1">{cluster.address}</Text>
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
    </SafeAreaView>
  );
}
