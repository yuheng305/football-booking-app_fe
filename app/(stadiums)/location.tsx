import {
  SafeAreaView,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import RNPickerSelect from "react-native-picker-select";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import Header from "@/component/Header";
import FooterStadium from "@/component/FooterStadium";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Stadium {
  _id: string;
  ownerId: string;
  name: string;
  address: string;
  city: string;
  fields: {
    _id: string;
    name: string;
    closeHour: number;
    clusterId: string;
    isMaintain: boolean;
    openHour: number;
  }[];
  staticServices: {
    _id: string;
    name: string;
    price: number;
  }[];
  dynamicServices: {
    _id: string;
    name: string;
    price: number;
  }[];
  __v: number;
  updatedAt: string;
}

const cityMapping: { [key: string]: string } = {
  option1: "HCM", // Thành phố Hồ Chí Minh
  option2: "DaNang", // Thành phố Đà Nẵng
  option3: "Hue", // Thành phố Huế
  option4: "HaiPhong", // Thành phố Hải Phòng
};

const Stadium = () => {
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hàm gọi API để lấy danh sách cụm sân theo thành phố
  const fetchStadiums = async (city: string) => {
    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        console.log("Không tìm thấy token");
        router.replace("/login");
        return;
      }

      const response = await fetch(
        `https://gopitch.onrender.com/clusters/city/${city}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Lỗi khi gọi API: ${response.statusText}`);
      }

      const data: Stadium[] = await response.json();
      console.log("Dữ liệu từ API:", data);
      setStadiums(data);
    } catch (error: unknown) {
      console.error("Lỗi khi lấy danh sách sân:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setError(`Không thể lấy danh sách sân: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Gọi API khi selectedValue thay đổi
  useEffect(() => {
    if (selectedValue && cityMapping[selectedValue]) {
      fetchStadiums(cityMapping[selectedValue]);
    } else {
      setStadiums([]); // Reset danh sách khi không chọn thành phố
    }
  }, [selectedValue]);

  // Sửa lỗi TypeScript bằng cách khai báo kiểu cho value
  const handleValueChange = (value: string | null) => {
    setSelectedValue(value);
  };

  const handleLogoPress = () => {
    router.push("/(tabs)/home");
  };

  // Hàm xử lý khi nhấn "Xem"
  const handleViewPress = (clusterId: string) => {
    router.push({
      pathname: "/(stadiums)/locationTime",
      params: { clusterId },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header */}
      <Header />

      {/* Content */}
      <View className="w-full px-4 py-2 flex-row justify-between items-center">
        <Text className="text-2xl font-semibold mt-4 mb-2">
          Chọn địa điểm đặt sân
        </Text>
        <TouchableOpacity
          className="border border-red-500  bg-white px-8 py-2 rounded-full"
          onPress={() => router.back()}
        >
          <Text className="text-red-600 font-semibold text-lg">Quay lại</Text>
        </TouchableOpacity>
      </View>

      <RNPickerSelect
        onValueChange={handleValueChange}
        items={[
          { label: "Thành phố Hồ Chí Minh", value: "option1" },
          { label: "Thành phố Đà Nẵng", value: "option2" },
          { label: "Thành phố Huế", value: "option3" },
          { label: "Thành phố Hải Phòng", value: "option4" },
        ]}
        placeholder={{ label: "Chọn một thành phố...", value: null }}
      />

      {loading && <Text className="text-center text-lg mt-4">Đang tải...</Text>}

      {error && <Text className="text-center text-red-500 mt-4">{error}</Text>}

      {selectedValue && !loading && !error && stadiums.length > 0 && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          className="flex-col mt-4"
        >
          {stadiums.map((stadium) => (
            <View
              key={stadium._id}
              className="flex-row w-full h-40 border-1 border-black items-center p-4 border-b-2"
            >
              <Image
                source={require("../../assets/images/player.png")}
                resizeMode="contain"
                className="w-32 h-full"
              />
              <View className="flex-1 justify-center items-center">
                <Text className="text-[#060b28] font-semibold text-center mt-2">
                  {stadium.address}
                </Text>
                <Text className="text-[#060b28] font-bold text-2xl text-center mt-2">
                  {stadium.name}
                </Text>
              </View>
              <TouchableOpacity
                className="bg-white rounded-2xl w-1/5 h-1/8 p-2 m-2 border-2 border-gray-500"
                onPress={() => handleViewPress(stadium._id)}
              >
                <Text className="text-gray-500 font-semibold text-center">
                  Xem
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {selectedValue && !loading && !error && stadiums.length === 0 && (
        <Text className="text-center text-lg mt-4">
          Không có sân nào tại thành phố này.
        </Text>
      )}

      {/* Footer */}
      {/* <View className="pb-14">
        <FooterStadium />
      </View> */}
    </SafeAreaView>
  );
};

export default Stadium;
