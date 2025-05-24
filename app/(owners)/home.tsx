import {
  View,
  Text,
  Image,
  Dimensions,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

export default function Home() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#060b28]">
      <View className="w-full h-11 bg-black" />

      <View className="items-end mt-8 mr-4">
        <Text className="text-[#ff4d4d] text-5xl font-bold">GoPitch</Text>
        <Text className="text-[#93c5fd] text-3xl mt-2">Đặt sân bóng đá</Text>
      </View>

      <View className="items-center">
        <Image
          source={require("../../assets/images/player.png")}
          style={{
            width: width * 1.2,
            height: width * 1.2,
            resizeMode: "contain",
          }}
        />
      </View>

      <View className="mb-8">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          className="flex-row"
        >
          {/* Card: Danh sách sân */}
          <TouchableOpacity
            className="w-40 h-40 bg-white rounded-2xl items-center justify-center p-4 border-2 border-[#3b82f6] mr-4"
            onPress={() => router.push("/(owners)/(stadium)/stadiumManagement")}
          >
            <Image
              source={require("../../assets/images/book.png")}
              className="w-full h-full"
              resizeMode="contain"
            />
            <Text className="text-[#060b28] font-semibold text-center">
              Danh sách sân
            </Text>
          </TouchableOpacity>

          {/* Card: Quản lý đặt sân */}
          <TouchableOpacity
            className="w-40 h-40 bg-white rounded-2xl items-center justify-center p-4 border-2 border-[#3b82f6] mr-4"
            onPress={() => router.push("/(owners)/(booking)/bookingManagement")}
          >
            <Image
              source={require("../../assets/images/book.png")}
              className="w-full h-full"
              resizeMode="contain"
            />
            <Text className="text-[#060b28] font-semibold text-center">
              Quản lý đặt sân
            </Text>
          </TouchableOpacity>

          {/* Card: Quản lý dịch vụ */}
          <TouchableOpacity
            className="w-40 h-40 bg-white rounded-2xl items-center justify-center p-4 border-2 border-[#3b82f6] mr-4"
            onPress={() => router.push("/(owners)/(service)/serviceManagement")}
          >
            <Image
              source={require("../../assets/images/bookinghistory.png")}
              className="w-full h-full"
              resizeMode="contain"
            />
            <Text className="text-[#060b28] font-semibold text-center">
              Quản lý dịch vụ
            </Text>
          </TouchableOpacity>

          {/* Card: Tài khoản */}
          <TouchableOpacity
            className="w-40 h-40 bg-white rounded-2xl items-center justify-center p-4 border-2 border-[#3b82f6] mr-4"
            onPress={() => router.push("/(owners)/(account)/account")}
          >
            <Image
              source={require("../../assets/images/account.png")}
              className="w-full h-full"
              resizeMode="contain"
            />
            <Text className="text-[#060b28] font-semibold text-center">
              Tài khoản
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}