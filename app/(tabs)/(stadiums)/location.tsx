import {
  SafeAreaView,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import HeaderUser from "@/component/HeaderUser";
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
  option2: "Hue",
};

const cities = [
  { label: "Thành phố Hồ Chí Minh", value: "option1" },
  { label: "Thành phố Huế", value: "option3" },
];

const Location = () => {
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(
          `https://gopitch.onrender.com/clusters/city/${city}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`Lỗi khi gọi API: ${response.statusText}`);
        }

        const data: Stadium[] = await response.json();
        console.log("Dữ liệu từ API:", data);
        setStadiums(data);
      } finally {
        clearTimeout(timeoutId);
      }
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

  const handleCityPress = (value: string) => {
    setSelectedValue(value);
  };

  const handleViewPress = async (clusterId: string, clusterName: string) => {
    try {
      // Lưu clusterName vào AsyncStorage để sử dụng trong LocationTime
      await AsyncStorage.setItem("clusterName", clusterName);
      console.log("Lưu clusterName vào AsyncStorage:", clusterName);
      router.push({
        pathname: "/(tabs)/(stadiums)/locationTime",
        params: { clusterId },
      });
    } catch (error) {
      console.error("Lỗi khi lưu clusterName:", error);
      alert("Đã xảy ra lỗi. Vui lòng thử lại.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <HeaderUser />

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

      <View style={styles.cityContainer}>
        {cities.map((city) => (
          <TouchableOpacity
            key={city.value}
            style={[
              styles.cityButton,
              selectedValue === city.value && styles.cityButtonSelected,
            ]}
            onPress={() => handleCityPress(city.value)}
          >
            <Text
              style={[
                styles.cityButtonText,
                selectedValue === city.value && styles.cityButtonTextSelected,
              ]}
            >
              {city.label}
            </Text>
          </TouchableOpacity>
        ))}
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
                onPress={() => handleViewPress(stadium._id, stadium.name)}
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
  cityContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  cityButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    width: "48%",
    alignItems: "center",
    justifyContent: "center",
  },
  cityButtonSelected: {
    backgroundColor: "#007bff",
    borderColor: "#007bff",
  },
  cityButtonText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
    textAlign: "center",
  },
  cityButtonTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default Location;
