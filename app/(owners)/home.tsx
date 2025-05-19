import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function Home() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-white justify-center items-center">
      <TouchableOpacity onPress={() => router.push("/(owners)/(stadium)/stadiumManagement")}>
        <Text>Danh sách sân</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push("/(owners)/(service)/serviceManagement")}>
        <Text>Quản lý dịch vụ</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push("/(owners)/(booking)/bookingManagement")}>
        <Text>Quản lý đặt sân</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push("/(owners)/(account)/account")}>
        <Text>Tài khoản</Text>
      </TouchableOpacity>
    </View>
  );
}