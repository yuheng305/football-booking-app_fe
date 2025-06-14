import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Modal,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function EditServicePrice() {
  const router = useRouter();
  const { name, price } = useLocalSearchParams();
  const [newPrice, setNewPrice] = useState(price as string);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    "Vui lòng nhập đầy đủ thông tin"
  );
  const [clusterId, setClusterId] = useState<string | null>(null);
  const [isStaticService, setIsStaticService] = useState<boolean>(false); // Thêm state để kiểm tra loại dịch vụ
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClusterIdAndServices = async () => {
      try {
        const userDataString = await AsyncStorage.getItem("userData");
        if (!userDataString) {
          console.log("Không tìm thấy userData");
          router.replace("/login");
          return;
        }
        const userData = JSON.parse(userDataString);
        const ownerId = userData._id;
        if (!ownerId) {
          console.log("Không tìm thấy ownerId");
          router.replace("/login");
          return;
        }

        const token = await AsyncStorage.getItem("authToken");
        if (!token) {
          console.log("Không tìm thấy token");
          router.replace("/login");
          return;
        }

        const response = await fetch(
          `https://gopitch.onrender.com/clusters/owner/${ownerId}`,
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

        const data = await response.json();
        console.log("Dữ liệu từ API clusters/owner:", data);

        if (data && data._id) {
          setClusterId(data._id);
          // Kiểm tra xem dịch vụ có phải là staticService không
          const staticServiceNames = data.staticServices.map(
            (service: any) => service.name
          );
          setIsStaticService(staticServiceNames.includes(name));
        } else {
          throw new Error("Không tìm thấy cụm sân cho owner này");
        }
      } catch (error) {
        console.error("Lỗi khi lấy clusterId:", error);
        setErrorMessage("Không thể lấy thông tin cụm sân. Vui lòng thử lại.");
        setErrorModalVisible(true);
      } finally {
        setLoading(false);
      }
    };

    fetchClusterIdAndServices();
  }, [name, router]); // Thêm name vào dependency để đảm bảo kiểm tra lại nếu name thay đổi

  const handleSave = async () => {
    if (!newPrice.trim() || isNaN(Number(newPrice))) {
      setErrorMessage("Vui lòng nhập giá hợp lệ");
      setErrorModalVisible(true);
      return;
    }

    if (!clusterId) {
      setErrorMessage("Không tìm thấy cụm sân để cập nhật dịch vụ");
      setErrorModalVisible(true);
      return;
    }

    try {
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        console.log("Không tìm thấy token");
        router.replace("/login");
        return;
      }

      // Xác định endpoint dựa trên loại dịch vụ
      const endpointType = isStaticService
        ? "static-services"
        : "dynamic-services";
      const url = `https://gopitch.onrender.com/clusters/${clusterId}/${endpointType}?name=${encodeURIComponent(
        name as string
      )}&price=${Number(newPrice)}`;

      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: "",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Lỗi khi cập nhật dịch vụ: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      console.log("Kết quả cập nhật dịch vụ:", data);

      setSuccessModalVisible(true);
    } catch (error: unknown) {
      console.error("Lỗi khi cập nhật dịch vụ:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setErrorMessage(
        `Có lỗi xảy ra khi cập nhật dịch vụ: ${errorMsg}. Vui lòng thử lại.`
      );
      setErrorModalVisible(true);
    }
  };

  const closeSuccessModal = () => {
    setSuccessModalVisible(false);
    router.push({
      pathname: "/(owners)/(service)/serviceManagement",
      params: { refresh: "true" },
    });
  };

  const closeErrorModal = () => {
    setErrorModalVisible(false);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Text className="text-center text-lg mt-10">Đang tải...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* <View className="w-full h-11 bg-black" /> */}
      <View className="flex-row items-center px-4 pt-4">
        <TouchableOpacity
          className="w-10 h-10 bg-white border border-gray-200 rounded-xl items-center justify-center"
          onPress={() => router.push("/(owners)/(service)/serviceManagement")}
        >
          <Ionicons name="arrow-back" size={20} color="#1E232C" />
        </TouchableOpacity>
        <Text className="flex-1 font-bold text-[26px] text-[#1E232C] text-center">
          Chỉnh giá dịch vụ
        </Text>
        <View className="w-10 h-10" />
      </View>
      <View className="px-4 mt-8">
        <View className="mb-6">
          <Text className="text-black text-[15px] font-medium mb-2">
            Tên dịch vụ
          </Text>
          <View className="bg-gray-100 border border-gray-300 rounded-lg p-4">
            <Text className="text-black text-[15px] font-medium">{name}</Text>
          </View>
        </View>
        <View className="mb-6">
          <Text className="text-black text-[15px] font-medium mb-2">Giá</Text>
          <TextInput
            className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-black text-[15px] font-medium"
            value={newPrice}
            onChangeText={setNewPrice}
            keyboardType="numeric"
            placeholder="Nhập giá mới"
            placeholderTextColor="#8391A1"
            style={{ fontFamily: "Urbanist" }}
          />
        </View>
        <TouchableOpacity
          className="bg-[#0B8FAC] py-4 px-20 rounded-lg items-center mt-8 self-center"
          onPress={handleSave}
        >
          <Text className="text-white text-xl font-semibold">Lưu</Text>
        </TouchableOpacity>
      </View>
      <Modal
        animationType="fade"
        transparent={true}
        visible={successModalVisible}
        onRequestClose={closeSuccessModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeSuccessModal}
            >
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.checkmarkContainer}>
              <Ionicons
                name="checkmark-circle-outline"
                size={60}
                color="#119916"
              />
            </View>
            <Text style={styles.successText}>Cập nhật thành công</Text>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="fade"
        transparent={true}
        visible={errorModalVisible}
        onRequestClose={closeErrorModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeErrorModal}
            >
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.checkmarkContainer}>
              <Ionicons name="warning-outline" size={60} color="#FF0000" />
            </View>
            <Text
              style={[
                styles.successText,
                { left: 40, width: 304, color: "#FF0000" },
              ]}
            >
              {errorMessage}
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: 384,
    height: 252,
    backgroundColor: "#E3FFE2",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  closeButton: {
    position: "absolute",
    top: 18,
    left: 332,
    width: 38,
    height: 38,
    backgroundColor: "#808080",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkContainer: {
    position: "absolute",
    top: 66,
    left: 162,
    width: 60,
    height: 60,
  },
  successText: {
    position: "absolute",
    top: 153,
    left: 60,
    width: 264,
    height: 28,
    fontFamily: "Exo",
    fontWeight: "700",
    fontSize: 24,
    lineHeight: 28,
    textAlign: "center",
    letterSpacing: -1,
    color: "#119916",
  },
});
