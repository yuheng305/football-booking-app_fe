import { router } from "expo-router";
import { useState, useEffect } from "react";
import {
  SafeAreaView,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import HeaderUser from "@/component/HeaderUser";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Định nghĩa kiểu dữ liệu cho booking
interface Booking {
  bookingId: string;
  clusterName: string;
  fieldName: string;
  date: string;
  startHour: number;
  address: string;
}

const History = () => {
  const [history, setHistory] = useState<Booking[]>([]);
  const [userData, setUserData] = useState<any>(null); // Sử dụng any tạm thời, có thể thay bằng kiểu cụ thể
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserDataAndHistory = async () => {
      try {
        // Lấy userData từ AsyncStorage
        const userDataString = await AsyncStorage.getItem("userData");
        if (!userDataString) {
          Alert.alert("Lỗi", "Không tìm thấy thông tin người dùng!");
          router.replace("/login");
          return;
        }
        const parsedUserData = JSON.parse(userDataString);
        setUserData(parsedUserData);

        const userId = parsedUserData._id; // Giả sử _id là userId
        if (!userId) {
          Alert.alert("Lỗi", "Không tìm thấy userId!");
          return;
        }

        const token = await AsyncStorage.getItem("authToken");
        if (!token) {
          Alert.alert("Lỗi", "Không tìm thấy token, vui lòng đăng nhập lại!");
          router.replace("/login");
          return;
        }

        const response = await fetch(
          `https://gopitch.onrender.com/bookings/user/${userId}`,
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

        const data = await response.json();
        console.log("Dữ liệu booking:", data);

        // Giả sử API trả về mảng bookings
        const bookings: Booking[] = Array.isArray(data) ? data : [];
        setHistory(bookings);
      } catch (error) {
        console.error("Lỗi khi lấy lịch sử đặt sân:", error);
        Alert.alert("Lỗi", "Không thể tải lịch sử đặt sân. Vui lòng thử lại!");
      } finally {
        setLoading(false);
      }
    };

    fetchUserDataAndHistory();
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text>Đang tải...</Text>
      </SafeAreaView>
    );
  }

  if (!userData) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text>Không tìm thấy thông tin người dùng</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <HeaderUser
        location="Tài khoản"
        time={userData.fullName || userData.name || "Người dùng"}
      />

      <ScrollView className="px-4 mt-4">
        <Text className="text-lg font-semibold mb-2">Lịch sử đặt sân</Text>
        {history.length === 0 ? (
          <Text className="text-center text-gray-500 mt-6">
            Không có lịch sử đặt sân.
          </Text>
        ) : (
          history.map((item) => (
            <View
              key={item.bookingId}
              className="border-b border-black pb-3 mb-3"
            >
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-sm text-gray-600">
                    {item.date} {item.startHour}:00
                  </Text>
                  <Text className="text-lg font-bold mt-1">
                    {item.clusterName} - {item.address}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/historyDetails",
                      params: { bookingId: item.bookingId },
                    })
                  }
                  className="border border-gray-500 px-8 py-2 rounded-full"
                >
                  <Text className="text-gray-600 font-semibold text-lg">
                    Xem
                  </Text>
                </TouchableOpacity>
              </View>
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
