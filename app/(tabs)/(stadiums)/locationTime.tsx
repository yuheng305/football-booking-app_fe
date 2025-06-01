import React, { useState, useEffect } from "react";
import {
  Text,
  SafeAreaView,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Header from "@/component/Header";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Field {
  _id: string;
  name: string;
  openHour: number;
  closeHour: number;
  isMaintain: boolean;
  clusterId: string;
  schedules: any[];
  __v: number;
}

interface FieldResponse {
  field: Field;
  slotbooked: number;
}

const availableTime = [
  { id: 1, time: "08:00" },
  { id: 2, time: "09:00" },
  { id: 3, time: "10:00" },
  { id: 4, time: "11:00" },
  { id: 5, time: "12:00" },
  { id: 6, time: "13:00" },
  { id: 7, time: "14:00" },
  { id: 8, time: "15:00" },
  { id: 9, time: "16:00" },
  { id: 10, time: "17:00" },
  { id: 11, time: "18:00" },
  { id: 12, time: "19:00" },
  { id: 13, time: "20:00" },
  { id: 14, time: "21:00" },
  { id: 15, time: "22:00" },
];

const LocationTime = () => {
  const { clusterId } = useLocalSearchParams();
  const [bookingTime, setBookingTime] = useState("");
  const [fields, setFields] = useState<FieldResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFields = async (hour: string) => {
    if (!clusterId) {
      setError("Không tìm thấy clusterId");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        console.log("Không tìm thấy token");
        router.replace("/login");
        return;
      }

      const currentDate = new Date().toISOString().split("T")[0];
      const hourNumber = parseInt(hour.split(":")[0], 10);

      const response = await fetch(
        `https://gopitch.onrender.com/fields/${clusterId}?date=${currentDate}&hour=${hourNumber}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Lỗi khi gọi API: ${response.statusText}`);
      }

      const data: FieldResponse[] = await response.json();
      console.log("Dữ liệu từ API:", data);
      setFields(data);
    } catch (error: unknown) {
      console.error("Lỗi khi lấy danh sách sân con:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setError(`Không thể lấy danh sách sân: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookingTime) {
      fetchFields(bookingTime);
    } else {
      setFields([]);
    }
  }, [bookingTime, clusterId]);

  const handleLogoPress = () => {
    router.push("/(tabs)/home");
  };

  const handleFieldPress = (fieldId: string) => {
    console.log(`Chọn sân ${fieldId}`);
    router.push({
      pathname: "/(tabs)/(stadiums)/service",
      params: { fieldId, clusterId, bookingTime },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header */}
      <Header location="Cụm sân A" time={bookingTime} />

      {/* Main scrollable content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Time Picker */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 8 }}
          className="mt-4"
        >
          {availableTime.map((timeSlot) => {
            const isSelected = timeSlot.time === bookingTime;

            return (
              <TouchableOpacity
                key={timeSlot.id}
                onPress={() => setBookingTime(timeSlot.time)}
                className={`rounded-2xl min-w-[80px] h-12 p-2 m-2 border-2 ${
                  isSelected
                    ? "bg-green-500 border-green-700"
                    : "bg-white border-green-500"
                }`}
              >
                <Text
                  className={`font-semibold text-center text-xl ${
                    isSelected ? "text-white" : "text-green-500"
                  }`}
                >
                  {timeSlot.time}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Stadium List */}
        {loading && (
          <Text className="text-center text-lg mt-4">Đang tải...</Text>
        )}

        {error && (
          <Text className="text-center text-red-500 mt-4">{error}</Text>
        )}

        {!loading && !error && bookingTime && fields.length > 0 && (
          <View className="mt-4 px-4">
            {fields.map((item) => (
              <TouchableOpacity
                key={item.field._id}
                onPress={
                  item.slotbooked === 2
                    ? undefined
                    : () => handleFieldPress(item.field._id)
                }
                className={`rounded-full p-4 my-2 border-2 ${
                  item.slotbooked === 2
                    ? "bg-white border-red-500"
                    : "bg-green-500 border-green-500"
                }`}
                disabled={item.slotbooked === 2}
              >
                <View className="flex-row items-center">
                  <Text className="text-xl font-semibold px-4">
                    {item.field.name}
                  </Text>
                  {item.slotbooked === 2 ? (
                    <Text className="text-xl text-red-500">Đã được đặt</Text>
                  ) : (
                    <Text className="text-xl text-white">
                      {item.slotbooked > 0 ? "Tìm đối thủ" : "Trống"}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!loading && !error && bookingTime && fields.length === 0 && (
          <Text className="text-center text-lg mt-4">
            Không có sân nào vào thời điểm này.
          </Text>
        )}
      </ScrollView>

      {/* Nút Quay lại được căn giữa */}
      <TouchableOpacity
        className="border border-red-500 bg-white px-8 py-2 rounded-full mx-auto mb-4"
        onPress={() => router.back()}
      >
        <Text className="text-red-600 font-semibold text-lg">Quay lại</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default LocationTime;
