import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

const bookings = [
  { id: "#2212700", field: "Sân 1", time: "17:00", date: "25/03/2025", status: "Sắp tới" },
  { id: "#234567", field: "Sân 1", time: "15:00", date: "25/03/2025", status: "Hoàn thành" },
  { id: "#0123456", field: "Sân 2", time: "17:00", date: "24/03/2025", status: "Chờ duyệt" },
  { id: "#9876543", field: "Sân 1", time: "17:00", date: "24/03/2025", status: "Chờ duyệt" },
];

export default function BookingManagement() {
  const router = useRouter();
  const [filter, setFilter] = useState("All");

  const filteredBookings = bookings.filter((booking) => {
    if (filter === "All") return true;
    return booking.status === filter;
  });

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Status bar */}
      <View className="w-full h-11 bg-black" />

      {/* Header section */}
      <View className="flex-row items-center px-4 pt-4">
        {/* Nút quay lại */}
        <TouchableOpacity
          className="w-10 h-10 bg-white border border-gray-200 rounded-xl items-center justify-center"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#1E232C" />
        </TouchableOpacity>

        {/* Tiêu đề */}
        <Text className="flex-1 font-bold text-[26px] text-[#1E232C] text-center">
          Quản lý đặt sân
        </Text>

        {/* Quản lý dịch vụ */}
        <TouchableOpacity
          className="ml-2"
          onPress={() => router.push("/(services)/serviceManagement")}
        >
          <Text className="text-[#114F99] text-base font-medium">Quản lý dịch vụ</Text>
        </TouchableOpacity>
      </View>

      {/* Nút lọc trạng thái */}
      <View className="flex-row justify-center gap-4 px-4 mt-6">
        <TouchableOpacity
          className={`${
            filter === "Sắp tới" ? "bg-[#119916]" : "bg-white border-2 border-[#119916]"
          } px-6 py-2 rounded-full items-center`}
          onPress={() => setFilter("Sắp tới")}
        >
          <Text
            className={`text-base font-medium ${
              filter === "Sắp tới" ? "text-white" : "text-[#119916]"
            }`}
          >
            Sắp tới
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`${
            filter === "Hoàn thành" ? "bg-[#114F99]" : "bg-white border-2 border-[#114F99]"
          } px-6 py-2 rounded-full items-center`}
          onPress={() => setFilter("Hoàn thành")}
        >
          <Text
            className={`text-base font-medium ${
              filter === "Hoàn thành" ? "text-white" : "text-[#114F99]"
            }`}
          >
            Hoàn thành
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`${
            filter === "Chờ duyệt" ? "bg-[#808080]" : "bg-white border-2 border-[#808080]"
          } px-6 py-2 rounded-full items-center`}
          onPress={() => setFilter("Chờ duyệt")}
        >
          <Text
            className={`text-base font-medium ${
              filter === "Chờ duyệt" ? "text-white" : "text-[#808080]"
            }`}
          >
            Chờ duyệt
          </Text>
        </TouchableOpacity>
      </View>

      {/* Danh sách đặt sân */}
      <ScrollView className="flex-1 px-4 mt-6">
        {filteredBookings.map((booking) => (
          <View
            key={booking.id}
            className="bg-white border border-[#11993C] rounded-lg mb-4 p-4 flex-row items-center justify-between"
          >
            <View>
              <Text className="text-xl font-semibold text-black">{booking.id}</Text>
              <Text className="text-base text-black">Sân: {booking.field}</Text>
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={20} color="#000000" />
                <Text className="text-base text-black ml-1">Giờ: {booking.time}</Text>
              </View>
              <Text className="text-base text-black">Ngày: {booking.date}</Text>
              <Text className="text-base text-black">Trạng thái: {booking.status}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                className="bg-[#0B8FAC] rounded-full px-4 py-2"
                onPress={() => console.log(`Xem chi tiết ${booking.id}`)}
              >
                <Text className="text-white text-base font-medium">Xem</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}