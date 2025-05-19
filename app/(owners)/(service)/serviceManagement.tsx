import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const services = [
  { name: "Thuê sân (1 giờ)", price: 160000 },
  { name: "Thuê trọng tài", price: 80000 },
  { name: "Thuê thủ môn", price: 80000 },
  { name: "Nước uống", price: 20000 },
  { name: "Áo bibs (10 cái)", price: 80000 },
  { name: "Găng tay thủ môn", price: 10000 },
  { name: "Quây lưới trận đấu", price: 70000 },
];

export default function ServiceManagement() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Status bar */}
      <View className="w-full h-11 bg-black" />

      {/* Header section */}
      <View className="flex-row items-center px-4 pt-4">

        <TouchableOpacity
          className="w-10 h-10 bg-white border border-gray-200 rounded-xl items-center justify-center"
          onPress={() => router.push("/(owners)/(booking)/bookingManagement")}
        >
          <Ionicons name="arrow-back" size={20} color="#1E232C" />
        </TouchableOpacity>

        <View className="flex-1 flex-row justify-center items-center">
          <Text className="font-bold text-[26px] text-[#1E232C] text-center mr-4">
            Quản lý dịch vụ
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(owners)/(booking)/bookingManagement")}
          >
            <Text className="text-[#114F99] text-base font-normal">
              Quản lý đặt sân
            </Text>
          </TouchableOpacity>
        </View>

        <View className="w-10 h-10" />
      </View>

      <TouchableOpacity
        className="bg-[#0B8FAC] py-2 rounded px-4 mx-4 mt-4 items-center"
        onPress={() => console.log("Thêm dịch vụ pressed")}
      >
        <Text className="text-white font-semibold text-xs">Thêm dịch vụ</Text>
      </TouchableOpacity>

      <ScrollView className="flex-1 px-4 mt-4">

        <View className="flex-row bg-gray-200 border border-gray-400 rounded-t">
          <Text className="flex-1 p-2 font-bold text-sm text-black">Dịch vụ</Text>
          <Text className="flex-1 p-2 font-bold text-sm text-black text-right">Giá (VND)</Text>
        </View>

        {services.map((service, index) => (
          <View
            key={index}
            className={`flex-row items-center bg-white border border-gray-400 ${
              index === services.length - 1 ? "rounded-b" : ""
            }`}
          >
            <Text className="flex-1 p-2 text-sm text-black">{service.name}</Text>
            <Text className="flex-1 p-2 text-sm text-black text-right">
              {service.price.toLocaleString()}
            </Text>
            <TouchableOpacity
              className="p-2"
              onPress={() =>
                router.push({
                  pathname: "/(owners)/(service)/editServicePrice",
                  params: { name: service.name, price: service.price.toString() },
                })
              }
            >
              <Ionicons name="pencil-outline" size={20} color="#0B8FAC" />
            </TouchableOpacity>
            <TouchableOpacity className="p-2">
              <Ionicons name="trash-outline" size={20} color="#FF0000" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}