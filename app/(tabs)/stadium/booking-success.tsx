import React from "react";
import { Text, View, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import HeaderUser from "@/component/HeaderUser";

const BookingSuccess = () => {
  const handleGoHome = () => {
    router.push("/(tabs)/home");
  };

  const handleViewHistory = () => {
    router.push("/(tabs)/(users)/history");
  };

  const handleBookMore = () => {
    router.push("/(tabs)/stadium");
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={['top']}>
      <HeaderUser />

      <View className="flex-1 items-center justify-center p-4">
        {/* Success Icon Animation */}
        <View className="bg-green-100 rounded-full p-6 mb-6">
          <Ionicons name="checkmark-circle" size={120} color="#10b981" />
        </View>

        {/* Success Message */}
        <Text className="text-3xl font-bold text-gray-800 text-center mb-2">
          Đặt sân thành công!
        </Text>
        <Text className="text-gray-600 text-center text-base mb-8 px-4">
          Thanh toán đã được xử lý thành công. Cảm ơn bạn đã sử dụng dịch vụ.
        </Text>

        {/* Celebration Image */}
        <View className="mb-8">
          <Image
            source={require("../../../assets/images/player_badminton.png")}
            className="w-48 h-48"
            resizeMode="contain"
          />
        </View>

        {/* Information Box */}
        <View className="bg-white rounded-lg p-4 mb-6 shadow w-full">
          <View className="flex-row items-start mb-3">
            <Ionicons name="information-circle" size={24} color="#3b82f6" />
            <View className="flex-1 ml-3">
              <Text className="text-blue-800 font-semibold mb-1">
                Thông tin quan trọng:
              </Text>
              <Text className="text-blue-700 text-sm">
                • Vui lòng đến sân đúng giờ đã đặt{"\n"}
                • Mang theo giấy tờ tùy thân để xác nhận{"\n"}
                • Kiểm tra email để xem chi tiết đặt sân{"\n"}
                • Liên hệ hotline nếu cần hỗ trợ: 1900 xxxx
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="w-full mt-2">
          <TouchableOpacity
            onPress={handleViewHistory}
            className="bg-blue-500 py-4 rounded-lg mb-3"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="receipt-outline" size={24} color="white" />
              <Text className="text-white text-center font-bold text-lg ml-2">
                Xem lịch sử đặt sân
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleBookMore}
            className="bg-green-500 py-4 rounded-lg mb-3"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="add-circle-outline" size={24} color="white" />
              <Text className="text-white text-center font-bold text-lg ml-2">
                Đặt sân tiếp
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleGoHome}
            className="bg-gray-500 py-4 rounded-lg"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="home-outline" size={24} color="white" />
              <Text className="text-white text-center font-bold text-lg ml-2">
                Về trang chủ
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default BookingSuccess;
