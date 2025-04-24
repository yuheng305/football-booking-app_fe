import { router } from "expo-router";
import {
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import Swiper from "react-native-swiper";

const Onboarding = () => {
  return (
    <Swiper
      loop={false}
      showsPagination={true}
      dotStyle={{ backgroundColor: "#4b5563" }}
      activeDotStyle={{ backgroundColor: "#3b82f6" }}
    >
      {/* Slide 1 */}
      <SafeAreaView className="flex-1 items-center justify-center bg-[#060b28] px-0">
        <Image
          source={require("../assets/images/onboarding1.png")}
          className="w-full h-1/2 mt-10"
          resizeMode="contain"
        />
        <View className="items-center mt-8">
          <Text className="text-white font-bold text-3xl mb-4">
            Đặt sân nhanh chóng
          </Text>
          <Text className="text-gray-300 text-xl text-center mb-10">
            Thao tác nhanh, gọn trong vài giây
          </Text>
        </View>
        {/* <Text className="text-center text-lg text-gray-400">
          Lướt sang phải để tiếp tục
        </Text> */}
      </SafeAreaView>

      {/* Slide 2 */}
      <SafeAreaView className="flex-1 items-center justify-center bg-[#060b28] px-0">
        <Image
          source={require("../assets/images/onboarding2.png")}
          className="w-full h-1/2 mt-10"
          resizeMode="contain"
        />
        <View className="items-center mt-8">
          <Text className="text-white font-bold text-3xl mb-4">
            Tìm đối thủ linh hoạt
          </Text>
          <Text className="text-gray-300 text-xl text-center mb-10">
            Ghép trận linh hoạt theo trình độ
          </Text>
        </View>
        {/* <Text className="text-center text-lg text-gray-400">
          Lướt sang phải để tiếp tục
        </Text> */}
      </SafeAreaView>

      {/* Slide 2 */}
      <SafeAreaView className="flex-1 items-center justify-center bg-[#060b28] px-0">
        <Image
          source={require("../assets/images/onboarding3.png")}
          className="w-full h-1/2 mt-28 mb-"
          resizeMode="contain"
        />
        <View className="items-center">
          <Text className="text-white font-bold text-3xl mb-4">
            Dịch vụ đa dạng
          </Text>
          <Text className="text-gray-300 text-xl text-center mb-5">
            Mang lại trải nghiệm đá bóng trọn vẹn!
          </Text>
        </View>
        {/* <Text className="text-center text-lg text-gray-400">
          Swipe to continue
        </Text> */}

        <TouchableOpacity
          onPress={() => router.replace("/(tabs)/home")}
          className="w-[50%] bg-blue-500 rounded-lg items-center self-center"
        >
          <Text className="text-lg text-white font-bold py-3">Bắt đầu</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Swiper>
  );
};

export default Onboarding;
