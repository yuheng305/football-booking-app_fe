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
    <SafeAreaView className="flex-1 bg-[#060b28]" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-end mt-8 mr-4">
          <Text className="text-[#ff4d4d] text-5xl font-bold">GoPitch</Text>
          <Text className="text-[#93c5fd] text-3xl mt-2">Đặt sân thể thao</Text>
        </View>

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

        <ScrollView
          horizontal
          nestedScrollEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 6 }}
          className="flex-row"
        >
          {/* Card: Danh sách sân
          <TouchableOpacity
            className="w-40 h-36 bg-white rounded-2xl items-center justify-center p-3 border-2 border-[#3b82f6] mr-3"
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
          </TouchableOpacity> */}
          {/* Card: Cụm sân */}
          <TouchableOpacity
            className="w-40 h-36 bg-white rounded-2xl items-center justify-center p-3 border-2 border-[#3b82f6] mr-3"
            onPress={() => router.push("/(owners)/(stadium)/clusterList")}
          >
            <Image
              source={require("../../assets/images/book.png")}
              className="w-full h-full"
              resizeMode="contain"
            />
            <Text className="text-[#060b28] font-semibold text-center">
              Cụm sân
            </Text>
          </TouchableOpacity>

          {/* Card: Quản lý */}
          <TouchableOpacity
            className="w-40 h-36 bg-white rounded-2xl items-center justify-center p-3 border-2 border-[#3b82f6] mr-3"
            onPress={() =>
              router.push("/(owners)/(booking)/ownerBookingManagement")
            }
          >
            <Image
              source={require("../../assets/images/bookinghistory.png")}
              className="w-full h-full"
              resizeMode="contain"
            />
            <Text className="text-[#060b28] font-semibold text-center">
              Quản lý
            </Text>
          </TouchableOpacity>

          {/* Card: Tài khoản */}
          <TouchableOpacity
            className="w-40 h-36 bg-white rounded-2xl items-center justify-center p-3 border-2 border-[#3b82f6] mr-3"
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
      </ScrollView>
    </SafeAreaView>
  );
}
