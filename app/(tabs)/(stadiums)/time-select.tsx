import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  PanResponder,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useRef, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import HeaderUser from "@/component/HeaderUser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TimeSlot } from "@/src/types/booking.types";
import { fieldService } from "@/src/services/field.service";
import { bookingDraftService } from "@/src/services/booking-draft.service";

interface BookedSlot {
  start: number; // Hour in decimal (e.g., 9.5 = 9:30)
  end: number;
}

interface AvailableSlot {
  start: number;
  end: number;
}

const TimeSelect = () => {
  const [loading, setLoading] = useState(true);
  
  // Booking data
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [clusterName, setClusterName] = useState<string>("");
  const [fieldId, setFieldId] = useState<string>("");
  const [fieldPrice, setFieldPrice] = useState<number>(100000);
  
  // Availability data
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);

  // Time selection with drag support
  const [selectedStart, setSelectedStart] = useState<number | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<number | null>(null);
  const [lastTap, setLastTap] = useState<{ hour: number; time: number } | null>(null);
  
  const MIN_HOUR = 6;
  const MAX_HOUR = 23;
  const SLOT_INTERVAL = 0.5; // 30 minutes
  const DOUBLE_TAP_DELAY = 300; // ms

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setSelectedStart(null);
      setSelectedEnd(null);
      setLastTap(null);
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const draft = await bookingDraftService.getDraft();
      const date = draft.selectedDate || (await AsyncStorage.getItem("selectedDate"));
      const cluster = draft.clusterName || (await AsyncStorage.getItem("clusterName"));
      const field =
        draft.fieldId !== undefined
          ? String(draft.fieldId)
          : await AsyncStorage.getItem("selectedFieldId");
      const price =
        draft.fieldPrice !== undefined
          ? String(draft.fieldPrice)
          : await AsyncStorage.getItem("selectedFieldPrice");

      if (date) setSelectedDate(date);
      if (cluster) setClusterName(cluster);
      if (field) setFieldId(field);
      if (price) setFieldPrice(Number(price));

      if (date && field) {
        const fieldIdNumber = Number(field);
        console.log("[TIME SELECT] Fetch live availability by field", {
          fieldId: fieldIdNumber,
          booking_date: date,
        });

        const fieldAvailability = await fieldService.getFieldAvailabilityByFieldId({
          fieldId: fieldIdNumber,
          bookingDate: date,
        });

        if (fieldAvailability?.field?.price_per_hour) {
          setFieldPrice(Number(fieldAvailability.field.price_per_hour));
          await bookingDraftService.patchDraft({
            fieldPrice: Number(fieldAvailability.field.price_per_hour),
          });
          await AsyncStorage.setItem(
            "selectedFieldPrice",
            String(fieldAvailability.field.price_per_hour)
          );
        }

        const convertedAvailableSlots = (fieldAvailability.available_slots || []).map((slot) => ({
          start: timeStringToDecimal(slot.start_time),
          end: timeStringToDecimal(slot.end_time),
        }));
        const convertedBookedSlots = (fieldAvailability.booked_slots || []).map((slot) => ({
          start: timeStringToDecimal(slot.start_time),
          end: timeStringToDecimal(slot.end_time),
        }));

        setAvailableSlots(convertedAvailableSlots);
        setBookedSlots(convertedBookedSlots);

        await bookingDraftService.patchDraft({
          availableSlots: fieldAvailability.available_slots || [],
          bookedSlots: fieldAvailability.booked_slots || [],
        });

        await AsyncStorage.setItem(
          "fieldAvailableSlots",
          JSON.stringify(fieldAvailability.available_slots || [])
        );
        await AsyncStorage.setItem(
          "fieldBookedSlots",
          JSON.stringify(fieldAvailability.booked_slots || [])
        );

        console.log("[TIME SELECT] Live availability loaded", {
          availableCount: convertedAvailableSlots.length,
          bookedCount: convertedBookedSlots.length,
        });
        return;
      }
    } catch (error) {
      console.error("[TIME SELECT] Error loading live availability, fallback cache:", error);

      try {
        const draft = await bookingDraftService.getDraft();
        const availableSlotsSource = draft.availableSlots;
        const bookedSlotsSource = draft.bookedSlots;

        if (availableSlotsSource && availableSlotsSource.length > 0) {
          setAvailableSlots(
            availableSlotsSource.map((slot) => ({
              start: timeStringToDecimal(slot.start_time),
              end: timeStringToDecimal(slot.end_time),
            }))
          );
        }

        if (bookedSlotsSource && bookedSlotsSource.length > 0) {
          setBookedSlots(
            bookedSlotsSource.map((slot) => ({
              start: timeStringToDecimal(slot.start_time),
              end: timeStringToDecimal(slot.end_time),
            }))
          );
        }
      } catch (cacheError) {
        console.error("[TIME SELECT] Cache fallback error:", cacheError);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Convert time string "HH:MM:SS" to decimal hour (e.g., "09:30:00" => 9.5)
   */
  const timeStringToDecimal = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours + minutes / 60;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  const formatTime = (hour: number) => {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const formatPrice = (duration: number, pricePerHour: number = 100000) => {
    const total = duration * pricePerHour;
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(total);
  };

  /**
   * Check if a time slot is booked
   */
  const isTimeBooked = (time: number): boolean => {
    return bookedSlots.some((slot) => time >= slot.start && time < slot.end);
  };

  /**
   * Check if a time range overlaps with any booked slot
   */
  const isRangeBooked = (start: number, end: number): boolean => {
    return bookedSlots.some((slot) => start < slot.end && end > slot.start);
  };

  /**
   * Check if a time is within available slots
   */
  const isTimeAvailable = (time: number): boolean => {
    if (availableSlots.length === 0) return true; // If no specific slots, all available
    return availableSlots.some((slot) => time >= slot.start && time < slot.end);
  };

  /**
   * Get slot status for rendering
   */
  const getSlotStatus = (hour: number): "available" | "booked" | "selected" | "unavailable" => {
    if (selectedStart !== null && selectedEnd !== null && hour >= selectedStart && hour < selectedEnd) {
      return "selected";
    }
    if (isTimeBooked(hour)) {
      return "booked";
    }
    if (!isTimeAvailable(hour)) {
      return "unavailable";
    }
    return "available";
  };

  /**
   * Handle slot selection with smart logic
   */
  const handleSlotPress = (hour: number) => {
    // Can't select booked or unavailable slots
    if (isTimeBooked(hour) || !isTimeAvailable(hour)) {
      Alert.alert("Không khả dụng", "Khung giờ này đã được đặt hoặc ngoài giờ hoạt động");
      return;
    }

    const now = Date.now();
    
    // Check for double tap on same slot
    if (lastTap && lastTap.hour === hour && now - lastTap.time < DOUBLE_TAP_DELAY) {
      // Double tap detected - reset selection
      console.log("[TIME SELECT] Double tap detected - Reset");
      handleReset();
      setLastTap(null);
      return;
    }

    // Update last tap
    setLastTap({ hour, time: now });

    if (selectedStart === null) {
      // First selection - set start time
      setSelectedStart(hour);
      setSelectedEnd(hour + SLOT_INTERVAL);
      console.log("[TIME SELECT] First selection:", hour);
    } else {
      // Already have a selection
      const distance = Math.abs(hour - selectedStart);
      
      // If clicked far away (more than 4 hours), reset and start new selection
      if (distance > 4) {
        console.log("[TIME SELECT] Far click detected - Reset and start new");
        setSelectedStart(hour);
        setSelectedEnd(hour + SLOT_INTERVAL);
        return;
      }

      // Otherwise, extend or shrink selection
      if (hour >= selectedStart) {
        // Extend selection forward
        const newEnd = hour + SLOT_INTERVAL;
        if (isRangeBooked(selectedStart, newEnd)) {
          Alert.alert("Lỗi", "Khoảng thời gian này có giờ đã được đặt!");
        } else {
          setSelectedEnd(newEnd);
          console.log("[TIME SELECT] Extended to:", newEnd);
        }
      } else {
        // Extend selection backward
        const newStart = hour;
        if (selectedEnd && isRangeBooked(newStart, selectedEnd)) {
          Alert.alert("Lỗi", "Khoảng thời gian này có giờ đã được đặt!");
        } else {
          setSelectedStart(newStart);
          console.log("[TIME SELECT] Extended backward to:", newStart);
        }
      }
    }
  };

  /**
   * Reset selection
   */
  const handleReset = () => {
    setSelectedStart(null);
    setSelectedEnd(null);
    setLastTap(null);
    console.log("[TIME SELECT] Reset selection");
  };

  const handleContinue = async () => {
    if (!selectedStart || !selectedEnd) {
      Alert.alert("Thông báo", "Vui lòng chọn thời gian!");
      return;
    }

    if (selectedEnd <= selectedStart) {
      Alert.alert("Lỗi", "Giờ kết thúc phải sau giờ bắt đầu!");
      return;
    }

    if (isRangeBooked(selectedStart, selectedEnd)) {
      Alert.alert("Lỗi", "Khoảng thời gian này đã có người đặt!");
      return;
    }

    try {
      const duration = selectedEnd - selectedStart;
      const startTimeStr = formatTime(selectedStart);
      const endTimeStr = formatTime(selectedEnd);

      await bookingDraftService.patchDraft({
        selectedStartTime: startTimeStr,
        selectedEndTime: endTimeStr,
        selectedDuration: duration,
      });
      
      await AsyncStorage.setItem("selectedStartTime", startTimeStr);
      await AsyncStorage.setItem("selectedEndTime", endTimeStr);
      await AsyncStorage.setItem("selectedDuration", duration.toString());

      console.log("[TIME SELECT] Saved to AsyncStorage:");
      console.log("  - Start:", startTimeStr);
      console.log("  - End:", endTimeStr);
      console.log("  - Duration:", duration);

      // Navigate to booking confirmation
      router.replace("/(tabs)/(stadiums)/booking-confirm");
    } catch (error) {
      console.error("Error saving time:", error);
      Alert.alert("Lỗi", "Không thể lưu thời gian đã chọn");
    }
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
        title="Chọn giờ đặt sân"
        subtitle={headerSubtitle}
        showBackButton
        onBackPress={async () => {
          const draft = await bookingDraftService.getDraft();
          const clusterId =
            draft.clusterId !== undefined
              ? String(draft.clusterId)
              : await AsyncStorage.getItem("clusterId");
          router.push({
            pathname: "/(tabs)/(stadiums)/field-select",
            params: { clusterId: clusterId || "" },
          });
        }}
      />

      <View className="w-full px-4 py-2">
        {/* Legend */}
        <View className="bg-white rounded-lg p-3 mb-4">
          <Text className="font-semibold mb-2">Chú thích:</Text>
          <View className="flex-row items-center justify-around">
            <View className="flex-row items-center">
              <View className="w-4 h-4 bg-green-500 rounded mr-2" />
              <Text className="text-xs text-gray-600">Trống</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-4 h-4 bg-red-400 rounded mr-2" />
              <Text className="text-xs text-gray-600">Đã đặt</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-4 h-4 bg-blue-500 rounded mr-2" />
              <Text className="text-xs text-gray-600">Đang chọn</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-center text-lg mt-4">Đang tải dữ liệu...</Text>
          </View>
        ) : (
          <>
            {/* Time Slot Selection */}
            <View className="bg-white rounded-xl p-4 mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="font-semibold text-base">
                  🕐 Chọn khung giờ
                </Text>
                {selectedStart !== null && (
                  <TouchableOpacity
                    onPress={handleReset}
                    className="bg-red-100 px-3 py-1 rounded-lg"
                  >
                    <Text className="text-red-600 text-xs font-semibold">
                      Đặt lại
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text className="text-xs text-gray-600 mb-3 text-center">
                💡 Nhấn 2 lần vào cùng 1 ô để đặt lại. Click ô xa ({">"}4 giờ) để chọn mới.
              </Text>

              {/* Time grid */}
              <View className="flex-row flex-wrap">
                {Array.from({ length: (MAX_HOUR - MIN_HOUR) * 2 }, (_, i) => {
                  const hour = MIN_HOUR + i * SLOT_INTERVAL;
                  const status = getSlotStatus(hour);
                  
                  return (
                    <TouchableOpacity
                      key={i}
                      className={`w-[23%] m-[1%] p-3 rounded-lg border-2 ${
                        status === "booked"
                          ? "bg-red-100 border-red-400"
                          : status === "selected"
                          ? "bg-blue-500 border-blue-600"
                          : status === "unavailable"
                          ? "bg-gray-100 border-gray-300"
                          : "bg-green-50 border-green-300"
                      }`}
                      onPress={() => handleSlotPress(hour)}
                      disabled={status === "booked" || status === "unavailable"}
                      activeOpacity={1}
                    >
                      <Text
                        className={`text-center text-xs font-bold ${
                          status === "booked"
                            ? "text-red-600"
                            : status === "selected"
                            ? "text-white"
                            : status === "unavailable"
                            ? "text-gray-400"
                            : "text-green-700"
                        }`}
                      >
                        {formatTime(hour)}
                      </Text>
                      {status === "booked" && (
                        <Ionicons
                          name="lock-closed"
                          size={12}
                          color="#dc2626"
                          style={{ alignSelf: "center", marginTop: 2 }}
                        />
                      )}
                      {status === "selected" && (
                        <Ionicons
                          name="checkmark"
                          size={12}
                          color="#ffffff"
                          style={{ alignSelf: "center", marginTop: 2 }}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Selected Time Summary */}
            {selectedStart !== null && selectedEnd !== null && (
              <View className="bg-blue-500 rounded-xl p-6 mb-4">
                <Text className="text-white text-sm font-medium mb-3">
                  ⏰ Thời gian đã chọn
                </Text>

                <View className="flex-row items-center mb-2">
                  <Ionicons name="time" size={20} color="white" />
                  <Text className="text-white ml-2 text-lg font-bold">
                    {formatTime(selectedStart)} - {formatTime(selectedEnd)}
                  </Text>
                </View>

                <View className="flex-row items-center mb-4">
                  <Ionicons name="hourglass" size={20} color="white" />
                  <Text className="text-white ml-2 text-base">
                    Thời lượng: {selectedEnd - selectedStart} giờ
                  </Text>
                </View>

                <View className="border-t border-blue-400 pt-3">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-blue-100 text-sm">Tạm tính</Text>
                    <Text className="text-white text-xl font-bold">
                      {formatPrice(selectedEnd - selectedStart, fieldPrice)}
                    </Text>
                  </View>
                  <Text className="text-blue-200 text-xs mt-1">
                    *Giá {fieldPrice.toLocaleString("vi-VN")}đ/giờ
                  </Text>
                </View>
              </View>
            )}

            {/* Instructions */}
            <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={20} color="#f59e0b" />
                <View className="flex-1 ml-2">
                  <Text className="text-sm text-gray-700 font-semibold mb-1">
                    Hướng dẫn:
                  </Text>
                  <Text className="text-xs text-gray-600">
                    • Nhấn vào ô xanh lá để chọn giờ bắt đầu{"\n"}
                    • Nhấn vào ô gần để mở rộng khoảng thời gian{"\n"}
                    • Nhấn đúp (2 lần nhanh) vào cùng ô để đặt lại{"\n"}
                    • Click ô xa {">"}4 giờ để chọn khung giờ mới{"\n"}
                    • Ô đỏ 🔒 = Đã đặt | Ô xanh dương ✓ = Đang chọn
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Continue Button */}
      {!loading && selectedStart !== null && selectedEnd !== null && (
        <View className="px-4 pb-4 bg-white border-t border-gray-200">
          <TouchableOpacity
            className="bg-blue-500 py-4 rounded-xl mt-4 flex-row items-center justify-center shadow-lg"
            onPress={handleContinue}
            activeOpacity={1}
          >
            <Ionicons name="checkmark-circle" size={24} color="white" />
            <Text className="text-white text-center font-bold text-lg ml-2">
              Xác nhận thời gian
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default TimeSelect;
