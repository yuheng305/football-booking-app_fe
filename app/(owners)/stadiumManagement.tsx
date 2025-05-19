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

const stadiums = [
  { id: "1", name: "SAN1", status: "Đang hoạt động" },
  { id: "2", name: "SAN2", status: "Đang hoạt động" },
  { id: "3", name: "SAN3", status: "Bảo trì" },
];

export default function StadiumManagement() {
  const router = useRouter();
  const [filter, setFilter] = useState("Đang hoạt động");

  const filteredStadiums = stadiums.filter((stadium) => stadium.status === filter);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="w-full h-11 bg-black" />

      <View className="flex-row items-center px-4 pt-4">
        <TouchableOpacity
          className="w-10 h-10 bg-white border border-gray-200 rounded-xl items-center justify-center"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#1E232C" />
        </TouchableOpacity>

        <Text className="flex-1 font-bold text-[26px] text-[#1E232C] text-center">
          Danh sách sân
        </Text>

        <TouchableOpacity
          className="bg-[#0B8FAC] py-2 px-4 rounded-lg items-center"
          onPress={() => console.log("Thêm sân pressed")}
        >
          <Text className="text-white text-xs font-semibold">Thêm sân</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row justify-center gap-4 px-4 mt-6">
        <TouchableOpacity
          className={`${
            filter === "Đang hoạt động" ? "bg-[#119916]" : "bg-white border-2 border-[#119916]"
          } px-6 py-2 rounded-full items-center`}
          onPress={() => setFilter("Đang hoạt động")}
        >
          <Text
            className={`text-base font-medium ${
              filter === "Đang hoạt động" ? "text-white" : "text-[#119916]"
            }`}
          >
            Đang hoạt động
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`${
            filter === "Bảo trì" ? "bg-[#114F99]" : "bg-white border-2 border-[#114F99]"
          } px-6 py-2 rounded-full items-center`}
          onPress={() => setFilter("Bảo trì")}
        >
          <Text
            className={`text-base font-medium ${
              filter === "Bảo trì" ? "text-white" : "text-[#114F99]"
            }`}
          >
            Bảo trì
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 mt-6">
        {filteredStadiums.map((stadium) => (
          <View
            key={stadium.id}
            className="bg-white border border-[#11993C] rounded-lg mb-4 p-4 flex-row items-center justify-between"
          >
            <Text className="text-xl font-semibold text-black">{stadium.name}</Text>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                className="bg-white border-2 border-gray-500 rounded-full w-8 h-8 items-center justify-center"
                onPress={() => console.log(`Xem thông tin ${stadium.name}`)}
              >
                <Ionicons name="time-outline" size={20} color="#000000" />
              </TouchableOpacity>
              {stadium.status === "Đang hoạt động" ? (
                <TouchableOpacity
                  className="bg-white border-2 border-gray-500 rounded-full px-4 py-2"
                  onPress={() => console.log(`Bảo trì ${stadium.name}`)}
                >
                  <Text className="text-gray-500 text-base font-medium">Bảo trì</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  className="bg-white border-2 border-gray-500 rounded-full px-4 py-2"
                  onPress={() => console.log(`Hoạt động lại ${stadium.name}`)}
                >
                  <Text className="text-gray-500 text-base font-medium">Hoạt động lại</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                className="bg-[#C21010] rounded-full px-4 py-2"
                onPress={() => console.log(`Xóa ${stadium.name}`)}
              >
                <Text className="text-white text-base font-medium">Xóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}