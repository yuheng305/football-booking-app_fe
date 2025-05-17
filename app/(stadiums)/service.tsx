import React, { useEffect, useState } from "react";
import {
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import Header from "@/component/Header";
// import FooterStadium from "@/component/FooterStadium";

const services = [
  { service: "Thời gian (1 tiếng)", price: "100.000đ" },
  { service: "Thuê trọng tài", price: "200.000đ" },
  { service: "Thuê thủ môn", price: "80.000đ" },
  { service: "Nước uống", price: "150.000đ" },
  { service: "Áo bibs (10 cái)", price: "50.000đ" },
  { service: "Găng tay thủ môn", price: "200.000đ" },
  { service: "Quay lại trận đấu", price: "90.000đ" },
];

// Component đếm ngược
const CountdownTimer = ({ initialSeconds }: { initialSeconds: number }) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft]);

  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <Text className="font-semibold text-center text-red-600">
      Còn lại: {formatTime(secondsLeft)}
    </Text>
  );
};

const Service = () => {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [sumService, setSumService] = useState<number>(0);
  const [modalVisible, setModalVisible] = useState(false);

  const handleToggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((item) => item !== service)
        : [...prev, service]
    );
  };

  useEffect(() => {
    let total = 0;
    for (let item of services) {
      if (selectedServices.includes(item.service)) {
        const numericPrice = parseInt(item.price.replace(/[^\d]/g, ""));
        total += numericPrice;
      }
    }
    setSumService(total);
  }, [selectedServices]);

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <Header />

      <View className="w-full px-4 flex-row justify-between items-center mb-4">
        <TouchableOpacity className="bg-green-500 items-center rounded-2xl w-1/2 h-20 p-2 m-2">
          <Text className="text-white font-semibold text-center py-4">
            Bảng giá dịch vụ
          </Text>
        </TouchableOpacity>

        <View className="bg-yellow-300 rounded-2xl w-1/2 h-20 p-2 m-2 items-center justify-center">
          <Text className="font-semibold text-center">Thời gian đặt:</Text>
          <CountdownTimer initialSeconds={300} />
        </View>
      </View>

      {services.map((item, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => handleToggleService(item.service)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 10,
            backgroundColor: selectedServices.includes(item.service)
              ? "#4caf50"
              : "#fff",
            padding: 10,
            marginHorizontal: 10,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#4caf50",
          }}
        >
          <Text
            style={{
              fontSize: 16,
              color: selectedServices.includes(item.service)
                ? "#fff"
                : "#4caf50",
              marginLeft: 10,
            }}
          >
            {item.service} - {item.price}
          </Text>
        </TouchableOpacity>
      ))}

      <View className="p-4 mt-4 border-t border-gray-300">
        <Text style={{ fontSize: 18, fontWeight: "bold", color: "#4caf50" }}>
          Thành tiền: {sumService.toLocaleString("vi-VN")}đ
        </Text>
      </View>

      {/* Nút hành động */}
      <View className="flex-row justify-center items-center mt-4">
        <TouchableOpacity
          className="border border-red-500 px-8 py-2 rounded-full"
          onPress={() => router.back()}
        >
          <Text className="text-red-600 font-semibold text-lg">Quay lại</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="border border-red-500 px-8 py-2 rounded-full ml-10"
          onPress={() => setModalVisible(true)}
        >
          <Text className="text-red-600 font-semibold text-lg">Thanh toán</Text>
        </TouchableOpacity>
      </View>

      {/* Modal cảnh báo */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50 px-6">
          <View className="bg-white p-6 rounded-xl w-full">
            <Text className="text-lg font-semibold text-center mb-4">
              Bạn cần thanh toán trước giờ thi đấu ít nhất 1 tiếng.
            </Text>
            <Text className="text-gray-700 mb-4 text-justify">
              Trong thời gian chờ xác nhận, chúng tôi có thể hủy đơn đặt sân nếu
              thấy không phù hợp. Bạn có thể thanh toán ngay tại đây hoặc trong
              mục “Thanh toán” của ứng dụng.
            </Text>

            <View className="flex-row justify-end space-x-4">
              <Pressable
                onPress={() => setModalVisible(false)}
                className="px-4 py-2 rounded-md bg-gray-200"
              >
                <Text className="text-gray-700">Hủy</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setModalVisible(false);
                  router.push("/payment");
                }}
                className="px-4 py-2 rounded-md bg-green-500 ml-4"
              >
                <Text className="text-white">Thanh toán</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* <View className="pb-14">
        <FooterStadium />
      </View> */}
    </SafeAreaView>
  );
};

export default Service;
