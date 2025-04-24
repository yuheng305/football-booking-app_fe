import React, { useState } from "react";
import {
  Text,
  SafeAreaView,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import Header from "@/component/Header";

const availableTime = [
  { id: 1, time: "08:00" },
  { id: 2, time: "09:00" },
  { id: 3, time: "10:00" },
  { id: 4, time: "11:00" },
  { id: 5, time: "12:00" },
  { id: 6, time: "13:00" },
  { id: 7, time: "14:00" },
  { id: 8, time: "15:00" },
];

const ministadiumData = [
  { id: 1, name: "Sân 1", status: "Tìm đối thủ để ghép trận" },
  { id: 2, name: "Sân 2", status: "Trống" },
  { id: 3, name: "Sân 3", status: "Đã được đặt" },
  { id: 4, name: "Sân 4", status: "Trống" },
  { id: 5, name: "Sân 5", status: "Tìm đối thủ để ghép trận" },
  { id: 6, name: "Sân 6", status: "Đã được đặt" },
  { id: 7, name: "Sân 7", status: "Trống" },
  { id: 8, name: "Sân 8", status: "Đã được đặt" },
  { id: 9, name: "Sân 9", status: "Trống" },
  { id: 10, name: "Sân 10", status: "Tìm đối thủ để ghép trận" },
];

const LocationTime = () => {
  const handleLogoPress = () => {
    router.push("/(tabs)/home");
  };

  const [bookingTime, setBookingTime] = useState("");

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header */}
      {/* <View className="h-20 w-full bg-black flex-row justify-end items-center px-4">
        <View className="items-start flex-1">
          <Text className="text-green-500 text-3xl font-bold">Cụm sân A</Text>
        </View>
        <TouchableOpacity onPress={handleLogoPress}>
          <Image
            source={require("../../assets/images/logo.png")}
            className="w-32 h-20"
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View> */}
      <Header location="Cụm sân A" time={bookingTime} />

      {/* Content */}

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
        {bookingTime !== "" && (
          <View className="mt-4 px-4">
            {ministadiumData.map((stadium) => (
              <TouchableOpacity
                key={stadium.id}
                onPress={() => router.push("/(stadiums)/service")}
                className={`rounded-2xl p-4 my-2 border-2 ${
                  stadium.status === "Đã được đặt"
                    ? "bg-white border-red-500"
                    : "bg-green-500 border-green-500"
                }`}
              >
                <View className="flex-row items-center">
                  <Text className="text-xl font-semibold px-4">
                    {stadium.name}
                  </Text>
                  <Text className="text-xl">{stadium.status}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default LocationTime;
