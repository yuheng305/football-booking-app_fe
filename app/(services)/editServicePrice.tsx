import {
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    TextInput,
  } from "react-native";
  import { useRouter, useLocalSearchParams } from "expo-router";
  import { Ionicons } from "@expo/vector-icons";
  import { useState } from "react";
  
  export default function EditServicePrice() {
    const router = useRouter();
    const { name, price } = useLocalSearchParams();
    const [newPrice, setNewPrice] = useState(price as string);
  
    const handleSave = () => {
      console.log(`Lưu giá mới cho ${name}: ${newPrice}`);
      router.push("/(services)/serviceManagement");
    };
  
    return (
      <SafeAreaView className="flex-1 bg-white">
        {/* Status bar */}
        <View className="w-full h-11 bg-black" />
  
        {/* Header section */}
        <View className="flex-row items-center px-4 pt-4">

          <TouchableOpacity
            className="w-10 h-10 bg-white border border-gray-200 rounded-xl items-center justify-center"
            onPress={() => router.push("/(services)/serviceManagement")}
          >
            <Ionicons name="arrow-back" size={20} color="#1E232C" />
          </TouchableOpacity>
  
          <Text className="flex-1 font-bold text-[26px] text-[#1E232C] text-center">
            Chỉnh giá dịch vụ
          </Text>

          <View className="w-10 h-10" />
        </View>

        <View className="px-4 mt-8">

          <View className="mb-6">
            <Text className="text-black text-[15px] font-medium mb-2">Tên dịch vụ</Text>
            <View className="bg-gray-100 border border-gray-300 rounded-lg p-4">
              <Text className="text-black text-[15px] font-medium">{name}</Text>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-black text-[15px] font-medium mb-2">Giá</Text>
            <TextInput
              className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-black text-[15px] font-medium"
              value={newPrice}
              onChangeText={setNewPrice}
              keyboardType="numeric"
              placeholder="Nhập giá mới"
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