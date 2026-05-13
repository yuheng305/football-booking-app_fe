import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import authService from "@/src/services/auth.service";
import { Ionicons } from "@expo/vector-icons";

const ChangePassword = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleBackToAccount = () => {
    router.replace("/(owners)/(account)/account");
  };

  const handleChange = async () => {
    // Kiểm tra mật khẩu mới và xác nhận mật khẩu có khớp không
    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu mới không khớp!");
      return;
    }

    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    try {
      // Chuẩn bị request body
      const requestBody = {
        old_password: oldPassword,
        new_password: newPassword,
        confirmation_password: confirmPassword,
      };

      const message = await authService.changePassword(requestBody);

      Alert.alert("Thành công", message, [
        { text: "OK", onPress: handleBackToAccount },
      ]);
    } catch (error: unknown) {
      console.error("Lỗi khi đổi mật khẩu:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      Alert.alert("Lỗi", errorMsg);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Nội dung chính chiếm không gian còn lại */}
      <View className="flex-1">
        <View className="flex-row items-center px-4 pt-4 pb-2 bg-white">
          <TouchableOpacity
            className="w-10 h-10 bg-white border border-gray-200 rounded-xl items-center justify-center"
            onPress={handleBackToAccount}
            activeOpacity={0.9}
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
          <View>
            <Text className="mb-2 text-gray-600">Mật khẩu cũ</Text>
            <View className="flex-row items-center border border-black px-4 py-2 rounded">
              <Ionicons name="lock-closed-outline" size={20} color="gray" />
              <TextInput
                secureTextEntry={!showOldPassword}
                value={oldPassword}
                onChangeText={setOldPassword}
                className="flex-1 ml-3"
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowOldPassword(!showOldPassword)}
              >
                <Ionicons
                  name={showOldPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="gray"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View>
            <Text className="mb-2 text-gray-600">Mật khẩu mới</Text>
            <View className="flex-row items-center border border-black px-4 py-2 rounded">
              <Ionicons name="lock-closed-outline" size={20} color="gray" />
              <TextInput
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={setNewPassword}
                className="flex-1 ml-3"
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Ionicons
                  name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="gray"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View>
            <Text className="mb-2 text-gray-600">Xác nhận mật khẩu mới</Text>
            <View className="flex-row items-center border border-black px-4 py-2 rounded">
              <Ionicons name="lock-closed-outline" size={20} color="gray" />
              <TextInput
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                className="flex-1 ml-3"
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="gray"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleChange}
            className="bg-green-600 p-3 rounded mt-6"
          >
            <Text className="text-center text-white font-semibold text-lg">
              Xác nhận
            </Text>
          </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

export default ChangePassword;
