import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router"; // Added useFocusEffect
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useCallback } from "react"; // Added useCallback
import HeaderOwner from "@/component/HeaderOwner";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Stadium {
  id: string;
  name: string;
  status: "Đang hoạt động" | "Bảo trì";
}

interface StadiumManagementState {
  filter: "Đang hoạt động" | "Bảo trì";
  maintenanceModalVisible: boolean;
  resumeModalVisible: boolean;
  deleteModalVisible: boolean;
  selectedStadiumName: string;
  stadiums: Stadium[];
  ownerId: string | null;
  isLoading: boolean;
  error: string | null;
}

export default function StadiumManagement() {
  const router = useRouter();
  const [state, setState] = useState<StadiumManagementState>({
    filter: "Đang hoạt động",
    maintenanceModalVisible: false,
    resumeModalVisible: false,
    deleteModalVisible: false,
    selectedStadiumName: "",
    stadiums: [],
    ownerId: null,
    isLoading: false,
    error: null,
  });

  // Fetch ownerId and token from AsyncStorage
  useEffect(() => {
    const getUserData = async () => {
      try {
        const userDataString = await AsyncStorage.getItem("userData");
        const authToken = await AsyncStorage.getItem("authToken");
        if (userDataString && authToken) {
          const userData = JSON.parse(userDataString);
          setState((prev) => ({ ...prev, ownerId: userData._id }));
        } else {
          setState((prev) => ({
            ...prev,
            error:
              "Không tìm thấy thông tin người dùng hoặc token. Vui lòng đăng nhập lại.",
          }));
        }
      } catch (error) {
        console.error("Lỗi khi lấy thông tin người dùng:", error);
        setState((prev) => ({
          ...prev,
          error: "Đã có lỗi xảy ra khi lấy thông tin người dùng.",
        }));
      }
    };
    getUserData();
  }, []);

  // Fetch stadiums when ownerId is available or screen is focused
  const fetchStadiums = useCallback(async () => {
    if (!state.ownerId) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const authToken = await AsyncStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");
      }

      const response = await fetch(
        `https://gopitch.onrender.com/fields/owner/${state.ownerId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Lỗi ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setState((prev) => ({
        ...prev,
        stadiums: data.map((field: any) => ({
          id: field._id,
          name: field.name,
          status: field.isMaintain ? "Bảo trì" : "Đang hoạt động",
        })),
        isLoading: false,
      }));
    } catch (error: any) {
      console.error("Lỗi khi lấy danh sách sân:", error);
      let errorMessage = "Đã có lỗi xảy ra khi lấy danh sách sân.";
      if (error.message.includes("Network request failed")) {
        errorMessage =
          "Không thể kết nối đến server. Vui lòng kiểm tra kết nối internet.";
      } else if (
        error.message.includes("401") ||
        error.message.includes("Token")
      ) {
        errorMessage = "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.";
      }
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
    }
  }, [state.ownerId]);

  // Refetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchStadiums();
    }, [fetchStadiums])
  );

  // Handle errors with Alert
  useEffect(() => {
    if (state.error) {
      Alert.alert("Lỗi", state.error, [
        {
          text: "OK",
          onPress: () => {
            if (state.error?.includes("đăng nhập")) {
              router.replace("/login");
            }
            setState((prev) => ({ ...prev, error: null }));
          },
        },
      ]);
    }
  }, [state.error]);

  const filteredStadiums = state.stadiums.filter(
    (stadium) => stadium.status === state.filter
  );

  const handleMaintenance = async (stadiumId: string, stadiumName: string) => {
    try {
      const authToken = await AsyncStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");
      }

      const response = await fetch(
        `https://gopitch.onrender.com/fields/${stadiumId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ isMaintain: true }),
        }
      );
      if (response.ok) {
        setState((prev) => ({
          ...prev,
          stadiums: prev.stadiums.map((stadium) =>
            stadium.id === stadiumId
              ? { ...stadium, status: "Bảo trì" }
              : stadium
          ),
          selectedStadiumName: stadiumName,
          maintenanceModalVisible: true,
        }));
      } else {
        throw new Error(`Lỗi ${response.status}: ${await response.text()}`);
      }
    } catch (error: any) {
      console.error("Lỗi khi chuyển sang bảo trì:", error);
      setState((prev) => ({
        ...prev,
        error: error.message || "Không thể chuyển sân sang trạng thái bảo trì.",
      }));
    }
  };

  const handleResume = async (stadiumId: string, stadiumName: string) => {
    try {
      const authToken = await AsyncStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");
      }

      const response = await fetch(
        `https://gopitch.onrender.com/fields/${stadiumId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ isMaintain: false }),
        }
      );
      if (response.ok) {
        setState((prev) => ({
          ...prev,
          stadiums: prev.stadiums.map((stadium) =>
            stadium.id === stadiumId
              ? { ...stadium, status: "Đang hoạt động" }
              : stadium
          ),
          selectedStadiumName: stadiumName,
          resumeModalVisible: true,
        }));
      } else {
        throw new Error(`Lỗi ${response.status}: ${await response.text()}`);
      }
    } catch (error: any) {
      console.error("Lỗi khi chuyển sang hoạt động lại:", error);
      setState((prev) => ({
        ...prev,
        error:
          error.message || "Không thể chuyển sân sang trạng thái hoạt động.",
      }));
    }
  };

  const handleDelete = async (stadiumId: string, stadiumName: string) => {
    try {
      const authToken = await AsyncStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");
      }

      const response = await fetch(
        `https://gopitch.onrender.com/fields/${stadiumId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      if (response.ok) {
        setState((prev) => ({
          ...prev,
          stadiums: prev.stadiums.filter((stadium) => stadium.id !== stadiumId),
          selectedStadiumName: stadiumName,
          deleteModalVisible: true,
        }));
      } else {
        throw new Error(`Lỗi ${response.status}: ${await response.text()}`);
      }
    } catch (error: any) {
      console.error("Lỗi khi xóa sân:", error);
      setState((prev) => ({
        ...prev,
        error: error.message || "Không thể xóa sân.",
      }));
    }
  };

  const closeMaintenanceModal = () => {
    setState((prev) => ({
      ...prev,
      maintenanceModalVisible: false,
      selectedStadiumName: "",
    }));
  };

  const closeResumeModal = () => {
    setState((prev) => ({
      ...prev,
      resumeModalVisible: false,
      selectedStadiumName: "",
    }));
  };

  const closeDeleteModal = () => {
    setState((prev) => ({
      ...prev,
      deleteModalVisible: false,
      selectedStadiumName: "",
    }));
  };

  if (state.isLoading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#0000ff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="w-full h-11 bg-black" />

      <View className="flex-row items-center px-4 pt-4">
        <TouchableOpacity
          className="w-10 h-10 bg-white border border-gray-200 rounded-xl items-center justify-center"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#1E232C" />
        </TouchableOpacity>

        <Text className="flex-1 font-bold text-[26px] text-[#1E232C] text-center">
          Danh sách sân
        </Text>

        <TouchableOpacity
          className="bg-[#0B8FAC] py-2 px-4 rounded-lg items-center"
          onPress={() => router.push("/(owners)/(stadium)/addField")}
        >
          <Text className="text-white text-xs font-semibold">Thêm sân</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row justify-center gap-4 px-4 mt-6">
        <TouchableOpacity
          className={`${
            state.filter === "Đang hoạt động"
              ? "bg-[#119916]"
              : "bg-white border-2 border-[#119916]"
          } px-6 py-2 rounded-full items-center`}
          onPress={() =>
            setState((prev) => ({ ...prev, filter: "Đang hoạt động" }))
          }
        >
          <Text
            className={`text-base font-medium ${
              state.filter === "Đang hoạt động"
                ? "text-white"
                : "text-[#119916]"
            }`}
          >
            Đang hoạt động
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`${
            state.filter === "Bảo trì"
              ? "bg-[#114F99]"
              : "bg-white border-2 border-[#114F99]"
          } px-6 py-2 rounded-full items-center`}
          onPress={() => setState((prev) => ({ ...prev, filter: "Bảo trì" }))}
        >
          <Text
            className={`text-base font-medium ${
              state.filter === "Bảo trì" ? "text-white" : "text-[#114F99]"
            }`}
          >
            Bảo trì
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 mt-6">
        {filteredStadiums.map((stadium) => (
          <View
            key={stadium.id}
            className="bg-white border border-[#11993C] rounded-lg mb-4 p-4 flex-row items-center justify-between"
          >
            <Text className="text-xl font-semibold text-black">
              {stadium.name}
            </Text>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                className="bg-white border-2 border-gray-500 rounded-full w-8 h-8 items-center justify-center"
                onPress={() =>
                  router.push({
                    pathname: "/(owners)/(stadium)/editField",
                    params: { stadiumName: stadium.name },
                  })
                }
              >
                <Ionicons name="time-outline" size={20} color="#000000" />
              </TouchableOpacity>
              {stadium.status === "Đang hoạt động" ? (
                <TouchableOpacity
                  className="bg-white border-2 border-gray-500 rounded-full px-4 py-2"
                  onPress={() => handleMaintenance(stadium.id, stadium.name)}
                >
                  <Text className="text-gray-500 text-base font-medium">
                    Bảo trì
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  className="bg-white border-2 border-gray-500 rounded-full px-4 py-2"
                  onPress={() => handleResume(stadium.id, stadium.name)}
                >
                  <Text className="text-gray-500 text-base font-medium">
                    Hoạt động lại
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                className="bg-[#C21010] rounded-full px-4 py-2"
                onPress={() => handleDelete(stadium.id, stadium.name)}
              >
                <Text className="text-white text-base font-medium">Xóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={state.maintenanceModalVisible}
        onRequestClose={closeMaintenanceModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeMaintenanceModal}
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
            <Text style={styles.successText}>Bảo trì thành công</Text>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={state.resumeModalVisible}
        onRequestClose={closeResumeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeResumeModal}
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
            <Text style={styles.successText}>Hoạt động lại thành công</Text>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={state.deleteModalVisible}
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeDeleteModal}
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
