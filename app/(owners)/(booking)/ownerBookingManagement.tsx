import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Booking {
  id: string; // Original bookingId from API
  displayId: string; // Simplified display ID (e.g., #1, #2)
  field: string;
  time: string;
  date: string;
  status: string;
}

export default function BookingManagement() {
  const router = useRouter();
  const [filter, setFilter] = useState("All");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        // Fetch ownerId from AsyncStorage
        const userDataString = await AsyncStorage.getItem("userData");
        if (!userDataString) {
          console.log("Không tìm thấy userData");
          router.replace("/login");
          return;
        }
        const userData = JSON.parse(userDataString);
        const ownerId = userData._id;
        if (!ownerId) {
          console.log("Không tìm thấy ownerId");
          router.replace("/login");
          return;
        }

        // Fetch token for Authorization
        const token = await AsyncStorage.getItem("authToken");
        if (!token) {
          console.log("Không tìm thấy token");
          router.replace("/login");
          return;
        }

        // Fetch bookings from all three endpoints
        const endpoints = [
          {
            url: `https://gopitch.onrender.com/bookings/owner/${ownerId}/upcoming`,
            status: "Sắp tới",
          },
          {
            url: `https://gopitch.onrender.com/bookings/owner/${ownerId}/completed`,
            status: "Hoàn thành",
          },
          {
            url: `https://gopitch.onrender.com/bookings/owner/${ownerId}/pending`,
            status: "Chờ duyệt",
          },
        ];

        const bookingPromises = endpoints.map(async ({ url, status }) => {
          const response = await fetch(url, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Lỗi khi gọi API ${url}: ${response.statusText}`);
          }

          const data = await response.json();
          console.log(`Dữ liệu từ API ${url}:`, data);

          // Map API response to Booking interface with a displayId
          return data.map((item: any, index: number) => ({
            id: item.bookingId, // Original ID for API use
            displayId: `#${index + 1}`, // Simplified sequential ID
            field: item.fieldName,
            time: `${item.startHour}:00`, // Format startHour to time string (e.g., "12:00")
            date: item.date.split("T")[0], // Extract date part (e.g., "2025-08-24")
            status: status, // Use the status based on the endpoint
          }));
        });

        // Wait for all API calls to complete
        const results = await Promise.all(bookingPromises);
        // Flatten the results into a single array of bookings
        const allBookings = results.flat();
        setBookings(allBookings);
      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu đặt sân:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const filteredBookings = bookings.filter((booking) => {
    if (filter === "All") return true;
    return booking.status === filter;
  });

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Text className="text-center text-lg mt-10">Đang tải...</Text>
      </SafeAreaView>
    );
  }

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
          Quản lý đặt sân
        </Text>

        <TouchableOpacity
          className="ml-2"
          onPress={() => router.push("/(owners)/(service)/serviceManagement")}
        >
          <Text className="text-[#114F99] text-base font-medium">
            Quản lý dịch vụ
          </Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row justify-center gap-4 px-4 mt-6">
        <TouchableOpacity
          className={`${
            filter === "Sắp tới"
              ? "bg-[#119916]"
              : "bg-white border-2 border-[#119916]"
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
            filter === "Hoàn thành"
              ? "bg-[#114F99]"
              : "bg-white border-2 border-[#114F99]"
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
            filter === "Chờ duyệt"
              ? "bg-[#808080]"
              : "bg-white border-2 border-[#808080]"
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
      <ScrollView className="flex-1 px-4 mt-6">
        {filteredBookings.map((booking) => (
          <View
            key={booking.id}
            className="bg-white border border-[#11993C] rounded-lg mb-4 p-4 flex-row items-center justify-between"
          >
            <View>
              <Text className="text-xl font-semibold text-black">
                {booking.displayId} {/* Use displayId instead of id */}
              </Text>
              <Text className="text-base text-black">Sân: {booking.field}</Text>
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={20} color="#000000" />
                <Text className="text-base text-black ml-1">
                  Giờ: {booking.time}
                </Text>
              </View>
              <Text className="text-base text-black">Ngày: {booking.date}</Text>
              <Text className="text-base text-black">
                Trạng thái: {booking.status}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              {booking.status === "Chờ duyệt" ? (
                <TouchableOpacity
                  className="bg-[#0B8FAC] rounded-full px-4 py-2"
                  onPress={() =>
                    router.push({
                      pathname: "/bookingDetail",
                      params: { id: booking.id }, // Use original id for navigation
                    })
                  }
                >
                  <Text className="text-white text-base font-medium">
                    Chi tiết
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  className="bg-[#0B8FAC] rounded-full px-4 py-2"
                  onPress={() =>
                    router.push({
                      pathname: "/bookingDetail",
                      params: { id: booking.id }, // Use original id for navigation
                    })
                  }
                >
                  <Text className="text-white text-base font-medium">Xem</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
