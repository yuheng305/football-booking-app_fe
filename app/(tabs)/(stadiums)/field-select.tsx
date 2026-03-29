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

interface Field {
  id: number;
  size: string;
  description: string;
  status: string;
  price_per_hour: number;
  cluster_id: number;
  created_at: string;
  updated_at: string;
}

interface FieldsResponse {
  data: {
    fields: Field[];
    total: number;
  };
  api_version: string;
  errors: {
    msg: string[];
    code: string | null;
  };
}

const FieldSelect = () => {
  const params = useLocalSearchParams();
  const clusterIdParam = params.clusterId as string | undefined;

  const [fields, setFields] = useState<FieldWithAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clusterName, setClusterName] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [activeClusterId, setActiveClusterId] = useState<string>("");

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
        setError("Thiếu thông tin cụm sân hoặc ngày đặt. Vui lòng chọn lại.");
        setFields([]);
        return;
      }

      await fetchFieldsWithAvailability(resolvedClusterId, resolvedDate);
    } catch (error) {
      console.error("[FIELD SELECT] Error loading screen data:", error);
      setError("Không thể tải thông tin chọn sân");
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

  /**
   * Fallback: Fetch from API if data not in storage
   */
  const fetchFieldsWithAvailability = async (clusterId: string, bookingDate: string) => {
    try {
      setLoading(true);
      setError(null);

      const fieldsData = await fieldService.getFieldAvailability({
        clusterId: Number(clusterId),
        bookingDate,
      });

      console.log("[FIELD SELECT] Fields with availability:", fieldsData);

      // Filter only active fields
      const activeFields = fieldsData.filter(
        (item) => item.field.status === "active"
      );
      setFields(activeFields);

      if (activeFields.length === 0) {
        setError("Hiện tại không có sân nào khả dụng trong ngày này.");
      }
    } catch (error: any) {
      console.error("[FIELD SELECT] Error fetching fields:", error);
      setError(error.message || "Không thể tải danh sách sân");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectField = async (fieldData: FieldWithAvailability) => {
    try {
      const { field, available_slots, booked_slots } = fieldData;
      
      // Save selected field info
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
      
      // Save availability data for time selection
      await AsyncStorage.setItem("fieldAvailableSlots", JSON.stringify(available_slots));
      await AsyncStorage.setItem("fieldBookedSlots", JSON.stringify(booked_slots));

      console.log("[FIELD SELECT] Selected field:", field);
      console.log("[FIELD SELECT] Available slots:", available_slots);
      console.log("[FIELD SELECT] Booked slots:", booked_slots);

      // Navigate to time selection
      router.push("/(tabs)/(stadiums)/time-select");
    } catch (error) {
      console.error("[FIELD SELECT] Error saving field:", error);
      Alert.alert("Lỗi", "Không thể lưu thông tin sân");
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

  const headerSubtitle = [
    clusterName,
    selectedDate ? formatDate(selectedDate) : "",
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={['top']}>
      <HeaderUser
        title="Chọn sân"
        subtitle={headerSubtitle}
        showBackButton
        onBackPress={() => router.push("/(tabs)/(stadiums)/date-select")}
      />

      {loading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-center text-lg mt-4">Đang tải...</Text>
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
            <Text className="text-white font-semibold">Thử lại</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && fields.length > 0 && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          className="flex-1 mt-3"
        >
          {fields.map((fieldData) => {
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
                    <Ionicons name="football" size={32} color="#3b82f6" />
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-lg font-bold text-gray-900">
                        Sân {field.size}
                      </Text>
                      <View
                        className={`${
                          hasAvailability ? "bg-green-100" : "bg-red-100"
                        } px-3 py-1 rounded-full`}
                      >
                        <Text
                          className={`${
                            hasAvailability ? "text-green-700" : "text-red-700"
                          } text-xs font-semibold`}
                        >
                          {hasAvailability ? "Khả dụng" : "Hết chỗ"}
                        </Text>
                      </View>
                    </View>

                    <Text className="text-gray-600 text-sm mb-2">
                      {field.description}
                    </Text>

                    {/* Availability info */}
                    {totalBooked > 0 && (
                      <View className="flex-row items-center mb-2">
                        <Ionicons name="time-outline" size={14} color="#f59e0b" />
                        <Text className="text-xs text-amber-600 ml-1">
                          {totalBooked} khung giờ đã đặt
                        </Text>
                      </View>
                    )}

                    <View className="flex-row items-center justify-between mt-2">
                      <View className="flex-row items-center">
                        <Ionicons name="cash-outline" size={18} color="#3b82f6" />
                        <Text className="text-blue-600 font-semibold text-base ml-2">
                          {formatPrice(field.price_per_hour)}/giờ
                        </Text>
                      </View>

                      <View
                        className={`${
                          hasAvailability ? "bg-blue-500" : "bg-gray-300"
                        } px-4 py-2 rounded-lg`}
                      >
                        <Text className="text-white font-semibold">
                          {hasAvailability ? "Chọn" : "Hết chỗ"}
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
            Không có sân nào khả dụng
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default FieldSelect;
