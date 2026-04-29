import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import HeaderUser from "@/component/HeaderUser";
import tournamentService from "@/src/services/tournament.service";
import tournamentLevel2DraftService from "@/src/services/tournament-level2-draft.service";
import {
  Level2AvailableSlot,
  Level2AvailableSlotsResult,
  Level2FlowDraft,
  Level2ScheduleSlotInput,
  Level2TournamentRound,
} from "@/src/types/tournament.types";

const formatDate = (value: string) => {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const slotKey = (slot: Level2ScheduleSlotInput) =>
  `${slot.field_id}-${slot.date}-${slot.start_time}-${slot.end_time}`;

const toMoney = (value: number) => `${value.toLocaleString("vi-VN")} VND`;

export default function TournamentLevel2SlotsScreen() {
  const params = useLocalSearchParams<{ roundId?: string }>();
  const [draft, setDraft] = useState<Level2FlowDraft>({ rounds: [], selections: [] });
  const [round, setRound] = useState<Level2TournamentRound | null>(null);
  const [available, setAvailable] = useState<Level2AvailableSlotsResult | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Level2ScheduleSlotInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const roundId = Number(params.roundId);

  const loadData = useCallback(async () => {
    if (!roundId || Number.isNaN(roundId)) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const currentDraft = await tournamentLevel2DraftService.getDraft();
      setDraft(currentDraft);

      const matchedRound = currentDraft.rounds.find((item) => item.id === roundId) || null;
      setRound(matchedRound);

      if (!currentDraft.tournament_id || !matchedRound) {
        setAvailable(null);
        return;
      }

      const result = await tournamentService.getLevel2AvailableSlots(currentDraft.tournament_id, roundId);
      setAvailable(result);

      const existing = currentDraft.selections.find((item) => item.round_id === roundId)?.selected_slots || [];
      setSelectedSlots(existing);
    } catch (error: any) {
      Alert.alert("Không tải được slot", error?.message || "Vui lòng thử lại.");
      setAvailable(null);
    } finally {
      setLoading(false);
    }
  }, [roundId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const slotsNeeded = available?.slots_needed || round?.match_count || 0;

  const groupedByDate = useMemo(() => {
    const grouped: Record<string, Level2AvailableSlot[]> = {};
    (available?.available_slots || []).forEach((slot) => {
      if (!grouped[slot.date]) {
        grouped[slot.date] = [];
      }
      grouped[slot.date].push(slot);
    });

    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [available?.available_slots]);

  const toggleSlot = (slot: Level2AvailableSlot) => {
    const normalized: Level2ScheduleSlotInput = {
      field_id: slot.field_id,
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
    };

    const key = slotKey(normalized);
    const existed = selectedSlots.some((item) => slotKey(item) === key);

    if (existed) {
      const next = selectedSlots.filter((item) => slotKey(item) !== key);
      setSelectedSlots(next);
      return;
    }

    if (selectedSlots.length >= slotsNeeded) {
      Alert.alert("Đã đủ số slot", `Bạn chỉ được chọn ${slotsNeeded} slot cho vòng này.`);
      return;
    }

    setSelectedSlots((prev) => [...prev, normalized]);
  };

  const handleConfirmRound = async () => {
    if (!draft.tournament_id || !round) {
      Alert.alert("Thiếu dữ liệu", "Không tìm thấy thông tin vòng đấu.");
      return;
    }

    if (selectedSlots.length !== slotsNeeded) {
      Alert.alert("Chưa đủ slot", `Cần chọn đủ ${slotsNeeded} slot để xác nhận vòng.`);
      return;
    }

    try {
      setSaving(true);
      await tournamentService.scheduleLevel2Round(draft.tournament_id, round.id, {
        selected_slots: selectedSlots,
      });
      await tournamentLevel2DraftService.setRoundSelection(round.id, selectedSlots);
      await tournamentLevel2DraftService.markRoundScheduled(round.id);
      Alert.alert("Thành công", `Đã xếp lịch cho vòng ${round.round_number}.`);
      router.replace("/(tabs)/tournament-level2-rounds" as never);
    } catch (error: any) {
      const message = error?.message || "Không thể xác nhận vòng.";
      Alert.alert("Xếp lịch thất bại", message);

      if (message.includes("SLOT_CONFLICT") || message.includes("conflict")) {
        await loadData();
      }
    } finally {
      setSaving(false);
    }
  };

  const renderSelectionProgress = () => {
    const totalBars = Math.max(slotsNeeded, 1);
    return (
      <View className="flex-row mt-2">
        {Array.from({ length: totalBars }).map((_, index) => {
          const active = index < selectedSlots.length;
          return (
            <View
              key={index}
              className={`h-2 flex-1 rounded-full mr-1 ${active ? "bg-emerald-500" : "bg-gray-200"}`}
            />
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <HeaderUser
        title={round ? `Vòng ${round.round_number}` : "Chọn slot"}
        subtitle="Bước 3/3: Chọn đủ slot"
        showBackButton
        onBackPress={() => router.replace("/(tabs)/tournament-level2-rounds")}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : !round || !available ? (
        <View className="flex-1 px-4 pt-4">
          <View className="border border-amber-200 bg-amber-50 rounded-xl p-3">
            <Text className="text-amber-800">Không tìm thấy dữ liệu vòng đấu.</Text>
            <TouchableOpacity
              className="mt-3 bg-amber-500 rounded-xl py-3 items-center"
              onPress={() => router.replace("/(tabs)/tournament-level2-rounds")}
            >
              <Text className="text-white font-semibold">Quay lại danh sách vòng</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 24 }}>
            <View className="border border-indigo-200 bg-indigo-50 rounded-xl p-3 mb-3">
              <Text className="text-indigo-900 font-semibold">
                Cần chọn {slotsNeeded} slot cho vòng {available.round_number}
              </Text>
              <Text className="text-indigo-700 text-xs mt-1">
                Khoảng ngày: {formatDate(round.start_date)} - {formatDate(round.end_date)}
              </Text>
              <Text className="text-indigo-700 text-xs">
                Khung giờ mỗi ngày: {round.daily_start_time.slice(0, 5)} - {round.daily_end_time.slice(0, 5)} | {round.match_duration_mins} phút
              </Text>
              <Text className="text-indigo-700 text-xs mt-2">
                Đã chọn: {selectedSlots.length}/{slotsNeeded}
              </Text>
              {renderSelectionProgress()}
            </View>

            <TouchableOpacity
              className="border border-indigo-300 bg-indigo-50 rounded-xl py-2 items-center mb-3"
              onPress={loadData}
            >
              <Text className="text-indigo-700 font-semibold">Tải lại danh sách slot</Text>
            </TouchableOpacity>

            {groupedByDate.length === 0 ? (
              <View className="border border-amber-200 bg-amber-50 rounded-xl p-3">
                <Text className="text-amber-800">Không có slot trống cho vòng này.</Text>
              </View>
            ) : (
              groupedByDate.map(([date, slots]) => (
                <View key={date} className="mb-4">
                  <Text className="text-gray-900 font-semibold mb-2">Ngày {formatDate(date)}</Text>
                  {slots.map((slot, index) => {
                    const normalized: Level2ScheduleSlotInput = {
                      field_id: slot.field_id,
                      date: slot.date,
                      start_time: slot.start_time,
                      end_time: slot.end_time,
                    };

                    const picked = selectedSlots.some((item) => slotKey(item) === slotKey(normalized));
                    return (
                      <TouchableOpacity
                        key={`${slot.field_id}-${slot.date}-${slot.start_time}-${index}`}
                        className={`border rounded-xl p-3 mb-2 ${
                          picked ? "border-emerald-500 bg-emerald-50" : "border-gray-200 bg-white"
                        }`}
                        onPress={() => toggleSlot(slot)}
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1 pr-3">
                            <Text className="text-gray-900 font-medium">{slot.field_name}</Text>
                            <Text className="text-xs text-gray-600 mt-1">
                              {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                            </Text>
                            <Text className="text-xs text-gray-600">Giá ước tính: {toMoney(slot.estimated_price)}</Text>
                          </View>
                          <View
                            className={`w-7 h-7 rounded-full items-center justify-center ${
                              picked ? "bg-emerald-600" : "bg-gray-200"
                            }`}
                          >
                            <Text className={picked ? "text-white font-semibold" : "text-gray-600 font-semibold"}>
                              {picked ? "OK" : "+"}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))
            )}
          </ScrollView>

          <View className="px-4 pb-6 pt-2 border-t border-gray-100">
            <TouchableOpacity
              onPress={handleConfirmRound}
              disabled={saving || selectedSlots.length !== slotsNeeded}
              className={`rounded-xl py-3 items-center ${
                saving || selectedSlots.length !== slotsNeeded ? "bg-gray-300" : "bg-emerald-600"
              }`}
            >
              <Text className="text-white font-semibold">{saving ? "Đang gửi..." : `Xác nhận vòng ${round.round_number}`}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
