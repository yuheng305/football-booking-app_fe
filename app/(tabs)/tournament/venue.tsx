import { useEffect, useMemo, useRef, useState } from "react";
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
import { router } from "expo-router";
import { Calendar } from "react-native-calendars";
import HeaderUser from "@/component/HeaderUser";
import tournamentDraftService from "@/src/services/tournament-draft.service";
import { clusterService } from "@/src/services/cluster.service";
import { fieldService } from "@/src/services/field.service";
import { Cluster } from "@/src/types/cluster.types";
import { FieldWithAvailability } from "@/src/types/booking.types";
import {
  TournamentFrequency,
  TournamentScheduleItem,
  TournamentSportType,
} from "@/src/types/tournament.types";
import { goBackOrReplace } from "@/src/utils/navigation.helper";

const slotKey = (start: string, end: string) => `${start}-${end}`;

const parseTimeToMinutes = (value: string): number => {
  const timePart = value.includes("T") ? value.split("T")[1] : value;
  const clean = timePart.replace("Z", "");
  const [h = "0", m = "0"] = clean.split(":");
  const hours = Number(h);
  const minutes = Number(m);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
};

const formatMinuteToHHMM = (total: number): string => {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const toApiTime = (hhmm: string): string => `${hhmm}:00`;

const toVnd = (value?: number): string => `${(value || 0).toLocaleString("vi-VN")} VND`;

const expandRangeToHalfHourSlots = (startTime: string, endTime: string): string[] => {
  const startMinute = parseTimeToMinutes(startTime);
  const endMinute = parseTimeToMinutes(endTime);

  if (endMinute <= startMinute) {
    return [];
  }

  const firstSlotStart = Math.ceil(startMinute / 30) * 30;
  const lastSlotEnd = Math.floor(endMinute / 30) * 30;

  const results: string[] = [];
  for (let cursor = firstSlotStart; cursor + 30 <= lastSlotEnd; cursor += 30) {
    results.push(slotKey(formatMinuteToHHMM(cursor), formatMinuteToHHMM(cursor + 30)));
  }

  return results;
};

const toISODate = (date: Date) => date.toISOString().slice(0, 10);

const addDays = (dateStr: string, days: number) => {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toISODate(date);
};

const QUICK_DATE_PRESETS = [
  { label: "Hôm nay", offset: 0 },
  { label: "+1 ngày", offset: 1 },
  { label: "+3 ngày", offset: 3 },
  { label: "+7 ngày", offset: 7 },
];

const todayISO = new Date().toISOString().slice(0, 10);

const SPORT_TYPE_ID_MAP: Record<TournamentSportType, number> = {
  football: 1,
  badminton: 2,
  tennis: 3,
  pickleball: 4,
  basketball: 5,
};

export default function TournamentVenueScreen() {
  const navigation = useNavigation();
  const scrollRef = useRef<ScrollView | null>(null);
  const [loadingClusters, setLoadingClusters] = useState(true);
  const [loadingFields, setLoadingFields] = useState(false);
  const [search, setSearch] = useState("");
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [availability, setAvailability] = useState<FieldWithAvailability[]>([]);
  const [selectedFieldIds, setSelectedFieldIds] = useState<number[]>([]);
  const [selectedSlotKeys, setSelectedSlotKeys] = useState<string[]>([]);
  const [rangeStartKey, setRangeStartKey] = useState<string | null>(null);
  const [rangeEndKey, setRangeEndKey] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [bookingDate, setBookingDate] = useState<string>("");
  const [showDateModal, setShowDateModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showClusterPickerModal, setShowClusterPickerModal] = useState(false);
  const [showFieldPickerModal, setShowFieldPickerModal] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState<string>("");
  const [fieldSectionY, setFieldSectionY] = useState(280);
  const [slotSectionY, setSlotSectionY] = useState(520);
  const [scheduleItems, setScheduleItems] = useState<TournamentScheduleItem[]>([]);
  const [frequency, setFrequency] = useState<TournamentFrequency>("custom");
  const [sportTypeId, setSportTypeId] = useState<number | undefined>(undefined);
  const isRepeatMode = frequency !== "custom";

  useEffect(() => {
    loadDraftAndClusters();
  }, []);

  const scrollToSection = (y: number) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    });
  };

  const loadDraftAndClusters = async () => {
    try {
      setLoadingClusters(true);
      const draft = await tournamentDraftService.getDraft();
      setFrequency(draft.frequency || "custom");
      const selectedSportTypeId = draft.sportType
        ? SPORT_TYPE_ID_MAP[draft.sportType]
        : undefined;
      setSportTypeId(selectedSportTypeId);
      const initialDate = draft.startDate || todayISO;
      setStartDate(initialDate);
      setBookingDate(initialDate);

      const res = await clusterService.searchClusters({
        search: search || undefined,
        sport_type_id: selectedSportTypeId,
        limit: 20,
        offset: 0,
      });
      setClusters(res.clusters.filter((c) => c.status === "active" && c.is_accepted));

      if (draft.clusterId) {
        const matched = res.clusters.find((c) => c.id === draft.clusterId);
        if (matched) {
          setSelectedCluster(matched);
          await loadAvailability(matched.id, initialDate);
          scrollToSection(fieldSectionY);
        }
      }

      if (draft.selectedFields?.length) {
        setSelectedFieldIds(draft.selectedFields.map((f) => f.fieldId));
      }
      if (draft.selectedSlots?.length) {
        setSelectedSlotKeys(draft.selectedSlots.map((s) => slotKey(s.start_time, s.end_time)));
      }
      setScheduleItems(draft.scheduleItems || []);
    } catch (error: any) {
      Alert.alert("Lỗi", error?.message || "Không thể tải danh sách cụm sân");
    } finally {
      setLoadingClusters(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoadingClusters(true);
      const res = await clusterService.searchClusters({
        search: search || undefined,
        sport_type_id: sportTypeId,
        limit: 20,
        offset: 0,
      });
      setClusters(res.clusters.filter((c) => c.status === "active" && c.is_accepted));
    } catch (error: any) {
      Alert.alert("Lỗi", error?.message || "Không thể tìm cụm sân");
    } finally {
      setLoadingClusters(false);
    }
  };

  const loadAvailability = async (clusterId: number, bookingDate: string) => {
    if (!bookingDate) {
      Alert.alert("Thiếu ngày", "Vui lòng quay lại bước trước để chọn ngày bắt đầu.");
      return;
    }

    try {
      setLoadingFields(true);
      setSelectedFieldIds([]);
      setSelectedSlotKeys([]);
      setFallbackMessage("");

      const data = await fieldService.getFieldAvailability({
        clusterId,
        bookingDate,
      });

      const active = data.filter((item) => item.field.status === "active");
      const hasAvailableSlot = active.some((item) => item.available_slots.length > 0);

      if (active.length > 0 && hasAvailableSlot) {
        setAvailability(active);
        return;
      }

      // Auto find nearest date with available slots to avoid empty UI traps.
      for (let i = 1; i <= 14; i += 1) {
        const nextDate = addDays(bookingDate, i);
        const nextData = await fieldService.getFieldAvailability({
          clusterId,
          bookingDate: nextDate,
        });
        const nextActive = nextData.filter((item) => item.field.status === "active");
        if (nextActive.some((item) => item.available_slots.length > 0)) {
          setBookingDate(nextDate);
          setAvailability(nextActive);
          setFallbackMessage(`Đã tự chuyển sang ${nextDate} vì ngày bạn chọn không có slot trống.`);
          return;
        }
      }

      // Fallback: show fields even if no slots so users can still see/select context.
      const rawFields = await fieldService.getFieldsByCluster(clusterId);
      const fallbackAvailability: FieldWithAvailability[] = rawFields.fields
        .filter((field) => field.status === "active")
        .map((field) => ({
          field,
          available_slots: [],
          booked_slots: [],
        }));

      setAvailability(fallbackAvailability);
      setFallbackMessage("Ngày đang chọn và 14 ngày tiếp theo chưa có slot trống. Bạn vẫn có thể đổi ngày để tìm slot.");
    } catch (error: any) {
      Alert.alert("Lỗi", error?.message || "Không thể tải danh sách sân con");
      setAvailability([]);
      setFallbackMessage("");
    } finally {
      setLoadingFields(false);
    }
  };

  const toggleField = (fieldId: number) => {
    setSelectedSlotKeys([]);
    setRangeStartKey(null);
    setRangeEndKey(null);
    setSelectedFieldIds([fieldId]);
  };

  const commonSlots = useMemo(() => {
    if (selectedFieldIds.length === 0) return [] as string[];

    const selectedFieldAvailability = availability.filter((item) =>
      selectedFieldIds.includes(item.field.id)
    );

    if (selectedFieldAvailability.length === 0) return [] as string[];

    const sets = selectedFieldAvailability.map((item) =>
      new Set(
        item.available_slots.flatMap((slot) =>
          expandRangeToHalfHourSlots(slot.start_time, slot.end_time)
        )
      )
    );

    if (sets.length === 0) return [] as string[];

    const intersection = [...sets[0]].filter((key) => sets.every((s) => s.has(key)));

    return intersection.sort((a, b) => a.localeCompare(b));
  }, [availability, selectedFieldIds]);

  const selectRange = (startKey: string, endKey: string) => {
    const startIndex = commonSlots.indexOf(startKey);
    const endIndex = commonSlots.indexOf(endKey);

    if (startIndex === -1 || endIndex === -1) {
      setSelectedSlotKeys([]);
      return;
    }

    const from = Math.min(startIndex, endIndex);
    const to = Math.max(startIndex, endIndex);
    setSelectedSlotKeys(commonSlots.slice(from, to + 1));
  };

  const handleSelectRangePoint = (key: string) => {
    if (!rangeStartKey || (rangeStartKey && rangeEndKey)) {
      setRangeStartKey(key);
      setRangeEndKey(null);
      setSelectedSlotKeys([key]);
      return;
    }

    setRangeEndKey(key);
    selectRange(rangeStartKey, key);
  };

  useEffect(() => {
    if (selectedFieldIds.length > 0) {
      scrollToSection(slotSectionY);
    }
  }, [selectedFieldIds.length, slotSectionY]);

  const handleContinue = async () => {
    if (scheduleItems.length === 0) {
      Alert.alert("Chưa có lịch", "Vui lòng thêm ít nhất 1 lịch trước khi tiếp tục.");
      return;
    }

    router.push("/(tabs)/tournament/schedule" as never);
  };

  const handleAddScheduleItem = async () => {
    if (!selectedCluster) {
      Alert.alert("Chưa chọn cụm sân", "Vui lòng chọn 1 cụm sân.");
      return;
    }

    if (selectedFieldIds.length === 0) {
      Alert.alert("Chưa chọn sân", "Vui lòng chọn ít nhất 1 sân con.");
      return;
    }

    if (selectedSlotKeys.length === 0) {
      Alert.alert("Chưa chọn khung giờ", "Vui lòng chọn ít nhất 1 khung giờ.");
      return;
    }

    const selectedFields = selectedFieldIds
      .map((fieldId) => availability.find((item) => item.field.id === fieldId))
      .filter((item): item is FieldWithAvailability => !!item)
      .map((item) => ({
        fieldId: item.field.id,
        fieldSize: item.field.size,
        pricePerHour: item.field.price_per_hour,
      }));

    const selectedSlots = (() => {
      const first = selectedSlotKeys[0];
      const last = selectedSlotKeys[selectedSlotKeys.length - 1];
      if (!first || !last) {
        return [] as Array<{ start_time: string; end_time: string }>;
      }

      const [start] = first.split("-");
      const [, end] = last.split("-");
      return [
        {
          start_time: toApiTime(start),
          end_time: toApiTime(end),
        },
      ];
    })();

    if (selectedSlots.length === 0) {
      Alert.alert("Khung giờ chưa hợp lệ", "Vui lòng chọn lại một range thời gian.");
      return;
    }

    const draft = await tournamentDraftService.getDraft();
    const currentItems = draft.scheduleItems || [];

    if (currentItems.length > 0 && currentItems[0].clusterId !== selectedCluster.id) {
      Alert.alert(
        "Cụm sân không hợp lệ",
        `Giải đấu hiện đã dùng cụm ${currentItems[0].clusterName}. Vui lòng giữ cùng cụm sân.`
      );
      return;
    }

    const normalizedFieldKey = [...selectedFields]
      .map((field) => field.fieldId)
      .sort((a, b) => a - b)
      .join(",");
    const normalizedSlotKey = [...selectedSlots]
      .map((slot) => `${slot.start_time}-${slot.end_time}`)
      .sort()
      .join("|");

    const existed = currentItems.some((item) => {
      const itemFieldKey = [...item.selectedFields]
        .map((field) => field.fieldId)
        .sort((a, b) => a - b)
        .join(",");
      const itemSlotKey = [...item.selectedSlots]
        .map((slot) => `${slot.start_time}-${slot.end_time}`)
        .sort()
        .join("|");

      return (
        item.bookingDate === bookingDate &&
        item.clusterId === selectedCluster.id &&
        itemFieldKey === normalizedFieldKey &&
        itemSlotKey === normalizedSlotKey
      );
    });

    if (existed) {
      Alert.alert("Lịch đã tồn tại", "Lịch giống hệt đã được thêm trước đó.");
      return;
    }

    const fieldIdSet = new Set(selectedFields.map((item) => item.fieldId));
    const slotRanges = selectedSlots.map((slot) => ({
      start: parseTimeToMinutes(slot.start_time),
      end: parseTimeToMinutes(slot.end_time),
    }));

    const hasOverlap = currentItems.some((item) => {
      if (item.bookingDate !== bookingDate || item.clusterId !== selectedCluster.id) {
        return false;
      }

      const sharedField = item.selectedFields.some((field) => fieldIdSet.has(field.fieldId));
      if (!sharedField) {
        return false;
      }

      const overlap = item.selectedSlots.some((slot) => {
        const itemStart = parseTimeToMinutes(slot.start_time);
        const itemEnd = parseTimeToMinutes(slot.end_time);

        return slotRanges.some((range) => range.start < itemEnd && itemStart < range.end);
      });

      return overlap;
    });

    if (hasOverlap) {
      Alert.alert(
        "Trùng lịch",
        "Có sân và khung giờ bị trùng với lịch đã thêm trước đó. Vui lòng chọn range khác."
      );
      return;
    }

    const newItem: TournamentScheduleItem = {
      id: `schedule-${Date.now()}`,
      bookingDate,
      clusterId: selectedCluster.id,
      clusterName: selectedCluster.name,
      selectedFields,
      selectedSlots,
    };

    const nextItems = frequency === "custom" ? [newItem, ...currentItems] : [newItem];

    await tournamentDraftService.patchDraft({
      clusterId: selectedCluster.id,
      clusterName: selectedCluster.name,
      selectedFields,
      selectedSlots,
      scheduleItems: nextItems,
    });

    setScheduleItems(nextItems);
    setSelectedFieldIds([]);
    setSelectedSlotKeys([]);
    setRangeStartKey(null);
    setRangeEndKey(null);
    Alert.alert(
      "Đã lưu",
      frequency === "custom"
        ? "Bạn có thể tiếp tục thêm lịch khác hoặc bấm tiếp tục."
        : "Đã lưu lịch mẫu lặp. Sang bước tiếp theo để chọn kiểu lặp."
    );
  };

  const selectedField = useMemo(
    () => availability.find((item) => item.field.id === selectedFieldIds[0]),
    [availability, selectedFieldIds]
  );

  const missingRequirements: string[] = [];
  if (scheduleItems.length === 0) {
    missingRequirements.push(isRepeatMode ? "lịch mẫu lặp" : "ít nhất 1 lịch đã thêm");
  }

  const canContinue = scheduleItems.length > 0;

  const canSaveCurrentSelection =
    selectedFieldIds.length > 0 && selectedSlotKeys.length > 0 && !!selectedCluster;
  const lockedClusterId = scheduleItems.length > 0 ? scheduleItems[0].clusterId : null;
  const isClusterLocked = lockedClusterId !== null;
  const lockedClusterName = scheduleItems.length > 0 ? scheduleItems[0].clusterName : "";

  const handleSelectCluster = async (cluster: Cluster) => {
    if (isClusterLocked && lockedClusterId !== cluster.id) {
      Alert.alert(
        "Cụm sân đã cố định",
        `Giải đấu này chỉ dùng 1 cụm sân: ${lockedClusterName}. Xóa toàn bộ lịch đã thêm nếu bạn muốn đổi cụm.`
      );
      return;
    }

    setSelectedCluster(cluster);
    setShowClusterPickerModal(false);
    await loadAvailability(cluster.id, bookingDate || startDate);
    scrollToSection(fieldSectionY);
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <HeaderUser
        title="Chọn sân và khung giờ"
        subtitle={isRepeatMode ? "Bước 2/4: Chọn lịch mẫu lặp" : "Bước 2/4"}
        showBackButton
        onBackPress={() => goBackOrReplace(navigation, "/(tabs)/tournament/create")}
      />

      <View className="px-4 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-gray-900 font-semibold text-base">Chọn cụm sân, sân và khung giờ</Text>
          <TouchableOpacity
            onPress={() => setShowHelpModal(true)}
            className="px-3 py-2 rounded-full border border-indigo-300 bg-indigo-50"
          >
            <Text className="text-indigo-700 text-xs font-semibold">Xem hướng dẫn</Text>
          </TouchableOpacity>
        </View>

        {isRepeatMode ? (
          <View className="border border-purple-200 bg-purple-50 rounded-xl p-3 mb-2">
            <Text className="text-purple-900 font-semibold">Chế độ lặp lịch</Text>
            <Text className="text-purple-700 text-xs mt-1">
              Ở bước này bạn chỉ cần chọn 1 lịch mẫu. Bước sau sẽ chọn kiểu lặp để hệ thống nhân lịch tự động.
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          className={`mt-2 border rounded-xl px-4 py-3 ${
            isClusterLocked ? "border-gray-300 bg-gray-100" : "border-indigo-300 bg-indigo-50"
          }`}
          onPress={() => {
            if (isClusterLocked) {
              Alert.alert(
                "Cụm sân đã cố định",
                `Bạn đang dùng cụm ${lockedClusterName}. Giải đấu này chỉ cho phép 1 cụm sân.`
              );
              return;
            }
            setShowClusterPickerModal(true);
          }}
        >
          <Text className={isClusterLocked ? "text-xs text-gray-500" : "text-xs text-indigo-700"}>
            {isClusterLocked ? "Cụm sân cố định của giải" : "Cụm sân đang chọn"}
          </Text>
          <Text className={isClusterLocked ? "text-gray-900 font-semibold mt-1" : "text-indigo-900 font-semibold mt-1"}>
            {selectedCluster ? selectedCluster.name : "Chưa chọn cụm sân"}
          </Text>
          <Text className={isClusterLocked ? "text-gray-500 text-xs mt-1" : "text-indigo-700 text-xs mt-1"}>
            {isClusterLocked ? "Đã khóa vì bạn đã thêm lịch." : "Nhấn để mở danh sách cụm sân"}
          </Text>
        </TouchableOpacity>
        <View className="mt-2">
          <TouchableOpacity
            className="border border-gray-300 rounded-xl px-4 py-3"
            onPress={() => setShowDateModal(true)}
          >
            <Text className="text-xs text-gray-500">Ngày áp dụng để tìm slot trống</Text>
            <Text className="text-base text-gray-900 font-semibold mt-1">{bookingDate || startDate || "Chưa chọn"}</Text>
          </TouchableOpacity>
          {!isRepeatMode && (
            <View className="flex-row flex-wrap mt-2">
              {QUICK_DATE_PRESETS.map((preset) => {
                const baseDate = bookingDate || startDate;
                const targetDate = baseDate ? addDays(baseDate, preset.offset) : "";
                const active = targetDate && targetDate === bookingDate;

                return (
                  <TouchableOpacity
                    key={preset.label}
                    className={`mr-2 mb-2 px-3 py-2 rounded-full border ${
                      active ? "border-indigo-600 bg-indigo-100" : "border-gray-300"
                    }`}
                    onPress={async () => {
                      if (!baseDate) {
                        Alert.alert("Thiếu ngày", "Vui lòng quay lại bước 1 để chọn ngày bắt đầu.");
                        return;
                      }

                      setBookingDate(targetDate);
                      if (selectedCluster) {
                        await loadAvailability(selectedCluster.id, targetDate);
                      }
                    }}
                  >
                    <Text className={active ? "text-indigo-800 text-xs font-semibold" : "text-gray-700 text-xs"}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {loadingClusters ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <ScrollView ref={scrollRef} className="flex-1 px-4">
          {selectedCluster && (
            <View
              className="mt-1"
              onLayout={(event) => setFieldSectionY(event.nativeEvent.layout.y)}
            >
              <Text className="text-sm text-gray-500 mb-2">Sân con</Text>
              <Text className="text-xs text-indigo-700 mb-2">
                {isRepeatMode
                  ? "Chọn xong sân + giờ, bấm nút \"Lưu lịch mẫu lặp\" bên dưới."
                  : "Chọn xong sân + giờ, bấm nút \"+ Thêm lịch này\" bên dưới."}
              </Text>
              {availability.length > 0 && (
                <TouchableOpacity
                  className="border border-emerald-300 bg-emerald-50 rounded-xl px-4 py-3 mb-2"
                  onPress={() => setShowFieldPickerModal(true)}
                >
                  <Text className="text-xs text-emerald-700">Sân đang chọn</Text>
                  <Text className="text-emerald-900 font-semibold mt-1">
                    {selectedField
                      ? `Sân ${selectedField.field.id} - ${selectedField.field.size}`
                      : "Chưa chọn sân"}
                  </Text>
                  {selectedField ? (
                    <Text className="text-emerald-800 text-xs mt-1">
                      Giá: {toVnd(selectedField.field.price_per_hour)}/giờ
                    </Text>
                  ) : null}
                  <Text className="text-emerald-700 text-xs mt-1">Nhấn để mở popup chọn sân</Text>
                </TouchableOpacity>
              )}

              {!!fallbackMessage && (
                <View className="bg-sky-50 border border-sky-200 rounded-xl p-3 mb-2">
                  <Text className="text-sky-800 text-xs">{fallbackMessage}</Text>
                </View>
              )}

              {loadingFields ? (
                <ActivityIndicator size="small" color="#4f46e5" />
              ) : availability.length === 0 ? (
                <View className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <Text className="text-amber-800 font-medium">Không có sân con khả dụng</Text>
                  <Text className="text-amber-700 text-xs mt-1">
                    Cụm sân này có thể hết slot trong ngày đã chọn. Thử đổi ngày ở trên hoặc chọn cụm sân khác.
                  </Text>
                </View>
              ) : (
                <Text className="text-xs text-gray-500">
                  Chọn 1 sân trong popup để xem khung giờ trống.
                </Text>
              )}
            </View>
          )}

          {selectedFieldIds.length > 0 && (
            <View
              className="mt-2"
              onLayout={(event) => setSlotSectionY(event.nativeEvent.layout.y)}
            >
              <Text className="text-sm text-gray-500 mb-2">
                Khung giờ của sân đã chọn
              </Text>
              <Text className="text-xs text-gray-500 mb-2">
                {rangeStartKey && !rangeEndKey
                  ? "Đã chọn điểm bắt đầu, hãy chọn điểm kết thúc"
                  : rangeStartKey && rangeEndKey
                  ? `Range đã chọn: ${selectedSlotKeys[0]?.split("-")[0]} - ${selectedSlotKeys[selectedSlotKeys.length - 1]?.split("-")[1]}`
                  : "Chưa chọn range"}
              </Text>

              {commonSlots.length === 0 ? (
                <Text className="text-sm text-red-500">
                  Không tìm thấy khung giờ trống cho sân này ở ngày đã chọn.
                </Text>
              ) : (
                <>
                  <View className="flex-row mb-2">
                    <TouchableOpacity
                      className="px-3 py-2 rounded-full border border-gray-300"
                      onPress={() => {
                        setSelectedSlotKeys([]);
                        setRangeStartKey(null);
                        setRangeEndKey(null);
                      }}
                    >
                      <Text className="text-gray-700 text-xs font-semibold">Đặt lại range</Text>
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row flex-wrap">
                    {commonSlots.map((key) => {
                      const active = selectedSlotKeys.includes(key);
                      const [start, end] = key.split("-");
                      return (
                        <TouchableOpacity
                          key={key}
                          onPress={() => handleSelectRangePoint(key)}
                          className={`mr-2 mb-2 px-3 py-2 rounded-full border ${
                            active ? "bg-amber-100 border-amber-600" : "border-gray-300"
                          }`}
                        >
                          <Text className={active ? "text-amber-800 font-semibold" : "text-gray-700"}>
                            {start} - {end}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </View>
          )}

          {!selectedCluster && (
            <View className="border border-amber-200 bg-amber-50 rounded-xl p-3 mt-2">
              <Text className="text-amber-800 font-medium">Bạn chưa chọn cụm sân</Text>
              <Text className="text-amber-700 text-xs mt-1">
                {
                  'Nhấn vào ô "Cụm sân đang chọn" phía trên để mở danh sách cụm sân.'
                }
              </Text>
            </View>
          )}

          <View className="h-20" />
        </ScrollView>
      )}

      <View className="px-4 pb-6 pt-2 border-t border-gray-100">
        <Text className="text-xs text-emerald-700 mb-2">
          {frequency === "custom"
            ? `Đã thêm: ${scheduleItems.length} lịch cụ thể`
            : `Lịch mẫu hiện tại: ${scheduleItems.length > 0 ? "Đã có" : "Chưa có"}`}
        </Text>

        <TouchableOpacity
          onPress={handleAddScheduleItem}
          disabled={!canSaveCurrentSelection}
          className={`rounded-xl py-3 items-center mb-3 ${
            canSaveCurrentSelection ? "bg-emerald-600" : "bg-gray-300"
          }`}
        >
          <Text className="text-white font-semibold text-base">
            {frequency === "custom" ? "Lưu lịch đã chọn" : "Lưu lịch mẫu lặp"}
          </Text>
        </TouchableOpacity>

        <Text className="text-xs text-gray-500 mb-2">
          {missingRequirements.length === 0
            ? "Đã đủ điều kiện, bạn có thể tiếp tục."
            : `Còn thiếu: ${missingRequirements.join(", ")}.`}
        </Text>
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!canContinue}
          className={`rounded-xl py-3 items-center ${canContinue ? "bg-indigo-600" : "bg-gray-300"}`}
        >
          <Text className="text-white font-semibold text-base">
            {canContinue
              ? isRepeatMode
                ? "Tiếp tục thiết lập lặp"
                : "Tiếp tục"
              : isRepeatMode
              ? "Lưu lịch mẫu để tiếp tục"
              : "Thêm ít nhất 1 lịch để tiếp tục"}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showDateModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-2xl p-4">
            <Text className="text-base font-semibold mb-3">Chọn ngày để tìm slot trống</Text>
            <Calendar
              minDate={startDate || undefined}
              markedDates={{
                [bookingDate || startDate]: {
                  selected: true,
                  selectedColor: "#4f46e5",
                },
              }}
              onDayPress={async (day) => {
                setBookingDate(day.dateString);
                setShowDateModal(false);

                if (selectedCluster) {
                  await loadAvailability(selectedCluster.id, day.dateString);
                }
              }}
            />

            <TouchableOpacity
              onPress={() => setShowDateModal(false)}
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
            <Text className="text-gray-900 text-lg font-semibold">Cách chọn nhanh</Text>
            <Text className="text-gray-700 text-sm mt-2">1) Mỗi giải chỉ dùng duy nhất 1 cụm sân.</Text>
            <Text className="text-gray-700 text-sm mt-1">2) Chọn cụm sân trước, sau đó chọn 1 sân con trong popup.</Text>
            <Text className="text-gray-700 text-sm mt-1">3) Chọn giờ theo range: chạm điểm bắt đầu rồi chạm điểm kết thúc.</Text>
            <Text className="text-gray-700 text-sm mt-1">4) Range liền nhau sẽ lưu thành 1 khung giờ liên tục.</Text>
            <TouchableOpacity
              onPress={() => setShowHelpModal(false)}
              className="mt-4 border border-gray-300 rounded-xl py-3 items-center"
            >
              <Text className="text-gray-700 font-medium">Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showClusterPickerModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-2xl p-4 max-h-[70%]">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-semibold">Chọn cụm sân</Text>
              <TouchableOpacity onPress={() => setShowClusterPickerModal(false)}>
                <Text className="text-indigo-700 font-semibold">Đóng</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row mb-3">
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Tìm cụm sân..."
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 mr-2"
              />
              <TouchableOpacity onPress={handleSearch} className="bg-indigo-600 rounded-xl px-4 justify-center">
                <Text className="text-white font-semibold">Tìm</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              {clusters.map((cluster) => {
                const active = selectedCluster?.id === cluster.id;
                return (
                  <TouchableOpacity
                    key={cluster.id}
                    className={`border rounded-xl p-3 mb-2 ${
                      active ? "border-indigo-600 bg-indigo-50" : "border-gray-300"
                    }`}
                    onPress={() => handleSelectCluster(cluster)}
                  >
                    <Text className={active ? "text-indigo-700 font-semibold" : "text-gray-900 font-medium"}>
                      {cluster.name}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-1">
                      {cluster.street}, {cluster.district}, {cluster.city}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showFieldPickerModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-2xl p-4 max-h-[70%]">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-semibold">Chọn sân con (1 sân)</Text>
              <TouchableOpacity onPress={() => setShowFieldPickerModal(false)}>
                <Text className="text-indigo-700 font-semibold">Đóng</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              {availability.map((item) => {
                const active = selectedFieldIds.includes(item.field.id);
                const disabled = item.available_slots.length === 0;
                return (
                  <TouchableOpacity
                    key={item.field.id}
                    disabled={disabled}
                    className={`border rounded-xl p-3 mb-2 ${
                      disabled
                        ? "border-gray-200 bg-gray-100"
                        : active
                        ? "border-emerald-600 bg-emerald-50"
                        : "border-gray-300"
                    }`}
                    onPress={() => {
                      if (disabled) {
                        Alert.alert("Sân tạm hết slot", "Sân này chưa có khung giờ trống ở ngày hiện tại.");
                        return;
                      }
                      toggleField(item.field.id);
                      setShowFieldPickerModal(false);
                    }}
                  >
                    <Text className={active ? "text-emerald-800 font-semibold" : "text-gray-900 font-medium"}>
                      Sân {item.field.id} - {item.field.size}
                    </Text>
                    <Text className="text-xs text-gray-600 mt-1">
                      Giá: {toVnd(item.field.price_per_hour)}/giờ
                    </Text>
                    <Text className="text-xs text-gray-500 mt-1">
                      {disabled ? "Hết slot trong ngày" : "Có thể chọn"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
