import { SafeAreaView, Text, View, Button } from "react-native";
import { Calendar } from "react-native-calendars";
import { useState } from "react";
import { router } from "expo-router";
import Header from "@/component/Header";

const Stadium = () => {
  const [selectedDate, setSelectedDate] = useState("");

  // Format date from YYYY-MM-DD to DD/MM/YYYY
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header */}
      {/* <View className="h-20 w-full bg-black flex-row justify-end items-center px-4">
        <Image
          source={require("../../assets/images/logo.png")}
          className="w-32 h-20"
          resizeMode="contain"
        />
      </View> */}
      <Header />

      {/* Content */}
      <View className="w-full px-4">
        <Text className="text-2xl font-semibold mt-4 mb-2">
          Chọn ngày đặt sân
        </Text>

        {/* Calendar */}
        <View className="bg-white rounded-lg p-2 shadow mt-6">
          <Calendar
            style={{ height: 350 }}
            onDayPress={(day) => {
              console.log("selected day", day);
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

        {/* Selected Date Display */}
        {selectedDate && (
          <View className="mt-4 p-4 bg-white rounded-lg shadow">
            <Text className="text-base font-semibold mb-2">
              Ngày đã chọn: {formatDate(selectedDate)}
            </Text>
            <Button
              title="Chọn địa điểm"
              onPress={() => router.push("/(stadiums)/location")}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default Stadium;
