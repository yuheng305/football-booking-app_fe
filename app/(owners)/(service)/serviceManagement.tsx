import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router"; // Thêm useFocusEffect
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback } from "react"; // Thêm useCallback
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Service {
  name: string;
  price: number;
}

export default function ServiceManagement() {
  const router = useRouter();
  const { refresh } = useLocalSearchParams();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [nonDeletableServices, setNonDeletableServices] = useState<string[]>(
    []
  );
  const [clusterId, setClusterId] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
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
      console.log("Dữ liệu từ API:", data);

      const staticServices = data.staticServices.map((service: any) => ({
        name: service.name,
        price: service.price,
      }));
      const dynamicServices = data.dynamicServices.map((service: any) => ({
        name: service.name,
        price: service.price,
      }));

      setServices([...staticServices, ...dynamicServices]);
      setNonDeletableServices(
        staticServices.map((service: Service) => service.name)
      );
      setClusterId(data._id); // Lưu clusterId để sử dụng trong handleDelete
    } catch (error: unknown) {
      console.error("Lỗi khi lấy dữ liệu dịch vụ:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setErrorMessage(`Lỗi khi lấy dữ liệu: ${errorMsg}`);
      setErrorModalVisible(true);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      fetchServices(); // Gọi lại API mỗi khi trang được focus
    }, [fetchServices])
  );

  const handleDelete = async (serviceName: string) => {
    if (!clusterId) {
      setErrorMessage("Không tìm thấy cụm sân để xóa dịch vụ");
      setErrorModalVisible(true);
      return;
    }

    // Kiểm tra nếu dịch vụ là staticService (không cho phép xóa)
    if (nonDeletableServices.includes(serviceName)) {
      setErrorMessage("Không thể xóa dịch vụ mặc định");
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

      const url = `https://gopitch.onrender.com/clusters/${clusterId}/dynamic-services?name=${encodeURIComponent(
        serviceName
      )}`;

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Lỗi khi xóa dịch vụ: ${response.status} - ${errorText}`
        );
      }

      // Nếu xóa thành công trên server, cập nhật state
      setServices(services.filter((service) => service.name !== serviceName));
      setSuccessModalVisible(true);
    } catch (error: unknown) {
      console.error("Lỗi khi xóa dịch vụ:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setErrorMessage(`Có lỗi xảy ra khi xóa dịch vụ: ${errorMsg}`);
      setErrorModalVisible(true);
    }
  };

  const closeSuccessModal = () => {
    setSuccessModalVisible(false);
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
      <View className="w-full h-11 bg-black" />
      <View className="flex-row items-center px-4 pt-4">
        <TouchableOpacity
          className="w-10 h-10 bg-white border border-gray-200 rounded-xl items-center justify-center"
          onPress={() => router.push("../(booking)/ownerBookingManagement")}
        >
          <Ionicons name="arrow-back" size={20} color="#1E232C" />
        </TouchableOpacity>
        <View className="flex-1 flex-row justify-center items-center">
          <Text className="font-bold text-[26px] text-[#1E232C] text-center mr-4">
            Quản lý dịch vụ
          </Text>
          <TouchableOpacity
            onPress={() => router.push("../(booking)/ownerBookingManagement")}
          >
            <Text className="text-[#114F99] text-base font-normal">
              Quản lý đặt sân
            </Text>
          </TouchableOpacity>
        </View>
        <View className="w-10 h-10" />
      </View>
      <TouchableOpacity
        className="bg-[#0B8FAC] py-2 rounded-lg px-4 mx-4 mt-4 items-center"
        onPress={() => router.push("/(owners)/(service)/addService")}
      >
        <Text className="text-white font-semibold text-xl">Thêm dịch vụ</Text>
      </TouchableOpacity>
      <ScrollView className="flex-1 px-4 mt-4">
        <View className="flex-row bg-gray-200 border border-gray-400 rounded-t">
          <Text className="flex-1 p-2 font-bold text-sm text-black">
            Dịch vụ
          </Text>
          <Text className="flex-1 p-2 font-bold text-sm text-black text-right">
            Giá (VND)
          </Text>
        </View>
        {services.map((service, index) => (
          <View
            key={index}
            className={`flex-row items-center bg-white border border-gray-400 ${
              index === services.length - 1 ? "rounded-b" : ""
            }`}
          >
            <Text className="flex-1 p-2 text-sm text-black">
              {service.name}
            </Text>
            <Text className="flex-1 p-2 text-sm text-black text-right">
              {service.price.toLocaleString()}
            </Text>
            <TouchableOpacity
              className="p-2"
              onPress={() =>
                router.push({
                  pathname: "/(owners)/(service)/editServicePrice",
                  params: {
                    name: service.name,
                    price: service.price.toString(),
                  },
                })
              }
            >
              <Ionicons name="pencil-outline" size={20} color="#0B8FAC" />
            </TouchableOpacity>
            {!nonDeletableServices.includes(service.name) && (
              <TouchableOpacity
                className="p-2"
                onPress={() => handleDelete(service.name)}
              >
                <Ionicons name="trash-outline" size={20} color="#FF0000" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
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
            <Text style={[styles.successText, { left: 80, width: 225 }]}>
              Xóa thành công
            </Text>
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
