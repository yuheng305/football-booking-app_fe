import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  SafeAreaView,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import HeaderUser from "@/component/HeaderUser";

const History = () => {
  // Hardcoded userData truyền thẳng
  const userData = {
    id: 1,
    name: "Nguyễn Văn A",
    email: "huydt04@gmail.com",
    phone: "0123456789",
    username: "huydt04",
    bookingHistory: [
      {
        id: 1,
        date: "2023-10-01",
        time: "08:00",
        stadium: "Cụm sân 1",
        address: "Tân Bình",
        mini_stadium: "Sân A",
        type: "Đặt nửa sân",
        services: [
          "Nuớc uống",
          "Găng tay thủ môn",
          "Áo bib",
          "Quay lại trận đấu",
        ],
        price: 200000,
        status: "Đã thanh toán",
      },
    ],
  };

  const [history, setHistory] = useState(userData.bookingHistory);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <HeaderUser location="Tài khoản" time={userData.name} />

      <ScrollView className="px-4 mt-4">
        <Text className="text-lg font-semibold mb-2">Lịch sử đặt sân</Text>
        {history.length === 0 ? (
          <Text className="text-center text-gray-500 mt-6">
            Không có lịch sử đặt sân.
          </Text>
        ) : (
          history.map((item) => (
            <View key={item.id} className="border-b border-black pb-3 mb-3">
              <Text className="text-sm text-gray-600">
                #{item.id} - {item.date}
              </Text>
              <Text className="text-lg font-bold mt-1">
                {item.stadium} - {item.address}
              </Text>
              <Text className="text-sm text-gray-500">
                {item.time} • {item.mini_stadium} • {item.type}
              </Text>
              <Text className="text-sm text-green-600 mt-1">
                {item.status} - {item.price.toLocaleString("vi-VN")}đ
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        onPress={() => router.back()}
        className="items-center mt-4 mb-6"
      >
        <View className="border border-red-500 px-8 py-2 rounded-full">
          <Text className="text-red-600 font-semibold text-lg">Quay lại</Text>
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default History;
