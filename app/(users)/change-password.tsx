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
import FooterUser from "@/component/FooterUser";

const ChangePassword = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleChange = () => {
    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu mới không khớp!");
      return;
    }

    // Gọi API ở đây
    Alert.alert("Thành công", "Đổi mật khẩu thành công!");
    router.back();
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
      {/* FooterUser cố định ở dưới đáy */}
      <View className="pb-14">
        <FooterUser />
      </View>
    </SafeAreaView>
  );
};

export default ChangePassword;
