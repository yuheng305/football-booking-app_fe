import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import HeaderClub from "@/component/HeaderClub";
import clubService from "@/src/services/club.service";

const CreateClub = () => {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateClub = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên câu lạc bộ!");
      return;
    }

    if (!address.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập địa chỉ!");
      return;
    }

    setIsLoading(true);

    try {
      const clubData = {
        name: name.trim(),
        address: address.trim(),
      };

      await clubService.createClub(clubData);

      Alert.alert("Thành công", "Tạo câu lạc bộ thành công!", [
        {
          text: "Đồng ý",
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error("Create club error:", error);
      Alert.alert(
        "Lỗi",
        error.response?.data?.message ||
          "Không thể tạo câu lạc bộ. Vui lòng thử lại!"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <HeaderClub title="Tạo câu lạc bộ" />

      <ScrollView className="flex-1 px-6 py-6">
        {/* Icon */}
        <View className="items-center mb-6">
          <View className="w-24 h-24 bg-blue-100 rounded-full items-center justify-center">
            <Ionicons name="shield" size={48} color="#3b82f6" />
          </View>
          <Text className="text-gray-600 text-sm mt-3 text-center">
            Tạo câu lạc bộ để quản lý đội bóng và đặt sân dễ dàng hơn
          </Text>
        </View>

        {/* Club Name Input */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">
            Tên câu lạc bộ <Text className="text-red-500">*</Text>
          </Text>
          <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
            <Ionicons name="people" size={20} color="#6b7280" />
            <TextInput
              className="flex-1 ml-3 text-base text-gray-900"
              placeholder="VD: FC Barcelona Hà Nội"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#9ca3af"
              editable={!isLoading}
            />
          </View>
        </View>

        {/* Address Input */}
        <View className="mb-6">
          <Text className="text-gray-700 font-medium mb-2">
            Địa chỉ <Text className="text-red-500">*</Text>
          </Text>
          <View className="flex-row items-start bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
            <Ionicons
              name="location"
              size={20}
              color="#6b7280"
              style={{ marginTop: 2 }}
            />
            <TextInput
              className="flex-1 ml-3 text-base text-gray-900"
              placeholder="VD: Quận 1, TP. Hồ Chí Minh"
              value={address}
              onChangeText={setAddress}
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!isLoading}
            />
          </View>
        </View>

        {/* Info Box */}
        <View className="bg-blue-50 rounded-xl p-4 mb-6">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <View className="flex-1 ml-3">
              <Text className="text-blue-900 font-medium mb-1">Lưu ý:</Text>
              <Text className="text-blue-700 text-sm">
                • Bạn sẽ trở thành quản lý câu lạc bộ{"\n"}• Có thể mời thêm
                thành viên sau khi tạo{"\n"}• Câu lạc bộ cần được xác minh trước
                khi đặt sân
              </Text>
            </View>
          </View>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          onPress={handleCreateClub}
          disabled={isLoading}
          className={`py-4 rounded-xl ${
            isLoading ? "bg-blue-300" : "bg-blue-600"
          }`}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <View className="flex-row items-center justify-center">
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text className="text-white font-semibold text-base ml-2">
                Tạo câu lạc bộ
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default CreateClub;
