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

export default function OwnerHome() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-[#060b28]">

      <View className="items-end mt-8 mr-4">
        <Text className="text-[#ff4d4d] text-5xl">GoPitch</Text>
        <Text className="text-blue-300 text-3xl mt-2">Quản lý sân bóng</Text>
      </View>

      <View className="items-center">
        <Image
          source={require("../../assets/images/book.png")}
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
          {/* Thẻ: Quản lý sân */}
          <TouchableOpacity
            className="w-40 h-40 bg-white rounded-2xl items-center justify-center p-4 border-2 border-blue-500 mr-4"
            onPress={() => router.push("/(owners)/stadiumManagement")}
          >
            <Image
              source={require("../../assets/images/book.png")}
              className="w-full h-full"
              resizeMode="contain"
            />
            <Text className="text-[#060b28] font-semibold text-center">
              Quản lý sân
            </Text>
          </TouchableOpacity>

          {/* Thẻ: Quản lý đặt sân */}
          <TouchableOpacity
            className="w-40 h-40 bg-white rounded-2xl items-center justify-center p-4 border-2 border-blue-500 mr-4"
            onPress={() => router.push("/(owners)/bookingManagement")}
          >
            <Image
              source={require("../../assets/images/bookinghistory.png")}
              className="w-full h-full"
              resizeMode="contain"
            />
            <Text className="text-[#060b28] font-semibold text-center">
              Quản lý đặt sân
            </Text>
          </TouchableOpacity>

          {/* Thẻ: Quản lý dịch vụ */}
          <TouchableOpacity
            className="w-40 h-40 bg-white rounded-2xl items-center justify-center p-4 border-2 border-blue-500 mr-4"
            onPress={() => router.push("/(services)/serviceManagement")}
          >
            <Image
              source={require("../../assets/images/book.png")}
              className="w-full h-full"
              resizeMode="contain"
            />
            <Text className="text-[#060b28] font-semibold text-center">
              Quản lý dịch vụ
            </Text>
          </TouchableOpacity>

          {/* Thẻ: Tài khoản */}
          <TouchableOpacity
            className="w-40 h-40 bg-white rounded-2xl items-center justify-center p-4 border-2 border-blue-500 mr-4"
            onPress={() => router.push("/(owners)/account")}
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