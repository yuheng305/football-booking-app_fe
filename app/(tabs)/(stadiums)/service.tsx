import React, { useEffect, useState, useRef } from "react";
import {
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import Header from "@/component/Header";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Component đếm ngược
const CountdownTimer = ({
  initialSeconds,
  onTimeUp,
  isActive,
}: {
  initialSeconds: number;
  onTimeUp: () => void;
  isActive: boolean;
}) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    if (secondsLeft <= 0) {
      onTimeUp();
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [secondsLeft, onTimeUp, isActive]);

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
  const { fieldId, clusterId, bookingTime } = useLocalSearchParams();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [staticServices, setStaticServices] = useState<
    { _id: string; name: string; price: number }[]
  >([]);
  const [dynamicServices, setDynamicServices] = useState<
    { _id: string; name: string; price: number }[]
  >([]);
  const [sumService, setSumService] = useState<number>(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [timeUpModalVisible, setTimeUpModalVisible] = useState(false);
  const [noticeModalVisible, setNoticeModalVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isTimerActive, setIsTimerActive] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // Thêm state cho selectedDate
  const navigation = useNavigation();

  // Lấy selectedDate từ AsyncStorage khi component mount
  useEffect(() => {
    const loadSelectedDate = async () => {
      try {
        const date = await AsyncStorage.getItem("selectedDate");
        console.log("Selected Date từ AsyncStorage trong Service:", date);
        setSelectedDate(date);
      } catch (error) {
        console.error("Lỗi khi lấy ngày từ AsyncStorage:", error);
        setError("Không thể lấy ngày đã chọn. Vui lòng quay lại.");
      }
    };
    loadSelectedDate();
  }, []);

  // Lấy dữ liệu static và dynamic services từ API
  const fetchServices = async () => {
    if (!clusterId) {
      setError("Không tìm thấy clusterId");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        console.log("Không tìm thấy token");
        router.replace("/login");
        return;
      }

      const staticResponse = await fetch(
        `https://gopitch.onrender.com/clusters/${clusterId}/static-services`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!staticResponse.ok) {
        throw new Error(
          `Lỗi khi gọi API static services: ${staticResponse.statusText}`
        );
      }

      const staticData = await staticResponse.json();
      setStaticServices(staticData);

      const dynamicResponse = await fetch(
        `https://gopitch.onrender.com/clusters/${clusterId}/dynamic-services`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!dynamicResponse.ok) {
        throw new Error(
          `Lỗi khi gọi API dynamic services: ${dynamicResponse.statusText}`
        );
      }

      const dynamicData = await dynamicResponse.json();
      setDynamicServices(dynamicData);

      const staticServiceNames = staticData.map((item: any) => item.name);
      setSelectedServices(staticServiceNames);
    } catch (error: unknown) {
      console.error("Lỗi khi lấy dữ liệu dịch vụ:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setError(`Không thể lấy dữ liệu dịch vụ: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [clusterId]);

  // Theo dõi sự kiện điều hướng để tạm dừng/tiếp tục đồng hồ
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener("focus", () => {
      setIsTimerActive(true);
    });

    const unsubscribeBlur = navigation.addListener("blur", () => {
      setIsTimerActive(false);
    });

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  const handleToggleService = (service: string) => {
    if (staticServices.some((item) => item.name === service)) {
      return;
    }

    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((item) => item !== service)
        : [...prev, service]
    );
  };

  useEffect(() => {
    let total = 0;
    [...staticServices, ...dynamicServices].forEach((item) => {
      if (selectedServices.includes(item.name)) {
        total += item.price;
      }
    });
    setSumService(total);
  }, [selectedServices, staticServices, dynamicServices]);

  const handleBooking = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        console.log("Không tìm thấy token");
        router.replace("/login");
        return;
      }

      const userDataString = await AsyncStorage.getItem("userData");
      if (!userDataString) {
        console.log("Không tìm thấy userData");
        router.replace("/login");
        return;
      }
      const userData = JSON.parse(userDataString);
      const userId = userData._id;
      if (!userId) {
        console.log("Không tìm thấy userId");
        router.replace("/login");
        return;
      }

      if (!fieldId || !clusterId || !bookingTime || !selectedDate) {
        setError("Thiếu thông tin cần thiết để đặt sân");
        setModalVisible(false);
        return;
      }

      const startHour = parseInt(bookingTime.toString().split(":")[0], 10);

      const selectedServicesData = [...dynamicServices]
        .filter((item) => selectedServices.includes(item.name))
        .map((item) => ({
          name: item.name,
          price: item.price,
        }));

      const requestBody = {
        userId,
        clusterId,
        fieldId,
        date: selectedDate, // Sử dụng selectedDate thay vì currentDate
        startHour,
        status: "pending",
        services: selectedServicesData,
      };

      console.log("Request body:", requestBody);

      const response = await fetch("https://gopitch.onrender.com/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Lỗi khi gọi API: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Đặt sân thành công:", data);

      await AsyncStorage.setItem("currentBookingId", data._id);

      setModalVisible(false);
    } catch (error: unknown) {
      console.error("Lỗi khi đặt sân:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setError(`Không thể đặt sân: ${errorMsg}`);
      setModalVisible(false);
    }
  };

  const handleModalAction = async (action: "cancel" | "pay") => {
    await handleBooking();
    if (action === "pay") {
      const bookingId = await AsyncStorage.getItem("currentBookingId");
      if (bookingId) {
        setIsTimerActive(false);
        router.push({
          pathname: "/payment",
          params: { bookingId },
        });
      } else {
        setError("Không tìm thấy bookingId");
      }
    }
  };

  const handleTimeUp = () => {
    if (isTimerActive) {
      setTimeUpModalVisible(true);
    }
  };

  const handleTimeUpModalClose = () => {
    setTimeUpModalVisible(false);
    setIsTimerActive(false);
    router.replace("/(tabs)/home");
  };

  // Format date để hiển thị trong Header
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Chưa chọn ngày";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <Header />

      <View className="w-full px-4 flex-row justify-between items-center mb-4">
        <TouchableOpacity
          className="bg-blue-400 rounded-lg max-w-[150px] h-16 p-2 m-2 flex-1 items-center justify-center"
          onPress={() => setNoticeModalVisible(true)}
        >
          <Text className="text-white font-semibold text-center py-2">
            Lưu ý
          </Text>
        </TouchableOpacity>

        <View className="bg-yellow-300 rounded-lg max-w-[150px] h-16 p-2 m-2 flex-1 items-center justify-center">
          <Text className="font-semibold text-center text-sm">
            Thời gian đặt:
          </Text>
          <CountdownTimer
            initialSeconds={300}
            onTimeUp={handleTimeUp}
            isActive={isTimerActive}
          />
        </View>
      </View>

      {loading && <Text className="text-center text-lg mb-4">Đang tải...</Text>}

      {error && <Text className="text-center text-red-500 mb-4">{error}</Text>}

      <Text className="text-lg font-semibold text-gray-800 px-4 mb-2">
        Dịch vụ mặc định
      </Text>
      {staticServices.map((item, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => handleToggleService(item.name)}
          disabled={true}
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 10,
            backgroundColor: "#46d73f",
            padding: 10,
            marginHorizontal: 10,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#2e7d32",
            opacity: 0.6,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              color: "#000",
              marginLeft: 10,
            }}
          >
            {item.name} - {item.price.toLocaleString("vi-VN")}đ
          </Text>
        </TouchableOpacity>
      ))}

      <Text className="text-lg font-semibold text-gray-800 px-4 mb-2">
        Dịch vụ tùy chọn
      </Text>
      {dynamicServices.map((item, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => handleToggleService(item.name)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 10,
            backgroundColor: selectedServices.includes(item.name)
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
              color: selectedServices.includes(item.name) ? "#fff" : "#4caf50",
              marginLeft: 10,
            }}
          >
            {item.name} - {item.price.toLocaleString("vi-VN")}đ
          </Text>
        </TouchableOpacity>
      ))}

      <View className="p-4 mt-4 border-t border-gray-300">
        <Text style={{ fontSize: 18, fontWeight: "bold", color: "#4caf50" }}>
          Thành tiền: {sumService.toLocaleString("vi-VN")}đ
        </Text>
      </View>

      <View className="flex-row justify-center items-center mt-4">
        <TouchableOpacity
          className="border border-red-500 bg-white px-8 py-2 rounded-full"
          onPress={() => {
            setIsTimerActive(false);
            router.back();
          }}
        >
          <Text className="text-red-600 font-semibold text-lg">Quay lại</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="border border-red-500 bg-white px-8 py-2 rounded-full ml-10"
          onPress={() => setModalVisible(true)}
        >
          <Text className="text-red-600 font-semibold text-lg">Đặt sân</Text>
        </TouchableOpacity>
      </View>

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
                onPress={() => handleModalAction("cancel")}
                className="px-4 py-2 rounded-md bg-gray-200"
              >
                <Text className="text-gray-700">Hủy</Text>
              </Pressable>

              <Pressable
                onPress={() => handleModalAction("pay")}
                className="px-4 py-2 rounded-md bg-green-500 ml-4"
              >
                <Text className="text-white">Thanh toán</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={timeUpModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleTimeUpModalClose}
      >
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50 px-6">
          <View className="bg-white p-6 rounded-xl w-full">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-center flex-1">
                Thời gian đặt sân đã hết
              </Text>
              <Pressable onPress={handleTimeUpModalClose}>
                <Text className="text-gray-500 text-lg">✕</Text>
              </Pressable>
            </View>
            <Text className="text-gray-700 mb-4 text-center">
              Thời gian đặt sân đã hết, vui lòng thực hiện lại thao tác đặt sân.
            </Text>
            <TouchableOpacity
              className="bg-blue-500 px-6 py-2 rounded-md mx-auto"
              onPress={handleTimeUpModalClose}
            >
              <Text className="text-white font-semibold">Trở về trang chủ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={noticeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNoticeModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50 px-6">
          <View className="bg-white p-4 rounded-lg w-full max-w-md mx-auto">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-xl font-semibold text-center flex-1">
                Lưu ý
              </Text>
              <Pressable onPress={() => setNoticeModalVisible(false)}>
                <Text className="text-gray-500 text-base">✕</Text>
              </Pressable>
            </View>
            <Text className="text-gray-700 mb-2 text-justify text-base">
              Theo chính sách, các trận đấu ghép cần có sự chỉ đạo của trọng tài
              để đảm bảo công bằng.
            </Text>
            <TouchableOpacity
              className="bg-blue-500 px-4 py-1 rounded-md mx-auto mt-2"
              onPress={() => setNoticeModalVisible(false)}
            >
              <Text className="text-white font-semibold text-base">Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Service;
