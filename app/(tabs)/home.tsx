import {
  View,
  Text,
  Image,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

export default function Home() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-[#060b28]" edges={['top']}>
      {/* Header Section */}
      <View className="items-end mt-8 mr-4">
        <Text className="text-[#ff4d4d] text-5xl">GoPitch</Text>
        <Text className="text-blue-300 text-3xl mt-2">Đặt sân thể thao</Text>
      </View>

      {/* Player Image */}
      <View className="items-center">
        <Image
          source={require("../../assets/images/player_badminton.png")}
          style={{
            width: width * 1.2,
            height: width * 1.2,
            resizeMode: "contain",
          }}
        />
      </View>

      {/* Function Cards in ScrollView */}
      <View className="mb-8">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          className="flex-row"
        >
          {/* Card: Đặt sân */}
          <TouchableOpacity
            className="w-40 h-40 bg-white rounded-2xl items-center justify-center p-4 border-2 border-blue-500 mr-4"
            onPress={() => router.push("/(tabs)/(stadiums)/location")}
          >
            <Image
              source={require("../../assets/images/book.png")}
              className="w-full h-full"
              resizeMode="contain"
            />
            <Text className="text-[#060b28] font-semibold text-center">
              Đặt sân
            </Text>
          </TouchableOpacity>

          {/* Card: Giải đấu */}
          <TouchableOpacity
            className="w-40 h-40 bg-white rounded-2xl items-center justify-center p-4 border-2 border-blue-500 mr-4"
            onPress={() => router.push("/(tabs)/tournament")}
          >
            <Image
              source={require("../../assets/images/tournament.png")}
              className="w-full h-full"
              resizeMode="contain"
            />
            <Text className="text-[#060b28] font-semibold text-center">
              Giải đấu
            </Text>
          </TouchableOpacity>

          {/* Card: Tài khoản */}
          <TouchableOpacity
            className="w-40 h-40 bg-white rounded-2xl items-center justify-center p-4 border-2 border-blue-500 mr-4"
            onPress={() => router.push("/(tabs)/account")}
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

          {/* Card: Thanh toán */}
          <TouchableOpacity
            className="w-40 h-40 bg-white rounded-2xl items-center justify-center p-4 border-2 border-blue-500 mr-4"
            onPress={() => router.push("/(tabs)/payment")}
          >
            <Image
              source={require("../../assets/images/payment.png")}
              className="w-full h-full"
              resizeMode="contain"
            />
            <Text className="text-[#060b28] font-semibold text-center">
              Thanh toán
            </Text>
          </TouchableOpacity>

          {/* Card: Lịch sử đặt */}
          <TouchableOpacity
            className="w-40 h-40 bg-white rounded-2xl items-center justify-center p-4 border-2 border-blue-500 mr-4"
            onPress={() => router.push("/(tabs)/(users)/history")}
          >
            <Image
              source={require("../../assets/images/bookinghistory.png")}
              className="w-full h-full"
              resizeMode="contain"
            />
            <Text className="text-[#060b28] font-semibold text-center">
              Lịch sử đặt
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
