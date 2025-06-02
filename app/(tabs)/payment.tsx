import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Image,
  StyleSheet,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import HeaderUser from "@/component/HeaderUser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons"; // Sử dụng Ionicons từ Expo

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
  status: string;
}

const Payment = () => {
  const { bookingId } = useLocalSearchParams();
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingDetails, setBookingDetails] = useState<Booking | null>(null);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        if (!bookingId || typeof bookingId !== "string") {
          setError("Bạn không có đơn đặt sân nào cần thanh toán");
          return;
        }

        const token = await AsyncStorage.getItem("authToken");
        if (!token) {
          router.replace("/login");
          return;
        }

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
          throw new Error(
            `Lỗi khi lấy thông tin booking: ${response.statusText}`
          );
        }

        const data: Booking = await response.json();
        setBookingDetails(data);
      } catch (error: unknown) {
        console.error("Lỗi khi lấy thông tin đặt sân:", error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        setError(`Không thể lấy thông tin đặt sân: ${errorMsg}`);
      }
    };

    fetchBookingDetails();
  }, [bookingId]);

  const handlePayment = async () => {
    try {
      if (!bookingId || typeof bookingId !== "string") {
        setError("Bạn không có đơn đặt sân nào cần thanh toán");
        return;
      }

      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(
        `https://gopitch.onrender.com/bookings/${bookingId}/payment`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "completed" }),
        }
      );

      if (!response.ok) {
        throw new Error(`Lỗi khi thanh toán: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Thanh toán thành công:", data);
      setSuccessModalVisible(true);
    } catch (error: unknown) {
      console.error("Lỗi khi thanh toán:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setError(`Không thể thanh toán: ${errorMsg}`);
    }
  };

  const closeSuccessModal = () => {
    setSuccessModalVisible(false);
    router.push("/(tabs)/home");
  };

  const closeInfoModal = () => {
    setInfoModalVisible(false);
  };

  if (!bookingDetails) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <HeaderUser location="Tài khoản" time="" />
        <View className="flex-1 justify-center items-center">
          {error ? (
            <Text className="text-red-500 text-lg">{error}</Text>
          ) : (
            <Text className="text-lg">Đang tải thông tin...</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1">
        <HeaderUser
          location="Thanh toán"
          //time={bookingDetails.userName || "Người dùng"}
        />
        <View className="px-6 space-y-4">
          {/* Dòng chữ thông báo và icon thông tin */}
          <View className="flex-row justify-between items-center pt-20 border-b border-gray-300 pb-2">
            <Text className="text-xl font-semibold text-gray-800">
              Thông tin đặt sân
            </Text>
            <TouchableOpacity onPress={() => setInfoModalVisible(true)}>
              <Ionicons name="information-circle" size={24} color="#FF0000" />
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-between mt-2">
            <Text className="text-red-500 text-base">
              Bạn nên đọc kỹ thông tin ở trước khi thanh toán
            </Text>
          </View>
          <View className="flex-row justify-between mt-2">
            <Text className="text-gray-600 font-semibold">Cụm sân :</Text>
            <Text className="text-gray-800">{bookingDetails.clusterName}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-600 font-semibold">Sân :</Text>
            <Text className="text-gray-800">{bookingDetails.fieldName}</Text>
          </View>

          {/* Ngày giờ */}
          <View className="flex-row justify-between">
            <Text className="text-gray-600 font-semibold">Ngày :</Text>
            <Text className="text-gray-800">{bookingDetails.date}</Text>
          </View>

          {/* Thời gian */}
          <View className="flex-row justify-between">
            <Text className="text-gray-600 font-semibold">Thời gian :</Text>
            <Text className="text-gray-800">{bookingDetails.startHour}:00</Text>
          </View>

          {/* Địa chỉ */}
          <View className="flex-row justify-between">
            <Text className="text-gray-600 font-semibold">Địa chỉ :</Text>
            <Text className="text-gray-800">{bookingDetails.address}</Text>
          </View>

          {/* Loại hình */}
          <View className="flex-row justify-between">
            <Text className="text-gray-600 font-semibold">Loại hình :</Text>
            <Text className="text-gray-800">
              {bookingDetails.slot === 1 ? "Đặt nửa sân" : "Đặt toàn sân"}
            </Text>
          </View>

          {/* Thuê trọng tài */}
          <View className="flex-row justify-between">
            <Text className="text-gray-600 font-semibold">
              Thuê trọng tài :
            </Text>
            <Text className="text-gray-800">
              {bookingDetails.services.some((s) => s.name === "Thuê trọng tài")
                ? "Có"
                : "Không"}
            </Text>
          </View>

          {/* Dịch vụ khác */}
          <View className="mb-2">
            <Text className="text-gray-600 font-semibold">Dịch vụ khác :</Text>
            {bookingDetails.services
              .filter((s) => s.name !== "Thuê trọng tài")
              .map((service, index) => (
                <Text key={index} className="text-gray-800 ml-4">
                  • {service.name}
                </Text>
              ))}
          </View>

          {/* Tổng cộng */}
          <View className="flex-row justify-between border-t border-gray-300 pt-4">
            <Text className="text-gray-600 font-semibold">Tổng cộng :</Text>
            <Text className="text-gray-800 font-semibold">
              {bookingDetails.price.toLocaleString()} VND
            </Text>
          </View>

          {error && (
            <Text className="text-red-500 text-center mt-2">{error}</Text>
          )}

          <TouchableOpacity
            onPress={handlePayment}
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
            onPress={handlePayment}
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
            onPress={handlePayment}
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

      {/* Modal Thanh toán thành công */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={successModalVisible}
        onRequestClose={closeSuccessModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContainer}>
            <TouchableOpacity
              style={styles.successCloseButton}
              onPress={closeSuccessModal}
            >
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.successCheckmarkContainer}>
              <Ionicons
                name="checkmark-circle-outline"
                size={60}
                color="#119916"
              />
            </View>
            <Text style={styles.successText}>Thanh toán thành công</Text>
          </View>
        </View>
      </Modal>

      {/* Modal Thông tin */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={infoModalVisible}
        onRequestClose={closeInfoModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.infoModalContainer}>
            <TouchableOpacity
              style={styles.infoCloseButton}
              onPress={closeInfoModal}
            >
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.infoCheckmarkContainer}>
              <Ionicons
                name="information-circle-outline"
                size={60}
                color="#119916"
              />
            </View>
            <Text style={styles.infoText}>
              Sau khi thanh toán thành công, để được xác nhận sử dụng sân và các
              dịch vụ đã đặt. Bạn cần đưa mã QR cho nhân viên. Vị trí mã QR:
              “Tài khoản” → “Lịch sử đặt sân” → “QR Code”
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Styles cho Modal
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  // Styles cho modal Thanh toán thành công
  successModalContainer: {
    width: 300, // Nhỏ hơn
    height: 180, // Nhỏ hơn
    backgroundColor: "#E3FFE2",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  successCloseButton: {
    position: "absolute",
    top: 18,
    left: 240, // Điều chỉnh để căn chỉnh với kích thước nhỏ hơn
    width: 38,
    height: 38,
    backgroundColor: "#808080",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  successCheckmarkContainer: {
    position: "absolute",
    top: 50,
    left: 110, // Điều chỉnh để căn giữa với modal nhỏ hơn
    width: 60,
    height: 60,
  },
  successText: {
    position: "absolute",
    top: 123,
    left: 10,
    width: 280,
    height: 28,
    fontFamily: "Exo",
    fontWeight: "700",
    fontSize: 24,
    lineHeight: 28,
    textAlign: "center",
    letterSpacing: -1,
    color: "#119916",
  },
  // Styles cho modal Thông tin
  infoModalContainer: {
    width: 310, // Lớn hơn
    height: 250, // Lớn hơn
    backgroundColor: "#E3FFE2",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  infoCloseButton: {
    position: "absolute",
    top: 18,
    left: 250, // Vị trí phù hợp với modal lớn hơn
    width: 38,
    height: 38,
    backgroundColor: "#808080",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  infoCheckmarkContainer: {
    position: "absolute",
    top: 50,
    left: 120, // Căn giữa với modal lớn hơn
    width: 60,
    height: 60,
  },
  infoText: {
    position: "absolute",
    top: 123,
    left: 10,
    width: 290,
    height: 100,
    fontFamily: "Exo",
    fontWeight: "700",
    fontSize: 16,
    lineHeight: 20,
    textAlign: "center",
    letterSpacing: -1,
    color: "#119916",
  },
});

export default Payment;
