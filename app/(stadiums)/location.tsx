import {
  SafeAreaView,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import RNPickerSelect from "react-native-picker-select";
import { useState } from "react";
import { router } from "expo-router";
import Header from "@/component/Header";
import FooterStadium from "@/component/FooterStadium";

const stadiumData = [
  { id: 1, name: "Cụm sân A", location: "Thủ Đức" },
  { id: 2, name: "Cụm sân B", location: "Tân Bình" },
  { id: 3, name: "Cụm sân C", location: "Hóc Môn" },
  { id: 4, name: "Cụm sân D", location: "Tân Phú" },
  { id: 5, name: "Cụm sân E", location: "Thủ Đức" },
  { id: 6, name: "Cụm sân F", location: "Gò Vấp" },
];
const Stadium = () => {
  const [selectedValue, setSelectedValue] = useState(null);

  const handleValueChange = (value) => {
    setSelectedValue(value);
  };

  const handleLogoPress = () => {
    router.push("/(tabs)/home");
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header */}
      <Header />
      {/* <View className="h-20 w-full bg-black flex-row justify-end items-center px-4">
        <TouchableOpacity onPress={handleLogoPress}>
          <Image
            source={require("../../assets/images/logo.png")}
            className="w-32 h-20"
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View> */}

      {/* Content */}
      <View className="w-full px-4 flex-row justify-between items-center">
        <Text className="text-2xl font-semibold mt-4 mb-2">
          Chọn địa điểm đặt sân
        </Text>
        <TouchableOpacity
          className="bg-white rounded-2xl w-1/4 h-1/8 p-2 m-2 border-2 border-red-500"
          onPress={() => router.back()}
        >
          <Text className="text-red-500 font-semibold text-center">
            Quay lại
          </Text>
        </TouchableOpacity>
      </View>

      <RNPickerSelect
        onValueChange={handleValueChange}
        items={[
          { label: "Thành phố Hồ Chí Minh", value: "option1" },
          { label: "Thành phố Đà Nẵng", value: "option2" },
          { label: "Thành phố Huế", value: "option3" },
          { label: "Thành phố Hải Phòng", value: "option4" }, // sửa value trùng nhau
        ]}
        placeholder={{ label: "Chọn một thành phố...", value: null }}
      />

      {selectedValue && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          className="flex-col mt-4"
        >
          {stadiumData.map((stadium) => (
            <View
              key={stadium.id}
              className="flex-row w-full h-40 border-1 border-black items-center p-4 border-b-2"
            >
              <Image
                source={require("../../assets/images/player.png")}
                resizeMode="contain"
                className="w-32 h-full"
              />
              <View className="flex-1 justify-center items-center">
                <Text className="text-[#060b28] font-semibold text-center mt-2">
                  {stadium.location}
                </Text>
                <Text className="text-[#060b28] font-bold text-2xl text-center mt-2">
                  {stadium.name}
                </Text>
              </View>
              <TouchableOpacity
                className="bg-white rounded-2xl w-1/5 h-1/8 p-2 m-2 border-2 border-gray-500"
                onPress={() => router.push("/(stadiums)/locationTime")}
              >
                <Text className="text-gray-500 font-semibold text-center">
                  Xem
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
      {/* <View className="pb-14">
        <FooterStadium />
      </View> */}
    </SafeAreaView>
  );
};

export default Stadium;
