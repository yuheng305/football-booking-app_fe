import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import HeaderUser from "@/component/HeaderUser";
import { goBackOrReplace } from "@/src/utils/navigation.helper";
import tournamentDraftService from "@/src/services/tournament-draft.service";
import { InternalTournamentPlan, TournamentDraft } from "@/src/types/tournament.types";
import { toVietnameseSportType } from "@/src/utils/sport-type.util";

const frequencyLabel: Record<string, string> = {
  daily: "Hằng ngày",
  weekly: "Hằng tuần",
  weekdays: "Thứ 2 – Thứ 6",
  custom: "Theo ngày cụ thể",
};

const formatDate = (value?: string) => {
  if (!value) return "--";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const formatTime = (value: string) => value.slice(0, 5);

export default function TournamentReviewScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ planId?: string; readonly?: string }>();
  const isReadOnly = params.readonly === "1";
  const [draft, setDraft] = useState<TournamentDraft>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (isReadOnly && params.planId) {
        const allPlans = await tournamentDraftService.listPlans();
        const selectedPlan = allPlans.find((item) => item.id === params.planId);

        if (!selectedPlan) {
          Alert.alert("Thông báo", "Không tìm thấy kế hoạch này.");
          router.back();
          return;
        }

        const mappedDraft: TournamentDraft = mapPlanToDraft(selectedPlan);
        setDraft(mappedDraft);
        return;
      }

      const current = await tournamentDraftService.getDraft();
      setDraft(current);
    };

    load();
  }, [isReadOnly, params.planId]);

  const scheduleItems = draft.scheduleItems || [];

  const estimatedTotal = useMemo(() => {
    return scheduleItems.reduce((acc, item) => {
      return acc + item.selectedFields.length * item.selectedSlots.length;
    }, 0);
  }, [scheduleItems]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await tournamentDraftService.savePlanFromDraft();
      Alert.alert("Thành công", "Đã tạo giải đấu thành công.");
      router.replace("/(tabs)/tournament");
    } catch (error: any) {
      Alert.alert("Lỗi", error?.message || "Không thể lưu kế hoạch");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <HeaderUser
        title="Xem lại giải đấu"
        subtitle={isReadOnly ? "Chi tiết bản nháp" : "Bước 4/4"}
        showBackButton
        onBackPress={() =>
          goBackOrReplace(
            navigation,
            isReadOnly ? "/(tabs)/tournament" : "/(tabs)/tournament/schedule"
          )
        }
      />

      <ScrollView className="flex-1 px-4 pt-4">
        <View className="border border-gray-200 rounded-xl p-3 mb-3">
          <Text className="text-lg font-semibold text-gray-900">{draft.name}</Text>
          <Text className="text-sm text-gray-500 mt-1">Môn: {toVietnameseSportType(draft.sportType)}</Text>
          <Text className="text-sm text-gray-500">
            Thời gian: {formatDate(draft.startDate)} đến {formatDate(draft.endDate)}
          </Text>
          <Text className="text-sm text-gray-500">
            Chế độ: {frequencyLabel[draft.frequency || "custom"] || "Tùy chỉnh"}
          </Text>
        </View>

        <View className="border border-gray-200 rounded-xl p-3 mb-3">
          <Text className="text-gray-800 font-semibold mb-2">Các lịch đã thêm</Text>
          {scheduleItems.length === 0 ? (
            <Text className="text-gray-500">Chưa có lịch cụ thể nào.</Text>
          ) : (
            scheduleItems.map((item) => (
              <View key={item.id} className="mb-2 pb-2 border-b border-gray-100">
                <Text className="text-gray-800 font-medium">{formatDate(item.bookingDate)} - {item.clusterName}</Text>
                <Text className="text-gray-600 text-xs mt-1">
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
        </View>

        <View className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-8">
          <Text className="text-indigo-800 font-semibold">Tổng quan lịch</Text>
          <Text className="text-indigo-700 mt-1">Số lịch cụ thể: {scheduleItems.length}</Text>
          <Text className="text-indigo-700">Tổng lượt đặt sân dự kiến: {estimatedTotal}</Text>
        </View>
      </ScrollView>

      {!isReadOnly && (
        <View className="px-4 pb-6 pt-2 border-t border-gray-100">
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className={`rounded-xl py-3 items-center ${saving ? "bg-gray-400" : "bg-emerald-600"}`}
          >
            <Text className="text-white font-semibold text-base">
              {saving ? "Đang lưu..." : "Tạo giải đấu"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const mapPlanToDraft = (plan: InternalTournamentPlan): TournamentDraft => {
  return {
    name: plan.name,
    sportType: plan.sportType,
    startDate: plan.startDate,
    endDate: plan.endDate,
    frequency: plan.frequency,
    selectedWeekdays: plan.selectedWeekdays,
    clusterId: plan.clusterId,
    clusterName: plan.clusterName,
    selectedFields: plan.selectedFields,
    selectedSlots: plan.selectedSlots,
    scheduleItems: plan.scheduleItems,
  };
};
