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

const HistoryDetail = () => {
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
        <View className="px-6 mt-6 space-y-4">
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

          {/* Nút QR Code */}
          <TouchableOpacity
            onPress={() => setShowQRModal(true)}
            className="border border-gray-300 rounded-full py-3 mt-4"
          >
            <Text className="text-center text-gray-800 font-semibold">
              QR CODE
            </Text>
          </TouchableOpacity>

          {/* Nút Quay lại */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-red-500 p-3 rounded-full mt-4"
          >
            <Text className="text-center text-white font-semibold text-lg">
              Quay lại
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Đảm bảo FooterUser không bị che */}
      <View className="pb-14">
        <FooterUser />
      </View>
      {/* Modal hiển thị QR Code */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showQRModal}
        onRequestClose={() => setShowQRModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white p-6 rounded-lg">
            <Image
              source={require("../../assets/images/qr.png")}
              className="w-64 h-64"
              resizeMode="contain"
            />
            <TouchableOpacity
              onPress={() => setShowQRModal(false)}
              className="bg-red-500 p-3 rounded mt-4"
            >
              <Text className="text-center text-white font-semibold">Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default HistoryDetail;
