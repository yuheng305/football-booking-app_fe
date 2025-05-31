import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import HeaderUser from "@/component/HeaderUser";
import FooterUser from "@/component/FooterUser";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Định nghĩa kiểu dữ liệu cho booking
interface Booking {
  userName: string;
  phoneNumber: string;
  email: string;
  bookingId: string;
  clusterName: string;
  fieldName: string;
  date: string;
  startHour: number;
  address: string;
  slot: number;
  services: { name: string; price: number }[];
  price: number;
}

// Hàm rút ngắn bookingId
const shortenBookingId = (id: string) => {
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
};

const HistoryDetail = () => {
  const { bookingId } = useLocalSearchParams(); // Lấy bookingId từ params
  const [bookingData, setBookingData] = useState<Booking | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        // Lấy userData từ AsyncStorage
        const userDataString = await AsyncStorage.getItem("userData");
        if (!userDataString) {
          router.replace("/login");
          return;
        }
        const parsedUserData = JSON.parse(userDataString);
        setUserData(parsedUserData);

        // Kiểm tra bookingId
        if (!bookingId || typeof bookingId !== "string") {
          router.back();
          return;
        }

        const token = await AsyncStorage.getItem("authToken");
        if (!token) {
          router.replace("/login");
          return;
        }

        // Gọi API để lấy chi tiết booking
        const response = await fetch(
          `https://gopitch.onrender.com/bookings/${bookingId}`,
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

        const data: Booking = await response.json();
        setBookingData(data);
      } catch (error) {
        console.error("Lỗi khi lấy chi tiết đặt sân:", error);
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text>Đang tải...</Text>
      </SafeAreaView>
    );
  }

  if (!bookingData || !userData) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text>Không tìm thấy thông tin đặt sân</Text>
      </SafeAreaView>
    );
  }

  // Chuẩn bị dữ liệu để hiển thị
  const displayData = {
    id: bookingData.bookingId,
    cluster: bookingData.clusterName,
    field: bookingData.fieldName,
    date: bookingData.date,
    time: `${bookingData.startHour}:00`,
    address: bookingData.address,
    type: bookingData.slot === 1 ? "Đặt nửa sân" : "Đặt toàn sân",
    referee: bookingData.services.some((s) => s.name === "Thuê trọng tài")
      ? "Có"
      : "Không",
    services: bookingData.services
      .filter((s) => s.name !== "Thuê trọng tài")
      .map((s) => s.name),
    total: bookingData.price.toLocaleString() + " VND",
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1">
        <HeaderUser
          location="Tài khoản"
          time={userData.fullName || userData.name || "Người dùng"}
        />
        <View className="px-6 mt-6 space-y-4">
          {/* Mã đặt sân */}
          <View className="border-b border-gray-300 pb-2 pt-20">
            <Text className="text-xl font-semibold text-gray-800">
              Thông tin đặt sân #{shortenBookingId(displayData.id)}
            </Text>
          </View>

          {/* Cụm sân */}
          <View className="flex-row justify-between mt-2">
            <Text className="text-gray-600 font-semibold">Cụm sân :</Text>
            <Text className="text-gray-800">{displayData.cluster}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-600 font-semibold">Sân :</Text>
            <Text className="text-gray-800">{displayData.field}</Text>
          </View>

          {/* Ngày giờ */}
          <View className="flex-row justify-between">
            <Text className="text-gray-600 font-semibold">Ngày :</Text>
            <Text className="text-gray-800">{displayData.date}</Text>
          </View>

          {/* Thời gian */}
          <View className="flex-row justify-between">
            <Text className="text-gray-600 font-semibold">Thời gian :</Text>
            <Text className="text-gray-800">{displayData.time}</Text>
          </View>

          {/* Địa chỉ */}
          <View className="flex-row justify-between">
            <Text className="text-gray-600 font-semibold">Địa chỉ :</Text>
            <Text className="text-gray-800">{displayData.address}</Text>
          </View>

          {/* Loại hình */}
          <View className="flex-row justify-between">
            <Text className="text-gray-600 font-semibold">Loại hình :</Text>
            <Text className="text-gray-800">{displayData.type}</Text>
          </View>

          {/* Thuê trọng tài */}
          <View className="flex-row justify-between">
            <Text className="text-gray-600 font-semibold">
              Thuê trọng tài :
            </Text>
            <Text className="text-gray-800">{displayData.referee}</Text>
          </View>

          {/* Dịch vụ khác */}
          <View className="mb-2">
            <Text className="text-gray-600 font-semibold">Dịch vụ khác :</Text>
            {displayData.services.length > 0 ? (
              displayData.services.map((service, index) => (
                <Text key={index} className="text-gray-800 ml-4">
                  • {service}
                </Text>
              ))
            ) : (
              <Text className="text-gray-800 ml-4">• Không có</Text>
            )}
          </View>

          {/* Tổng cộng */}
          <View className="flex-row justify-between border-t border-gray-300 pt-4">
            <Text className="text-gray-600 font-semibold">Tổng cộng :</Text>
            <Text className="text-gray-800 font-semibold">
              {displayData.total}
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
