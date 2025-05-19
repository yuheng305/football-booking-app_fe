import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

export default function AddService() {
  const router = useRouter();
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");

  const handleSave = () => {
    console.log(`Thêm dịch vụ mới: ${serviceName}, Giá: ${servicePrice}`);
    router.push("/(owners)/(service)/serviceManagement");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="w-full h-11 bg-black" />

      <View className="flex-row items-center px-4 pt-4">
        <TouchableOpacity
          className="w-10 h-10 bg-white border border-gray-200 rounded-xl items-center justify-center"
          onPress={() => router.push("/(owners)/(service)/serviceManagement")}
        >
          <Ionicons name="arrow-back" size={20} color="#1E232C" />
        </TouchableOpacity>

        <Text className="flex-1 font-bold text-[26px] text-[#1E232C] text-center">
          Thêm dịch vụ
        </Text>

        <View className="w-10 h-10" />
      </View>

      <View className="px-4 mt-8">
        <View className="mb-6">
          <Text className="text-black text-[15px] font-medium mb-2">Tên dịch vụ</Text>
          <TextInput
            className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-black text-[15px] font-medium"
            value={serviceName}
            onChangeText={setServiceName}
            placeholder="Nhập tên dịch vụ"
            placeholderTextColor="#8391A1"
          />
        </View>

        <View className="mb-6">
          <Text className="text-black text-[15px] font-medium mb-2">Giá</Text>
          <TextInput
            className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-black text-[15px] font-medium"
            value={servicePrice}
            onChangeText={setServicePrice}
            keyboardType="numeric"
            placeholder="Nhập giá"
            placeholderTextColor="#8391A1"
          />
        </View>

        <TouchableOpacity
          className="bg-[#0B8FAC] py-4 px-20 rounded-lg items-center mt-8 self-center"
          onPress={handleSave}
        >
          <Text className="text-white text-xl font-semibold">Lưu</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}