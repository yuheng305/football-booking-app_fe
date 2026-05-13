import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import authService from "../../../src/services/auth.service";

const ChangePassword = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleBackToAccount = () => {
    router.replace("/(tabs)/account");
  };

  const handleChange = async () => {
    // Validate inputs
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ tất cả các trường!");
      return;
    }

    // Check if new password matches confirmation
    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu mới không khớp với xác nhận mật khẩu!");
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      Alert.alert("Lỗi", "Mật khẩu mới phải có ít nhất 6 ký tự!");
      return;
    }

    setIsLoading(true);

    try {
      // Check if user is authenticated
      const isAuth = await authService.isAuthenticated();
      if (!isAuth) {
        Alert.alert(
          "Lỗi",
          "Không tìm thấy phiên đăng nhập, vui lòng đăng nhập lại!"
        );
        router.replace("/login");
        return;
      }

      // Call change password service
      const result = await authService.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        confirmation_password: confirmPassword,
      });

      if (result) {
        // Reset form
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        Alert.alert("Thành công", "Đổi mật khẩu thành công!", [
          { text: "OK", onPress: handleBackToAccount },
        ]);
      }
    } catch (error: unknown) {
      console.error("Error changing password:", error);

      let errorMsg = "Đã có lỗi xảy ra khi đổi mật khẩu!";
      if (error instanceof Error) {
        if (
          error.message.includes("401") ||
          error.message.includes("Unauthorized")
        ) {
          errorMsg = "Mật khẩu cũ không đúng!";
        } else {
          errorMsg = error.message;
        }
      }

      Alert.alert("Lỗi", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-1">
        <View className="flex-row items-center px-4 pt-4 pb-2 bg-white">
          <TouchableOpacity
            className="w-10 h-10 bg-white border border-gray-200 rounded-xl items-center justify-center"
            onPress={handleBackToAccount}
            activeOpacity={0.9}
            disabled={isLoading}
          >
            <Ionicons name="arrow-back" size={20} color="#1E232C" />
          </TouchableOpacity>

          <Text className="flex-1 text-center text-[24px] font-bold text-[#1E232C] mr-10">
            Đổi mật khẩu
          </Text>
        </View>

        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        >
          <ScrollView
            className="flex-1 px-6"
            contentContainerStyle={{ paddingTop: 24, paddingBottom: 32, gap: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          {/* Old Password */}
          <View>
            <Text className="mb-2 text-gray-600 font-semibold">
              Mật khẩu cũ
            </Text>
            <View className="flex-row items-center border border-gray-300 px-4 py-3 rounded bg-gray-50">
              <Ionicons name="lock-closed-outline" size={20} color="gray" />
              <TextInput
                secureTextEntry={!showOldPassword}
                value={oldPassword}
                onChangeText={setOldPassword}
                placeholder="Nhập mật khẩu cũ"
                placeholderTextColor="gray"
                className="flex-1 ml-3"
                autoCapitalize="none"
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowOldPassword(!showOldPassword)}
                disabled={isLoading}
              >
                <Ionicons
                  name={showOldPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="gray"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password */}
          <View>
            <Text className="mb-2 text-gray-600 font-semibold">
              Mật khẩu mới
            </Text>
            <View className="flex-row items-center border border-gray-300 px-4 py-3 rounded bg-gray-50">
              <Ionicons name="lock-closed-outline" size={20} color="gray" />
              <TextInput
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Nhập mật khẩu mới"
                placeholderTextColor="gray"
                className="flex-1 ml-3"
                autoCapitalize="none"
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
                disabled={isLoading}
              >
                <Ionicons
                  name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="gray"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View>
            <Text className="mb-2 text-gray-600 font-semibold">
              Xác nhận mật khẩu mới
            </Text>
            <View className="flex-row items-center border border-gray-300 px-4 py-3 rounded bg-gray-50">
              <Ionicons name="lock-closed-outline" size={20} color="gray" />
              <TextInput
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Nhập lại mật khẩu mới"
                placeholderTextColor="gray"
                className="flex-1 ml-3"
                autoCapitalize="none"
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="gray"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleChange}
            className="bg-blue-600 p-4 rounded mt-8"
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-center text-white font-semibold text-lg">
                Xác nhận
              </Text>
            )}
          </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

export default ChangePassword;
