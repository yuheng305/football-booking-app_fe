import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import authService from "../src/services/auth.service";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Lỗi", "Vui lòng nhập email!");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Lỗi", "Email không hợp lệ!");
      return;
    }

    setIsLoading(true);

    try {
      const message = await authService.forgotPassword({
        email: email.trim(),
      });

      Alert.alert(
        "Thành công",
        message ||
          "Email đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư đến và cả thư mục spam."
      );
      setEmail("");
      router.back();
    } catch (error: unknown) {
      console.error("Forgot password error:", error);

      let errorMsg = "Không thể gửi email đặt lại mật khẩu!";
      if (error instanceof Error) {
        errorMsg = error.message;
      }

      Alert.alert("Lỗi", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#1A2A44]">
      <View className="flex-1 justify-center px-6">
        {/* Header */}
        <View className="mb-8">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-3xl font-bold mt-4">
            Quên mật khẩu
          </Text>
          <Text className="text-gray-400 text-base mt-2">
            Nhập email của bạn để nhận hướng dẫn đặt lại mật khẩu
          </Text>
        </View>

        {/* Email Input */}
        <View className="mb-6">
          <View className="flex-row items-center border-b border-gray-500 py-2">
            <Ionicons
              name="mail-outline"
              size={24}
              color="gray"
              className="mr-3"
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Nhập email"
              placeholderTextColor="gray"
              className="flex-1 text-white"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleForgotPassword}
          className="bg-blue-500 p-4 rounded-lg mb-4"
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className="text-center text-white font-semibold text-lg">
              Gửi hướng dẫn đặt lại mật khẩu
            </Text>
          )}
        </TouchableOpacity>

        {/* Back to Login */}
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-center text-blue-400 text-base">
            Quay lại đăng nhập
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ForgotPassword;
