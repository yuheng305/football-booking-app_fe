import {
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useCallback } from "react";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import HeaderUser from "@/component/HeaderUser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fieldService } from "@/src/services/field.service";
import { FieldWithAvailability } from "@/src/types/booking.types";
import { bookingDraftService } from "@/src/services/booking-draft.service";
import { imageService } from "@/src/services/image.service";

type SportFilterOption = {
  id: number;
  label: string;
};

const SPORT_LABEL_MAP: Record<number, string> = {
  1: "Bong da",
  2: "Cau long",
  3: "Pickleball",
  4: "Tennis",
  5: "Bong ro",
};

const getSportLabel = (sportTypeId?: number, sportTypeName?: string) => {
  if (sportTypeName?.trim()) {
    return sportTypeName.trim();
  }

  if (typeof sportTypeId === "number" && SPORT_LABEL_MAP[sportTypeId]) {
    return SPORT_LABEL_MAP[sportTypeId];
  }

  return "Khac";
};

const FieldSelect = () => {
  const params = useLocalSearchParams();
  const clusterIdParam = params.clusterId as string | undefined;

  const [fields, setFields] = useState<FieldWithAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clusterName, setClusterName] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [activeClusterId, setActiveClusterId] = useState<string>("");
  const [fieldImageMap, setFieldImageMap] = useState<Record<number, string>>({});
  const [sportOptions, setSportOptions] = useState<SportFilterOption[]>([]);
  const [selectedSportId, setSelectedSportId] = useState<number | "all">("all");

  const loadScreenData = async () => {
    try {
      const draft = await bookingDraftService.getDraft();
      const fallbackClusterId = await AsyncStorage.getItem("clusterId");
      const resolvedClusterId =
        clusterIdParam ||
        (draft.clusterId ? String(draft.clusterId) : fallbackClusterId || "");
      const resolvedDate =
        draft.selectedDate || (await AsyncStorage.getItem("selectedDate")) || "";
      const resolvedClusterName =
        draft.clusterName || (await AsyncStorage.getItem("clusterName")) || "";

      setActiveClusterId(resolvedClusterId);
      setSelectedDate(resolvedDate);
      setClusterName(resolvedClusterName);

      if (!resolvedClusterId || !resolvedDate) {
        setError("Thieu thong tin cum san hoac ngay dat. Vui long chon lai.");
        setFields([]);
        return;
      }

      await fetchFieldsWithAvailability(resolvedClusterId, resolvedDate);
    } catch (loadError) {
      console.error("[FIELD SELECT] Error loading screen data:", loadError);
      setError("Khong the tai thong tin chon san");
    }
  };

  useEffect(() => {
    loadScreenData();
  }, [clusterIdParam]);

  useFocusEffect(
    useCallback(() => {
      loadScreenData();
    }, [clusterIdParam])
  );

  const fetchFieldsWithAvailability = async (clusterId: string, bookingDate: string) => {
    try {
      setLoading(true);
      setError(null);

      const fieldsData = await fieldService.getFieldAvailability({
        clusterId: Number(clusterId),
        bookingDate,
      });

      const activeFields = fieldsData.filter((item) => item.field.status === "active");
      setFields(activeFields);

      const nextSportOptions = Array.from(
        new Map(
          activeFields
            .map((item) => {
              const sportTypeId = item.field.sport_type_id;
              if (!sportTypeId) {
                return null;
              }

              return [
                sportTypeId,
                {
                  id: sportTypeId,
                  label: getSportLabel(sportTypeId, item.field.sport_type?.name),
                },
              ] as const;
            })
            .filter((entry): entry is readonly [number, SportFilterOption] => !!entry)
        ).values()
      ).sort((a, b) => a.id - b.id);

      setSportOptions(nextSportOptions);
      setSelectedSportId((prev) => {
        if (prev === "all") {
          return prev;
        }

        return nextSportOptions.some((item) => item.id === prev) ? prev : "all";
      });

      const imageEntries = await Promise.all(
        activeFields.map(async (item) => {
          try {
            const imageUrl = await imageService.getFirstImageUrl("field", item.field.id);
            return imageUrl ? ([item.field.id, imageUrl] as const) : null;
          } catch {
            return null;
          }
        })
      );

      const nextImageMap = imageEntries.reduce<Record<number, string>>((acc, entry) => {
        if (entry) {
          const [fieldId, url] = entry;
          acc[fieldId] = url;
        }
        return acc;
      }, {});
      setFieldImageMap(nextImageMap);

      if (activeFields.length === 0) {
        setError("Hien tai khong co san nao kha dung trong ngay nay.");
      }
    } catch (fetchError: any) {
      console.error("[FIELD SELECT] Error fetching fields:", fetchError);
      setError(fetchError.message || "Khong the tai danh sach san");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectField = async (fieldData: FieldWithAvailability) => {
    try {
      const { field, available_slots, booked_slots } = fieldData;

      await AsyncStorage.setItem("selectedFieldId", field.id.toString());
      await AsyncStorage.setItem("selectedFieldSize", field.size);
      await AsyncStorage.setItem("selectedFieldPrice", field.price_per_hour.toString());
      await AsyncStorage.setItem("selectedFieldDescription", field.description);

      await bookingDraftService.patchDraft({
        fieldId: field.id,
        fieldSize: field.size,
        fieldPrice: field.price_per_hour,
        fieldDescription: field.description,
        availableSlots: available_slots,
        bookedSlots: booked_slots,
        selectedStartTime: undefined,
        selectedEndTime: undefined,
        selectedDuration: undefined,
      });

      await AsyncStorage.setItem("fieldAvailableSlots", JSON.stringify(available_slots));
      await AsyncStorage.setItem("fieldBookedSlots", JSON.stringify(booked_slots));

      router.push("/(tabs)/(stadiums)/time-select");
    } catch (saveError) {
      console.error("[FIELD SELECT] Error saving field:", saveError);
      Alert.alert("Loi", "Khong the luu thong tin san");
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  const headerSubtitle = [clusterName, selectedDate ? formatDate(selectedDate) : ""]
    .filter(Boolean)
    .join(" • ");

  const filteredFields =
    selectedSportId === "all"
      ? fields
      : fields.filter((item) => item.field.sport_type_id === selectedSportId);

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={["top"]}>
      <HeaderUser
        title="Chon san"
        subtitle={headerSubtitle}
        showBackButton
        onBackPress={() => router.push("/(tabs)/(stadiums)/date-select")}
      />

      {loading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-center text-lg mt-4">Dang tai...</Text>
        </View>
      )}

      {error && (
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text className="text-center text-red-500 mt-4 text-base">{error}</Text>
          <TouchableOpacity
            className="bg-blue-500 px-6 py-3 rounded-lg mt-4"
            onPress={() =>
              activeClusterId && selectedDate
                ? fetchFieldsWithAvailability(activeClusterId, selectedDate)
                : null
            }
          >
            <Text className="text-white font-semibold">Thu lai</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && fields.length > 0 && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          className="flex-1 mt-3"
        >
          {sportOptions.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
              contentContainerStyle={{ paddingRight: 12 }}
            >
              <TouchableOpacity
                className={`px-4 py-2 rounded-full mr-2 border ${selectedSportId === "all" ? "bg-blue-500 border-blue-500" : "bg-white border-gray-300"}`}
                onPress={() => setSelectedSportId("all")}
              >
                <Text className={`${selectedSportId === "all" ? "text-white" : "text-gray-700"} font-semibold`}>
                  Tat ca
                </Text>
              </TouchableOpacity>

              {sportOptions.map((sport) => {
                const isActive = selectedSportId === sport.id;

                return (
                  <TouchableOpacity
                    key={sport.id}
                    className={`px-4 py-2 rounded-full mr-2 border ${isActive ? "bg-blue-500 border-blue-500" : "bg-white border-gray-300"}`}
                    onPress={() => setSelectedSportId(sport.id)}
                  >
                    <Text className={`${isActive ? "text-white" : "text-gray-700"} font-semibold`}>
                      {sport.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {filteredFields.length === 0 && (
            <View className="items-center justify-center py-12">
              <Ionicons name="filter-outline" size={48} color="#9ca3af" />
              <Text className="text-center text-gray-500 mt-3 text-base">
                Khong co san phu hop voi mon da chon
              </Text>
            </View>
          )}

          {filteredFields.map((fieldData) => {
            const { field, available_slots, booked_slots } = fieldData;
            const hasAvailability = available_slots.length > 0;
            const totalBooked = booked_slots.length;

            return (
              <TouchableOpacity
                key={field.id}
                className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-200"
                onPress={() => handleSelectField(fieldData)}
                activeOpacity={1}
                disabled={!hasAvailability}
              >
                <View className="flex-row items-start">
                  <View className="bg-blue-100 rounded-full p-3 mr-4">
                    {fieldImageMap[field.id] ? (
                      <Image
                        source={{ uri: fieldImageMap[field.id] }}
                        className="w-12 h-12 rounded-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="football" size={32} color="#3b82f6" />
                    )}
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-lg font-bold text-gray-900">San {field.size}</Text>
                      <View
                        className={`${hasAvailability ? "bg-green-100" : "bg-red-100"} px-3 py-1 rounded-full`}
                      >
                        <Text
                          className={`${hasAvailability ? "text-green-700" : "text-red-700"} text-xs font-semibold`}
                        >
                          {hasAvailability ? "Kha dung" : "Het cho"}
                        </Text>
                      </View>
                    </View>

                    <Text className="text-gray-600 text-sm mb-2">{field.description}</Text>

                    {totalBooked > 0 && (
                      <View className="flex-row items-center mb-2">
                        <Ionicons name="time-outline" size={14} color="#f59e0b" />
                        <Text className="text-xs text-amber-600 ml-1">
                          {totalBooked} khung gio da dat
                        </Text>
                      </View>
                    )}

                    <View className="flex-row items-center justify-between mt-2">
                      <View className="flex-row items-center">
                        <Ionicons name="cash-outline" size={18} color="#3b82f6" />
                        <Text className="text-blue-600 font-semibold text-base ml-2">
                          {formatPrice(field.price_per_hour)}/gio
                        </Text>
                      </View>

                      <View
                        className={`${hasAvailability ? "bg-blue-500" : "bg-gray-300"} px-4 py-2 rounded-lg`}
                      >
                        <Text className="text-white font-semibold">
                          {hasAvailability ? "Chon" : "Het cho"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {!loading && !error && fields.length === 0 && (
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="football-outline" size={64} color="#9ca3af" />
          <Text className="text-center text-gray-500 mt-4 text-base">
            Khong co san nao kha dung
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default FieldSelect;
