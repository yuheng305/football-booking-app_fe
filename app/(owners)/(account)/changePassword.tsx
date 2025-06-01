import React, { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router } from "expo-router";
import HeaderOne from "@/component/HeaderOne";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ChangePassword = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleChange = async () => {
    // Kiểm tra mật khẩu mới và xác nhận mật khẩu có khớp không
    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu mới không khớp!");
      return;
    }

    try {
      // Lấy token và userId từ AsyncStorage
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        Alert.alert("Lỗi", "Không tìm thấy token, vui lòng đăng nhập lại!");
        router.replace("/login");
        return;
      }

      const userDataString = await AsyncStorage.getItem("userData");
      if (!userDataString) {
        Alert.alert(
          "Lỗi",
          "Không tìm thấy thông tin người dùng, vui lòng đăng nhập lại!"
        );
        router.replace("/login");
        return;
      }
      const userData = JSON.parse(userDataString);
      const userId = userData._id;
      console.log("userId:", userId);
      if (!userId) {
        Alert.alert("Lỗi", "Không tìm thấy userId, vui lòng đăng nhập lại!");
        router.replace("/login");
        return;
      }

      // Chuẩn bị request body
      const requestBody = {
        oldPassword,
        newPassword,
        confirmNewPassword: confirmPassword,
      };

      // Gọi API
      const response = await fetch(
        `https://gopitch.onrender.com/owners/${userId}/password`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Lỗi khi đổi mật khẩu: ${response.statusText}`
        );
      }

      Alert.alert("Thành công", "Đổi mật khẩu thành công!");
      router.back();
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
        <HeaderOne title="Đổi mật khẩu" />
        <View className="px-6 mt-6 space-y-4">
          <View>
            <Text className="mb-1 text-gray-600">Mật khẩu cũ</Text>
            <TextInput
              secureTextEntry
              value={oldPassword}
              onChangeText={setOldPassword}
              className="border border-black px-4 py-2 rounded"
            />
          </View>

          <View>
            <Text className="mb-1 text-gray-600">Mật khẩu mới</Text>
            <TextInput
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              className="border border-black px-4 py-2 rounded"
            />
          </View>

          <View>
            <Text className="mb-1 text-gray-600">Xác nhận mật khẩu mới</Text>
            <TextInput
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              className="border border-black px-4 py-2 rounded"
            />
          </View>

          <TouchableOpacity
            onPress={handleChange}
            className="bg-green-600 p-3 rounded mt-6"
          >
            <Text className="text-center text-white font-semibold text-lg">
              Xác nhận
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ChangePassword;
