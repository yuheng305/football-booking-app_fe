import { Text, View, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import { useState, useEffect, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import HeaderUser from "@/component/HeaderUser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fieldService } from "@/src/services/field.service";
import { bookingDraftService } from "@/src/services/booking-draft.service";

const DateSelect = () => {
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [clusterId, setClusterId] = useState<string>("");

  useEffect(() => {
    loadClusterId();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadClusterId();
    }, [])
  );

  const loadClusterId = async () => {
    try {
      const draft = await bookingDraftService.getDraft();

      if (draft.clusterId) {
        setClusterId(String(draft.clusterId));
      } else {
        const id = await AsyncStorage.getItem("clusterId");
        if (id) {
          setClusterId(id);
        }
      }

      if (draft.selectedDate) {
        setSelectedDate(draft.selectedDate);
      }
    } catch (error) {
      console.error("Error loading cluster ID:", error);
    }
  };

  // Format date from YYYY-MM-DD to DD/MM/YYYY
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  const handleContinue = async () => {
    if (selectedDate) {
      if (!clusterId) {
        Alert.alert("Lỗi", "Không tìm thấy thông tin cụm sân");
        return;
      }

      try {
        setLoading(true);

        await bookingDraftService.patchDraft({ selectedDate });
        await bookingDraftService.clearFieldsAfterDate();

        // Backward-compatibility key
        await AsyncStorage.setItem("selectedDate", selectedDate);

        console.log("[DATE SELECT] Lưu selectedDate:", selectedDate);

        // Gọi API availability ngay để lấy thông tin fields và slots
        const fieldsData = await fieldService.getFieldAvailability({
          clusterId: Number(clusterId),
          bookingDate: selectedDate,
        });

        console.log("[DATE SELECT] API Response:", fieldsData);

        // Filter only active fields with availability
        const availableFields = fieldsData.filter(
          (item) => item.field.status === "active" && item.available_slots.length > 0
        );

        if (availableFields.length === 0) {
          Alert.alert(
            "Thông báo",
            "Không có sân nào khả dụng trong ngày này. Vui lòng chọn ngày khác.",
            [{ text: "OK" }]
          );
          return;
        }

        // Navigate sang field selection với data đã load
        router.push({
          pathname: "/(tabs)/(stadiums)/field-select",
          params: { clusterId: clusterId },
        });
      } catch (error: any) {
        console.error("[DATE SELECT] Error:", error);
        Alert.alert(
          "Lỗi",
          error.message || "Không thể tải thông tin sân. Vui lòng thử lại."
        );
      } finally {
        setLoading(false);
      }
    } else {
      Alert.alert("Thông báo", "Vui lòng chọn ngày trước khi tiếp tục!");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={['top']}>
      <HeaderUser
        title="Chọn ngày đặt sân"
        showBackButton
        onBackPress={() => router.push("/(tabs)/stadium")}
      />

      <View className="w-full px-4">
        <View className="bg-white rounded-lg p-2 shadow mt-4">
          <Calendar
            style={{ height: 350 }}
            onDayPress={(day) => {
              console.log("Ngày được chọn:", day.dateString);
              setSelectedDate(day.dateString);
            }}
            markedDates={{
              [selectedDate]: { selected: true, selectedColor: "#3b82f6" },
            }}
            minDate={new Date().toISOString().split("T")[0]}
            theme={{
              backgroundColor: "#ffffff",
              calendarBackground: "#ffffff",
              textSectionTitleColor: "#000000",
              selectedDayBackgroundColor: "#3b82f6",
              selectedDayTextColor: "#ffffff",
              todayTextColor: "#3b82f6",
              dayTextColor: "#2d4150",
              textDisabledColor: "#d9e1e8",
              arrowColor: "#3b82f6",
            }}
          />
        </View>

        {selectedDate && (
          <View className="mt-4 p-4 bg-white rounded-lg shadow">
            <Text className="text-base font-semibold mb-2">
              Ngày đã chọn: {formatDate(selectedDate)}
            </Text>
            {loading ? (
              <View className="py-2">
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text className="text-center text-gray-800 font-medium mt-2">
                  Đang kiểm tra sân khả dụng...
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                className="h-11 rounded-lg bg-blue-500 items-center justify-center"
                onPress={handleContinue}
                activeOpacity={1}
              >
                <Text className="text-white font-semibold text-base">Tiếp tục</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default DateSelect;
