import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import { useNavigation } from "@react-navigation/native";
import { router } from "expo-router";
import HeaderUser from "@/component/HeaderUser";
import { TournamentFrequency, TournamentSportType } from "@/src/types/tournament.types";
import tournamentDraftService from "@/src/services/tournament-draft.service";
import { goBackOrReplace } from "@/src/utils/navigation.helper";

const SPORTS: Array<{ key: TournamentSportType; label: string; icon: string }> = [
  { key: "football", label: "Bóng đá", icon: "⚽" },
  { key: "badminton", label: "Cầu lông", icon: "🏸" },
  { key: "tennis", label: "Quần vợt", icon: "🎾" },
  { key: "pickleball", label: "Pickleball", icon: "🏓" },
  { key: "basketball", label: "Bóng rổ", icon: "🏀" },
];

const todayISO = (() => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
})();

const formatDate = (iso: string) => {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};

export default function TournamentCreateScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState("");
  const [sportType, setSportType] = useState<TournamentSportType>("football");
  const [frequency, setFrequency] = useState<TournamentFrequency>("custom");
  const [startDate, setStartDate] = useState(todayISO);
  const [endDate, setEndDate] = useState(todayISO);
  const [dateModalTarget, setDateModalTarget] = useState<"start" | "end" | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const isRepeatMode = frequency !== "custom";

  const canContinue = useMemo(() => {
    if (!name.trim()) return false;
    if (!isRepeatMode) return true;
    return !!startDate && !!endDate && endDate >= startDate;
  }, [name, isRepeatMode, startDate, endDate]);

  useEffect(() => {
    const initNew = async () => {
      try {
        // Clear any previous draft when starting a new create flow
        await tournamentDraftService.resetDraft();
      } catch {
        // ignore
      }
    };

    initNew();
  }, []);

  const handleContinue = async () => {
    if (!canContinue) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập đủ thông tin bắt buộc.");
      return;
    }

    const existing = await tournamentDraftService.getDraft();

    await tournamentDraftService.patchDraft({
      name: name.trim(),
      sportType,
      frequency,
      startDate: isRepeatMode ? startDate : undefined,
      endDate: isRepeatMode ? endDate : undefined,
      selectedWeekdays: [],
      selectedFields: [],
      selectedSlots: [],
      scheduleItems: existing.scheduleItems || [],
    });

    router.push("/(tabs)/tournament/venue" as never);
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <HeaderUser
        title="Tạo giải đấu"
        subtitle="Bước 1/4: Thông tin cơ bản"
        showBackButton
        onBackPress={() => goBackOrReplace(navigation, "/(tabs)/tournament")}
      />

      <View className="px-4 pt-2">
        <TouchableOpacity
          onPress={() => setShowHelpModal(true)}
          className="self-end w-8 h-8 rounded-full border border-indigo-300 items-center justify-center"
        >
          <Text className="text-indigo-700 font-bold">?</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-4 pt-4">
        <Text className="text-sm text-gray-500 mb-1">Tên giải đấu</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="VD: Giải nội bộ đội A"
          placeholderTextColor="#9ca3af"
          style={{ color: "#111827" }}
          className="border border-gray-300 rounded-xl px-4 py-3 text-base mb-4"
        />

        <Text className="text-sm text-gray-500 mb-2">Môn thể thao</Text>
        <View className="flex-row flex-wrap mb-4">
          {SPORTS.map((item) => {
            const active = item.key === sportType;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setSportType(item.key)}
                className={`mr-2 mb-2 px-3 py-2 rounded-full border ${
                  active ? "border-indigo-600 bg-indigo-50" : "border-gray-300"
                }`}
              >
                <Text className={active ? "text-indigo-700 font-semibold" : "text-gray-700"}>
                  {item.icon} {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text className="text-sm text-gray-500 mb-2">Chế độ lập lịch</Text>
        <View className="space-y-2 mb-3">
          <TouchableOpacity
            onPress={() => setFrequency("custom")}
            className={`border rounded-xl p-3 mb-2 ${
              frequency === "custom" ? "border-emerald-600 bg-emerald-50" : "border-gray-300"
            }`}
          >
            <Text className={frequency === "custom" ? "text-emerald-700 font-semibold" : "text-gray-800 font-medium"}>
              Theo ngày cụ thể
            </Text>
            <Text className="text-xs text-gray-500 mt-1">
              Chọn ngày, sân, giờ cụ thể rồi bấm + để thêm từng lịch.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (frequency === "custom") {
                setFrequency("weekly");
              }
            }}
            className={`border rounded-xl p-3 mb-2 ${
              frequency !== "custom" ? "border-indigo-600 bg-indigo-50" : "border-gray-300"
            }`}
          >
            <Text className={frequency !== "custom" ? "text-indigo-700 font-semibold" : "text-gray-800 font-medium"}>
              Lặp lịch
            </Text>
            <Text className="text-xs text-gray-500 mt-1">
              Chọn 1 lịch mẫu, sau đó chọn kiểu lặp (hàng ngày/hàng tuần) ở bước tiếp theo.
            </Text>

            {frequency !== "custom" && (
              <View className="flex-row flex-wrap mt-2">
                <TouchableOpacity
                  onPress={() => setFrequency("daily")}
                  className={`mr-2 mb-2 px-3 py-2 rounded-full border ${
                    frequency === "daily"
                      ? "border-indigo-600 bg-indigo-100"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  <Text
                    className={
                      frequency === "daily"
                        ? "text-indigo-800 text-xs font-semibold"
                        : "text-gray-700 text-xs"
                    }
                  >
                    Hàng ngày
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setFrequency("weekdays")}
                  className={`mr-2 mb-2 px-3 py-2 rounded-full border ${
                    frequency === "weekdays"
                      ? "border-indigo-600 bg-indigo-100"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  <Text
                    className={
                      frequency === "weekdays"
                        ? "text-indigo-800 text-xs font-semibold"
                        : "text-gray-700 text-xs"
                    }
                  >
                    Thứ 2 - Thứ 6
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setFrequency("weekly")}
                  className={`mr-2 mb-2 px-3 py-2 rounded-full border ${
                    frequency === "weekly"
                      ? "border-indigo-600 bg-indigo-100"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  <Text
                    className={
                      frequency === "weekly"
                        ? "text-indigo-800 text-xs font-semibold"
                        : "text-gray-700 text-xs"
                    }
                  >
                    Hàng tuần
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {isRepeatMode && (
          <View className="border border-indigo-200 bg-indigo-50 rounded-xl p-3 mb-3">
            <Text className="text-indigo-800 font-semibold text-sm">Khoảng áp dụng lặp</Text>
            <View className="flex-row mt-2">
              <TouchableOpacity
                className="flex-1 border border-indigo-200 bg-white rounded-xl p-3 mr-2"
                onPress={() => setDateModalTarget("start")}
              >
                <Text className="text-xs text-gray-500">Ngày bắt đầu</Text>
                <Text className="text-base font-semibold text-gray-800 mt-1">{formatDate(startDate)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 border border-indigo-200 bg-white rounded-xl p-3 ml-2"
                onPress={() => setDateModalTarget("end")}
              >
                <Text className="text-xs text-gray-500">Ngày kết thúc</Text>
                <Text className="text-base font-semibold text-gray-800 mt-1">{formatDate(endDate)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View className="mt-auto mb-6">
          <TouchableOpacity
            onPress={handleContinue}
            disabled={!canContinue}
            className={`rounded-xl py-3 items-center ${canContinue ? "bg-indigo-600" : "bg-gray-300"}`}
          >
            <Text className="text-white font-semibold text-base">Tiếp tục chọn lịch</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={!!dateModalTarget} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-2xl p-4">
            <Text className="text-base font-semibold mb-3">
              {dateModalTarget === "start" ? "Chọn ngày bắt đầu" : "Chọn ngày kết thúc"}
            </Text>
            <Calendar
              minDate={todayISO}
              markedDates={{
                [startDate]: { selected: true, selectedColor: "#4f46e5" },
                [endDate]: { selected: true, selectedColor: "#059669" },
              }}
              onDayPress={(day) => {
                if (dateModalTarget === "start") {
                  setStartDate(day.dateString);
                  if (day.dateString > endDate) {
                    setEndDate(day.dateString);
                  }
                } else {
                  if (day.dateString < startDate) {
                    Alert.alert("Ngày chưa hợp lệ", "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
                    return;
                  }
                  setEndDate(day.dateString);
                }
                setDateModalTarget(null);
              }}
            />
            <TouchableOpacity
              onPress={() => setDateModalTarget(null)}
              className="mt-3 border border-gray-300 rounded-xl py-3 items-center"
            >
              <Text className="text-gray-700 font-medium">Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showHelpModal} transparent animationType="fade">
        <View className="flex-1 bg-black/40 justify-center px-5">
          <View className="bg-white rounded-2xl p-4">
            <Text className="text-gray-900 text-lg font-semibold">Hướng dẫn bước 1</Text>
            <Text className="text-gray-700 text-sm mt-2">1) Nhập tên giải đấu.</Text>
            <Text className="text-gray-700 text-sm mt-1">2) Chọn môn thể thao.</Text>
            <Text className="text-gray-700 text-sm mt-1">3) Chọn kiểu lập lịch: theo ngày cụ thể hoặc lặp.</Text>
            <Text className="text-gray-700 text-sm mt-1">4) Nếu lặp, chọn ngày bắt đầu và kết thúc.</Text>
            <TouchableOpacity
              onPress={() => setShowHelpModal(false)}
              className="mt-4 border border-gray-300 rounded-xl py-3 items-center"
            >
              <Text className="text-gray-700 font-medium">Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
