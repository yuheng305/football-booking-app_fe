import React, { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import HeaderUser from "@/component/HeaderUser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "@/src/utils/api.client";
import bookingService from "@/src/services/booking.service";
import { bookingDraftService } from "@/src/services/booking-draft.service";
import { goBackOrReplace } from "@/src/utils/navigation.helper";

const BookingConfirm = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Booking data
  const [clusterName, setClusterName] = useState<string>("");
  const [fieldId, setFieldId] = useState<string>("");
  const [fieldSize, setFieldSize] = useState<string>("");
  const [fieldPrice, setFieldPrice] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [duration, setDuration] = useState<number>(0);

  useEffect(() => {
    loadBookingDetails();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBookingDetails();
    }, [])
  );

  const loadBookingDetails = async () => {
    try {
      setLoading(true);

      const draft = await bookingDraftService.getDraft();
      const cluster_name =
        draft.clusterName || (await AsyncStorage.getItem("clusterName")) || "";
      const field_id =
        draft.fieldId !== undefined
          ? String(draft.fieldId)
          : await AsyncStorage.getItem("selectedFieldId");
      const field_size =
        draft.fieldSize || (await AsyncStorage.getItem("selectedFieldSize")) || "";
      const field_price =
        draft.fieldPrice !== undefined
          ? String(draft.fieldPrice)
          : await AsyncStorage.getItem("selectedFieldPrice");
      const date = draft.selectedDate || (await AsyncStorage.getItem("selectedDate"));
      const start =
        draft.selectedStartTime || (await AsyncStorage.getItem("selectedStartTime"));
      const end = draft.selectedEndTime || (await AsyncStorage.getItem("selectedEndTime"));
      const dur =
        draft.selectedDuration !== undefined
          ? String(draft.selectedDuration)
          : await AsyncStorage.getItem("selectedDuration");

      console.log("[BOOKING CONFIRM] Loaded data:", {
        field_id,
        date,
        start,
        end,
      });

      console.log("[BOOKING CONFIRM] Raw AsyncStorage values:");
      console.log("  - selectedStartTime:", start);
      console.log("  - selectedEndTime:", end);
      console.log("  - selectedDuration:", dur);

      if (!field_id || !date || !start || !end) {
        Alert.alert("Lỗi", "Thiếu thông tin đặt sân. Vui lòng thử lại.");
        router.back();
        return;
      }

      setClusterName(cluster_name || "");
      setFieldId(field_id);
      setFieldSize(field_size || "");
      setFieldPrice(parseFloat(field_price || "0"));
      setSelectedDate(date);
      setStartTime(start);
      setEndTime(end);
      setDuration(parseFloat(dur || "1"));
    } catch (error) {
      console.error("[BOOKING CONFIRM] Error loading details:", error);
      Alert.alert("Lỗi", "Không thể tải thông tin đặt sân");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const getTotalPrice = () => {
    return fieldPrice * duration;
  };

  const handleConfirmBooking = async () => {
    try {
      setSubmitting(true);

      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
        router.replace("/login");
        return;
      }

      // Format data for API
      // API expects: booking_date as ISO date string, start_time and end_time as "HH:MM" format
      const bookingData = {
        type: "full" as const,
        booking_date: selectedDate, // "YYYY-MM-DD"
        start_time: startTime, // "HH:MM"
        end_time: endTime, // "HH:MM"
        field_id: parseInt(fieldId),
      };

      console.log("[BOOKING CONFIRM] Sending booking:", bookingData);

      apiClient.setAuthToken(token);
      const createdBooking = await bookingService.createBooking(bookingData);
      console.log("[BOOKING CONFIRM] Booking created:", createdBooking?.id);

      // Success
      Alert.alert(
        "Thành công",
        "Đặt sân thành công! Vui lòng chờ chủ sân duyệt. Khi trạng thái chuyển sang Chờ thanh toán, bạn mới thanh toán được.",
        [
          {
            text: "Đồng ý",
            onPress: async () => {
              const createdBookingId = String(createdBooking.id);
              await AsyncStorage.setItem("currentBookingId", createdBookingId);
              console.log("[BOOKING CONFIRM] Saved currentBookingId:", createdBookingId);

              await bookingDraftService.resetDraft();

              // Clear booking data
              await AsyncStorage.multiRemove([
                "clusterName",
                "clusterId",
                "selectedFieldId",
                "selectedFieldSize",
                "selectedFieldPrice",
                "selectedFieldDescription",
                "selectedDate",
                "selectedStartTime",
                "selectedEndTime",
                "selectedDuration",
              ]);

              // Navigate to booking detail screen
              router.replace("/(tabs)/stadium/booking-detail");
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error: any) {
      console.error("[BOOKING CONFIRM] Catch Error:", error);
      console.error("[BOOKING CONFIRM] Error Message:", error.message);
      console.error("[BOOKING CONFIRM] Error Stack:", error.stack);
      
      Alert.alert(
        "Lỗi đặt sân", 
        error.message || "Đặt sân thất bại. Vui lòng thử lại.",
        [{ text: "Đồng ý" }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-800 font-medium">Đang tải thông tin...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={['top']}>
      <HeaderUser
        title="Xác nhận đặt sân"
        showBackButton
        onBackPress={() => goBackOrReplace(navigation, "/(tabs)/stadium/time-select")}
      />

      <ScrollView className="flex-1 px-4 mt-4" showsVerticalScrollIndicator={false}>
        {/* Location & Field Info */}
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-base font-semibold mb-3 text-gray-800">
            Thông tin sân
          </Text>
          
          <View className="flex-row items-center mb-2">
            <Ionicons name="location" size={20} color="#3b82f6" />
            <Text className="ml-2 text-gray-900 font-medium">{clusterName}</Text>
          </View>
          
          <View className="flex-row items-center">
            <Ionicons name="football" size={20} color="#3b82f6" />
            <Text className="ml-2 text-gray-900 font-medium">Sân {fieldSize}</Text>
          </View>
        </View>

        {/* Date & Time Info */}
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-base font-semibold mb-3 text-gray-800">
            Thời gian
          </Text>
          
          <View className="flex-row items-center mb-2">
            <Ionicons name="calendar" size={20} color="#3b82f6" />
            <Text className="ml-2 text-gray-900 font-medium">{formatDate(selectedDate)}</Text>
          </View>
          
          <View className="flex-row items-center mb-2">
            <Ionicons name="time" size={20} color="#3b82f6" />
            <Text className="ml-2 text-gray-900 font-medium">
              {startTime} - {endTime}
            </Text>
          </View>
          
          <View className="flex-row items-center">
            <Ionicons name="hourglass" size={20} color="#3b82f6" />
            <Text className="ml-2 text-gray-900 font-medium">{duration} giờ</Text>
          </View>
        </View>

        {/* Price Summary */}
        <View className="bg-blue-500 rounded-xl p-6 mb-6">
          <Text className="text-white text-lg font-bold mb-4">💰 Tổng thanh toán</Text>
          
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-white text-base">Giá sân/giờ:</Text>
            <Text className="text-white text-base font-bold">{formatPrice(fieldPrice)}</Text>
          </View>
          
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-white text-base">Thời lượng:</Text>
            <Text className="text-white text-base font-bold">{duration} giờ</Text>
          </View>
          
          <View className="border-t border-blue-400 pt-3 mt-2">
            <View className="flex-row justify-between items-center">
              <Text className="text-white text-lg font-semibold">Tổng cộng:</Text>
              <Text className="text-white text-2xl font-bold">
                {formatPrice(getTotalPrice())}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Confirm Button */}
      <View className="px-4 pb-4 bg-white border-t border-gray-200">
        <TouchableOpacity
          className="bg-blue-500 py-4 rounded-xl mt-4 flex-row items-center justify-center"
          onPress={handleConfirmBooking}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="white" />
              <Text className="text-white text-center font-bold text-lg ml-2">
                Xác nhận đặt sân
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default BookingConfirm;
