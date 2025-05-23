import React from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Image,
} from "react-native";
import { router } from "expo-router";
import HeaderUser from "@/component/HeaderUser";
import FooterUser from "@/component/FooterUser";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

const Payment = () => {
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
      {
        id: 2,
        date: "2023-10-01",
        time: "08:00",
        stadium: "Cụm sân 1",
        address: "Bình Thạnh",
        mini_stadium: "Sân A",
        type: "Đặt nửa sân",
        services: [
          "Nước uống",
          "Găng tay thủ môn",
          "Áo bib",
          "Quay lại trận đấu",
        ],
        price: 200000,
        status: "Đã thanh toán",
      },
    ],
  };

  // Create bookingData from the first item in bookingHistory
  const bookingData = {
    id: userData.bookingHistory[0].id,
    cluster: userData.bookingHistory[0].stadium,
    field: userData.bookingHistory[0].mini_stadium,
    date: userData.bookingHistory[0].date,
    time: userData.bookingHistory[0].time,
    address: userData.bookingHistory[0].address,
    type: userData.bookingHistory[0].type,
    referee: "Không",
    services: userData.bookingHistory[0].services,
    total: userData.bookingHistory[0].price.toLocaleString() + " VND",
  };
  const [showQRModal, setShowQRModal] = useState(false);
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1">
        <HeaderUser location="Tài khoản" time={userData.name} />
        <View className="px-6 space-y-4">
          {/* Mã đặt sân */}
          <View className="border-b border-gray-300 pb-2 pt-20">
            <Text className="text-xl font-semibold text-gray-800">
              Thông tin đặt sân #{bookingData.id}
            </Text>
          </View>

          {/* Cụm sân */}
          <View className="flex-row justify-between mt-2">
            <Text className="text-gray-600 font-semibold">Cụm sân :</Text>
            <Text className="text-gray-800">{bookingData.cluster}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-600 font-semibold">Sân :</Text>
            <Text className="text-gray-800">{bookingData.field}</Text>
          </View>

          {/* Ngày giờ */}
          <View className="flex-row justify-between">
            <Text className="text-gray-600 font-semibold">Ngày :</Text>
            <Text className="text-gray-800">{bookingData.date}</Text>
          </View>

          {/* Thời gian */}
          <View className="flex-row justify-between">
            <Text className="text-gray-600 font-semibold">Thời gian :</Text>
            <Text className="text-gray-800">{bookingData.time}</Text>
          </View>

          {/* Địa chỉ */}
          <View className="flex-row justify-between">
            <Text className="text-gray-600 font-semibold">Địa chỉ :</Text>
            <Text className="text-gray-800">{bookingData.address}</Text>
          </View>

          {/* Loại hình */}
          <View className="flex-row justify-between">
            <Text className="text-gray-600 font-semibold">Loại hình :</Text>
            <Text className="text-gray-800">{bookingData.type}</Text>
          </View>

          {/* Thuê trọng tài */}
          <View className="flex-row justify-between">
            <Text className="text-gray-600 font-semibold">
              Thuê trọng tài :
            </Text>
            <Text className="text-gray-800">{bookingData.referee}</Text>
          </View>

          {/* Dịch vụ khách */}
          <View className="mb-2">
            <Text className="text-gray-600 font-semibold">Dịch vụ khác :</Text>
            {bookingData.services.map((service, index) => (
              <Text key={index} className="text-gray-800 ml-4">
                • {service}
              </Text>
            ))}
          </View>

          {/* Tổng cộng */}
          <View className="flex-row justify-between border-t border-gray-300 pt-4">
            <Text className="text-gray-600 font-semibold">Tổng cộng :</Text>
            <Text className="text-gray-800 font-semibold">
              {bookingData.total}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowQRModal(true)}
            className="border border-black mt-4 px-4 py-3 rounded-lg"
          >
            <View className="flex-row items-center">
              <Image
                source={require("../../assets/images/momo.png")}
                className="w-12 h-12 mr-3"
                resizeMode="contain"
              />
              <Text className="text-xl font-bold text-black">
                Thanh toán qua Momo
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowQRModal(true)}
            className="border border-black mt-4 px-4 py-3 rounded-lg"
          >
            <View className="flex-row items-center">
              <Image
                source={require("../../assets/images/card.jpg")}
                className="w-12 h-12 mr-3"
                resizeMode="contain"
              />
              <Text className="text-xl font-bold text-black space-x-40">
                Thanh toán qua Thẻ nội địa
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowQRModal(true)}
            className="border border-black mt-4 px-4 py-3 rounded-lg"
          >
            <View className="flex-row items-center">
              <Image
                source={require("../../assets/images/Mastercard-logo.png")}
                className="w-12 h-12 mr-3"
                resizeMode="contain"
              />
              <Text className="text-xl font-bold text-black">
                Thanh toán qua Thẻ quốc tế
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      <Modal
        visible={showQRModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white p-6 rounded-xl shadow-lg items-center">
            <Text className="text-2xl font-bold text-green-600 mb-2">
              Thanh toán thành công!
            </Text>
            <TouchableOpacity
              onPress={() => setShowQRModal(false)}
              className="mt-4 bg-green-500 px-6 py-2 rounded-full"
            >
              <Text className="text-white font-semibold text-lg">Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Payment;
