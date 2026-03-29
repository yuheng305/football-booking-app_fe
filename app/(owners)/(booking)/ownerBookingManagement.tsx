import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { bookingService } from "@/src/services/booking.service";
import type { Booking as BookingType } from "@/src/types/booking.types";

const TEMP_OWNER_CLUSTER_ID = 3;

interface DisplayBooking {
  id: number;
  displayId: string;
  field: string;
  time: string;
  date: string;
  status: string;
  clubName: string;
}

export default function BookingManagement() {
  const router = useRouter();
  const [filter, setFilter] = useState("All");
  const [bookings, setBookings] = useState<DisplayBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Map API status to display status
  const mapStatus = (status: string): string => {
    switch (status.toLowerCase()) {
      case "pending":
        return "Chờ duyệt";
      case "confirmed":
        return "Đã xác nhận";
      case "completed":
        return "Hoàn thành";
      case "payment_required":
        return "Chờ thanh toán";
      case "canceled":
        return "Đã hủy";
      default:
        return status;
    }
  };

  const fetchBookings = useCallback(async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      console.log("[OWNER BOOKINGS] Starting fetch...");

      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        router.replace("/login");
        return;
      }
      
      // Check cache first for faster loading
      if (!isRefreshing) {
        const cached = await AsyncStorage.getItem("ownerBookingsCache");
        if (cached) {
          console.log("[OWNER BOOKINGS] Loading from cache...");
          setBookings(JSON.parse(cached));
          setLoading(false);
        }
      }

      const clusterId = TEMP_OWNER_CLUSTER_ID;

      console.log("[OWNER BOOKINGS] Fetching from API, cluster:", clusterId);

      const response = await bookingService.getOwnerBookings({
        clusterId,
        offset: 0,
        limit: 100,
      });

      console.log("[OWNER BOOKINGS] API returned:", response.bookings.length, "bookings");

      // Transform bookings to display format
      const displayBookings: DisplayBooking[] = response.bookings.map(
        (booking: BookingType, index: number) => ({
          id: booking.id,
          displayId: `#${index + 1}`,
          field: booking.field.name,
          time: `${booking.start_time} - ${booking.end_time}`,
          date: new Date(booking.booking_date).toLocaleDateString("vi-VN"),
          status: mapStatus(booking.status),
          clubName: booking.club.name,
        })
      );

      setBookings(displayBookings);
      // Cache the data
      await AsyncStorage.setItem("ownerBookingsCache", JSON.stringify(displayBookings));
      console.log("[OWNER BOOKINGS] Cached", displayBookings.length, "bookings");
    } catch (error) {
      console.error("[OWNER BOOKINGS] Error:", error);
      if (error instanceof Error) {
        console.error("[OWNER BOOKINGS] Error message:", error.message);
        const message = error.message.toLowerCase();
        if (message.includes("not authenticated") || message.includes("403")) {
          router.replace("/login");
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch on screen focus
  useFocusEffect(
    useCallback(() => {
      console.log("[OWNER BOOKINGS] Screen focused");
      fetchBookings(false);
    }, [fetchBookings])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings(true);
  }, [fetchBookings]);

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
      {/* <View className="w-full h-11 bg-black" /> */}

      <View className="flex-row items-center px-4 pt-4">
        <TouchableOpacity
          className="w-10 h-10 bg-white border border-gray-200 rounded-xl items-center justify-center"
          onPress={() => router.push("/(owners)/home")}
          activeOpacity={1}
        >
          <Ionicons name="arrow-back" size={20} color="#1E232C" />
        </TouchableOpacity>

        <Text className="flex-1 font-bold text-[26px] text-[#1E232C] text-center">
          Quản lý đặt sân
        </Text>

      </View>

      <View className="flex-row justify-center gap-4 px-4 mt-6">
        <TouchableOpacity
          className={`${
            filter === "All"
              ? "bg-[#114F99]"
              : "bg-white border-2 border-[#114F99]"
          } px-6 py-2 rounded-full items-center`}
          onPress={() => setFilter("All")}
          activeOpacity={1}
        >
          <Text
            className={`text-base font-medium ${
              filter === "All" ? "text-white" : "text-[#114F99]"
            }`}
          >
            Tất cả
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`${
            filter === "Chờ duyệt"
              ? "bg-[#FF9500]"
              : "bg-white border-2 border-[#FF9500]"
          } px-6 py-2 rounded-full items-center`}
          onPress={() => setFilter("Chờ duyệt")}
          activeOpacity={1}
        >
          <Text
            className={`text-base font-medium ${
              filter === "Chờ duyệt" ? "text-white" : "text-[#FF9500]"
            }`}
          >
            Chờ duyệt
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`${
            filter === "Hoàn thành"
              ? "bg-[#119916]"
              : "bg-white border-2 border-[#119916]"
          } px-6 py-2 rounded-full items-center`}
          onPress={() => setFilter("Hoàn thành")}
          activeOpacity={1}
        >
          <Text
            className={`text-base font-medium ${
              filter === "Hoàn thành" ? "text-white" : "text-[#119916]"
            }`}
          >
            Hoàn thành
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView 
        className="flex-1 px-4 mt-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredBookings.length === 0 ? (
          <View className="items-center justify-center mt-10">
            <Text className="text-gray-500 text-base">
              Không có đặt sân nào
            </Text>
          </View>
        ) : (
          filteredBookings.map((booking) => (
            <View
              key={booking.id}
              className="bg-white border border-[#11993C] rounded-lg mb-4 p-4"
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-xl font-semibold text-gray-900">
                    {booking.displayId}
                  </Text>
                  <Text className="text-base text-gray-800 mt-1">
                    CLB: {booking.clubName}
                  </Text>
                  <Text className="text-base text-gray-800">
                    Sân: {booking.field}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <Ionicons name="time-outline" size={20} color="#374151" />
                    <Text className="text-base text-gray-800 ml-1">
                      {booking.time}
                    </Text>
                  </View>
                  <View className="flex-row items-center mt-1">
                    <Ionicons name="calendar-outline" size={20} color="#374151" />
                    <Text className="text-base text-gray-800 ml-1">
                      {booking.date}
                    </Text>
                  </View>
                  <View className="mt-2">
                    <Text
                      className={`text-base font-medium ${
                        booking.status === "Đã xác nhận"
                          ? "text-[#119916]"
                          : booking.status === "Hoàn thành"
                          ? "text-[#114F99]"
                          : booking.status === "Chờ duyệt"
                          ? "text-[#FF9500]"
                        : booking.status === "Chờ thanh toán"
                          ? "text-[#0B8FAC]"
                          : "text-gray-500"
                      }`}
                    >
                      {booking.status}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  className="bg-[#0B8FAC] rounded-full px-5 py-2.5 ml-2"
                  onPress={() =>
                    router.push({
                      pathname: "/(owners)/(booking)/bookingDetail",
                      params: { id: booking.id.toString() },
                    })
                  }
                >
                  <Text className="text-white text-base font-medium">
                    {booking.status === "Chờ duyệt" ? "Chi tiết" : "Xem"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
