import { useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { router, useFocusEffect } from "expo-router";
import HeaderUser from "@/component/HeaderUser";
import tournamentDraftService from "@/src/services/tournament-draft.service";
import {
  TournamentDraft,
  TournamentFrequency,
  TournamentScheduleItem,
} from "@/src/types/tournament.types";
import { goBackOrReplace } from "@/src/utils/navigation.helper";

const DAY_OPTIONS = [
  { key: 1, label: "T2" },
  { key: 2, label: "T3" },
  { key: 3, label: "T4" },
  { key: 4, label: "T5" },
  { key: 5, label: "T6" },
  { key: 6, label: "T7" },
  { key: 0, label: "CN" },
];

const formatDate = (value: string) => {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const formatTime = (value: string) => value.slice(0, 5);

const parseDate = (value: string) => new Date(`${value}T00:00:00`);

const defaultDaysByFrequency = (frequency: TournamentFrequency): number[] => {
  if (frequency === "daily") return [0, 1, 2, 3, 4, 5, 6];
  if (frequency === "weekdays") return [1, 2, 3, 4, 5];
  return [];
};

const generateRepeatDates = (
  startDate: string,
  endDate: string,
  frequency: TournamentFrequency,
  selectedDays: number[]
): string[] => {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [];
  }

  const dates: string[] = [];
  const current = new Date(start);

  while (current <= end) {
    const weekday = current.getDay();
    if (frequency === "daily") {
      dates.push(current.toISOString().slice(0, 10));
    } else if (frequency === "weekdays") {
      if (weekday >= 1 && weekday <= 5) {
        dates.push(current.toISOString().slice(0, 10));
      }
    } else if (selectedDays.includes(weekday)) {
      dates.push(current.toISOString().slice(0, 10));
    }

    current.setDate(current.getDate() + 1);
  }

  return dates;
};

export default function TournamentScheduleScreen() {
  const navigation = useNavigation();
  const [draft, setDraft] = useState<TournamentDraft>({});
  const [items, setItems] = useState<TournamentScheduleItem[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const current = await tournamentDraftService.getDraft();
        setDraft(current);
        setItems(current.scheduleItems || []);

        if (current.selectedWeekdays?.length) {
          setSelectedDays(current.selectedWeekdays);
        } else if (current.frequency) {
          setSelectedDays(defaultDaysByFrequency(current.frequency));
        } else {
          setSelectedDays([]);
        }
      };

      load();
    }, [])
  );

  const isRepeatMode = draft.frequency && draft.frequency !== "custom";

  const repeatedItems = useMemo(() => {
    if (!isRepeatMode || !draft.startDate || !draft.endDate || !draft.frequency || items.length === 0) {
      return [] as TournamentScheduleItem[];
    }

    const template = items[0];
    const dates = generateRepeatDates(draft.startDate, draft.endDate, draft.frequency, selectedDays);

    return dates.map((date, index) => ({
      id: `repeat-${index}-${date}`,
      bookingDate: date,
      clusterId: template.clusterId,
      clusterName: template.clusterName,
      selectedFields: template.selectedFields,
      selectedSlots: template.selectedSlots,
    }));
  }, [draft.endDate, draft.frequency, draft.startDate, isRepeatMode, items, selectedDays]);

  const currentList = isRepeatMode ? repeatedItems : items;

  const estimatedBookings = currentList.reduce((acc, item) => {
    return acc + item.selectedFields.length * item.selectedSlots.length;
  }, 0);

  const handleRemoveItem = async (itemId: string) => {
    const source = draft.scheduleItems || [];
    const next = source.filter((item) => item.id !== itemId);
    const nextDraft = await tournamentDraftService.patchDraft({ scheduleItems: next });
    setDraft(nextDraft);
    setItems(next);
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day]
    );
  };

  const handleContinue = async () => {
    if (!isRepeatMode) {
      if (items.length === 0) {
        Alert.alert("Chưa có lịch", "Vui lòng thêm ít nhất 1 lịch cụ thể.");
        return;
      }
      router.push("/(tabs)/tournament/review" as never);
      return;
    }

    if (!draft.startDate || !draft.endDate) {
      Alert.alert("Thiếu khoảng ngày", "Vui lòng quay lại bước 1 để chọn khoảng ngày lặp.");
      return;
    }

    if (items.length === 0) {
      Alert.alert("Chưa có lịch mẫu", "Vui lòng quay lại bước trước để lưu 1 lịch mẫu lặp.");
      return;
    }

    if (draft.frequency === "weekly" && selectedDays.length === 0) {
      Alert.alert("Thiếu thứ lặp", "Vui lòng chọn ít nhất một thứ trong tuần.");
      return;
    }

    if (repeatedItems.length === 0) {
      Alert.alert("Lịch trống", "Không tạo được lịch nào trong khoảng ngày đã chọn.");
      return;
    }

    const nextDraft = await tournamentDraftService.patchDraft({
      selectedWeekdays: selectedDays,
      scheduleItems: repeatedItems,
    });

    setDraft(nextDraft);
    setItems(repeatedItems);
    router.push("/(tabs)/tournament/review" as never);
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <HeaderUser
        title={isRepeatMode ? "Thiết lập lặp lịch" : "Danh sách lịch cụ thể"}
        subtitle="Bước 3/4"
        showBackButton
        onBackPress={() => goBackOrReplace(navigation, "/(tabs)/tournament/venue")}
      />

      <ScrollView className="flex-1 px-4 pt-4">
        <View className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3">
          <Text className="text-slate-700 font-semibold">
            {isRepeatMode ? `Dự kiến ${currentList.length} lịch lặp` : `Đã thêm ${items.length} lịch`}
          </Text>
          <Text className="text-slate-600 mt-1 text-sm">Tổng lượt đặt dự kiến: {estimatedBookings}</Text>
        </View>

        <TouchableOpacity
          onPress={() => goBackOrReplace(navigation, "/(tabs)/tournament/venue")}
          className="border border-indigo-300 bg-indigo-50 rounded-xl py-3 items-center mb-3"
        >
          <Text className="text-indigo-700 font-semibold">
            {isRepeatMode ? "Chỉnh lịch mẫu" : "+ Thêm lịch khác"}
          </Text>
        </TouchableOpacity>

        {isRepeatMode && (
          <View className="border border-indigo-200 bg-indigo-50 rounded-xl p-3 mb-3">
            <Text className="text-indigo-800 font-semibold">Kiểu lặp</Text>
            <Text className="text-indigo-700 text-xs mt-1">
              {draft.frequency === "daily"
                ? "Hàng ngày"
                : draft.frequency === "weekdays"
                ? "Thứ 2 - Thứ 6"
                : "Hàng tuần"}
            </Text>
            <Text className="text-indigo-700 text-xs mt-1">
              Khoảng: {draft.startDate ? formatDate(draft.startDate) : "Chưa rõ"} - {draft.endDate ? formatDate(draft.endDate) : "Chưa rõ"}
            </Text>

            {draft.frequency === "weekly" && (
              <View className="flex-row flex-wrap mt-2">
                {DAY_OPTIONS.map((day) => {
                  const active = selectedDays.includes(day.key);
                  return (
                    <TouchableOpacity
                      key={day.key}
                      onPress={() => toggleDay(day.key)}
                      className={`mr-2 mb-2 px-3 py-2 rounded-full border ${
                        active ? "border-indigo-600 bg-indigo-100" : "border-gray-300 bg-white"
                      }`}
                    >
                      <Text className={active ? "text-indigo-800 font-semibold" : "text-gray-700"}>
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {currentList.length === 0 ? (
          <View className="border border-amber-200 bg-amber-50 rounded-xl p-3">
            <Text className="text-amber-800 font-medium">Chưa có lịch nào</Text>
            <Text className="text-amber-700 text-xs mt-1">
              Quay lại bước trước để chọn ngày, sân và khung giờ rồi lưu lịch.
            </Text>
          </View>
        ) : (
          currentList.slice(0, 30).map((item) => (
            <View key={item.id} className="border border-gray-200 rounded-xl p-3 mb-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-gray-900 font-semibold">{formatDate(item.bookingDate)}</Text>
                {!isRepeatMode && (
                  <TouchableOpacity onPress={() => handleRemoveItem(item.id)}>
                    <Text className="text-red-500 font-semibold">Xóa</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text className="text-gray-600 text-sm mt-1">{item.clusterName}</Text>
              <Text className="text-gray-500 text-xs mt-1">
                {item.selectedFields.length} sân • {item.selectedSlots.length} khung giờ
              </Text>
              <Text className="text-gray-700 text-xs mt-2">
                Sân: {item.selectedFields.map((field) => `Sân ${field.fieldId} (${field.fieldSize})`).join(", ")}
              </Text>
              <Text className="text-gray-700 text-xs mt-1">
                Giờ: {item.selectedSlots
                  .map((slot) => `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`)
                  .join(", ")}
              </Text>
            </View>
          ))
        )}

        <View className="h-20" />
      </ScrollView>

      <View className="px-4 pb-6 pt-2 border-t border-gray-100">
        <TouchableOpacity
          onPress={handleContinue}
          disabled={currentList.length === 0}
          className={`rounded-xl py-3 items-center ${currentList.length > 0 ? "bg-indigo-600" : "bg-gray-300"}`}
        >
          <Text className="text-white font-semibold text-base">Xem lại và lưu</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
