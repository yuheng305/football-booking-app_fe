import {
  SafeAreaView,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useState, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import Header from "@/component/Header";
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
  option1: "HCM",
  option2: "DaNang",
  option3: "Hue",
  option4: "HaiPhong",
};

const Location = () => {
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedDate } = useLocalSearchParams();

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

  useEffect(() => {
    if (selectedValue && cityMapping[selectedValue]) {
      fetchStadiums(cityMapping[selectedValue]);
    } else {
      setStadiums([]);
    }
  }, [selectedValue]);

  const handleValueChange = (value: string | null) => {
    setSelectedValue(value);
  };

  const handleLogoPress = () => {
    router.push("/(tabs)/home");
  };

  const handleViewPress = (clusterId: string) => {
    router.push({
      pathname: "/(tabs)/(stadiums)/locationTime",
      params: { clusterId, selectedDate },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <Header />

      <View className="w-full px-4 py-2 flex-row justify-between items-center">
        <Text className="text-2xl font-semibold mt-4 mb-2">
          Chọn địa điểm đặt sân
        </Text>
        <TouchableOpacity
          className="border border-red-500 bg-white px-8 py-2 rounded-full"
          onPress={() => router.back()}
        >
          <Text className="text-red-600 font-semibold text-lg">Quay lại</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedValue}
          onValueChange={handleValueChange}
          style={styles.picker}
        >
          <Picker.Item label="Chọn một thành phố..." value={null} />
          <Picker.Item label="Thành phố Hồ Chí Minh" value="option1" />
          <Picker.Item label="Thành phố Đà Nẵng" value="option2" />
          <Picker.Item label="Thành phố Huế" value="option3" />
          <Picker.Item label="Thành phố Hải Phòng" value="option4" />
        </Picker>
      </View>

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
                source={require("../../../assets/images/player.png")}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  pickerContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  picker: {
    height: 50,
    width: "100%",
  },
});

export default Location;
