import { router } from "expo-router";
import {
  Text,
  TouchableOpacity,
  View,
  Image,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRef, useState } from "react";

const Onboarding = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const { width: screenWidth } = Dimensions.get("window");

  const slides = [
    {
      id: "1",
      title: "Đặt sân nhanh chóng",
      subtitle: "Thao tác nhanh, gọn trong vài giây",
      image: require("../assets/images/onboarding1.png"),
    },
    {
      id: "2",
      title: "Tìm đối thủ linh hoạt",
      subtitle: "Ghép trận linh hoạt theo trình độ",
      image: require("../assets/images/onboarding2.png"),
    },
    {
      id: "3",
      title: "Dịch vụ đa dạng",
      subtitle: "Mang lại trải nghiệm đá bóng trọn vẹn!",
      image: require("../assets/images/onboarding3.png"),
      isLastSlide: true,
    },
  ];

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffsetX / screenWidth);
    setActiveSlide(currentIndex);
  };

  const renderSlide = ({ item, index }: any) => (
    <SafeAreaView
      className="flex-1 items-center justify-center bg-[#060b28] px-0"
      style={{ width: screenWidth }}
    >
      <Image
        source={item.image}
        className={`w-full ${index === 2 ? "h-2/5 mt-28" : "h-1/2 mt-10"}`}
        resizeMode="contain"
      />
      <View className="items-center mt-8">
        <Text className="text-white font-bold text-3xl mb-4">{item.title}</Text>
        <Text className="text-gray-300 text-xl text-center mb-10">
          {item.subtitle}
        </Text>
      </View>

      {item.isLastSlide && (
        <TouchableOpacity
          onPress={() => router.replace("/login")}
          className="w-[50%] bg-blue-500 rounded-lg items-center self-center mt-6"
        >
          <Text className="text-lg text-white font-bold py-3">Bắt đầu</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );

  return (
    <View className="flex-1 bg-[#060b28]">
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        scrollEnabled
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      {/* Pagination Dots */}
      <View className="flex-row justify-center items-center mb-10">
        {slides.map((_, index) => (
          <View
            key={index}
            className={`h-2 mx-1 rounded-full ${
              index === activeSlide ? "w-8 bg-blue-500" : "w-2 bg-gray-600"
            }`}
          />
        ))}
      </View>
    </View>
  );
};

export default Onboarding;
