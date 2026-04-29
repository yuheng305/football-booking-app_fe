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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import HeaderOne from "@/component/HeaderOne";
import authService from "../../../src/services/auth.service";

const ChangePassword = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        Alert.alert("Thành công", "Đổi mật khẩu thành công!");
        // Reset form
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        // Go back
        router.back();
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
        <HeaderOne title="Đổi mật khẩu" />
        <View className="px-6 mt-6 space-y-6">
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
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ChangePassword;
