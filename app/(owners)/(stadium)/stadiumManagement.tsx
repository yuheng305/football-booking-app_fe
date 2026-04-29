import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useCallback, useMemo } from "react";
import HeaderOwner from "@/component/HeaderOwner";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fieldService } from "@/src/services/field.service";
import { legacyApiService } from "@/src/services/legacy-api.service";

const TEMP_OWNER_CLUSTER_ID = 3;

interface Stadium {
  id: number;
  name: string;
  status: "Đang hoạt động" | "Bảo trì";
  size: string;
  clusterId: number;
  sportTypeName: string;
  description: string;
  pricePerHour: number;
}

interface StadiumManagementState {
  filter: "Tất cả" | "Đang hoạt động" | "Bảo trì";
  maintenanceModalVisible: boolean;
  resumeModalVisible: boolean;
  deleteModalVisible: boolean;
  selectedStadiumName: string;
  stadiums: Stadium[];
  isLoading: boolean;
  error: string | null;
}

export default function StadiumManagement() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clusterId?: string }>();
  const selectedClusterId = Number(params.clusterId);
  const routeClusterId =
    Number.isFinite(selectedClusterId) && selectedClusterId > 0
      ? selectedClusterId
      : TEMP_OWNER_CLUSTER_ID;
  const [state, setState] = useState<StadiumManagementState>({
    filter: "Tất cả",
    maintenanceModalVisible: false,
    resumeModalVisible: false,
    deleteModalVisible: false,
    selectedStadiumName: "",
    stadiums: [],
    isLoading: false,
    error: null,
  });

  // Fetch stadiums using temporary cluster endpoint
  const fetchStadiums = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      console.log("[STADIUM MGMT] Fetching fields for cluster:", routeClusterId);
      
      const response = await fieldService.getFieldsByCluster(routeClusterId);
      console.log("[STADIUM MGMT] API Response:", response);

      const stadiums: Stadium[] = response.fields.map((field) => ({
        id: field.id,
        name: `Sân ${field.size}`,
        status: field.status === "active" ? "Đang hoạt động" : "Bảo trì",
        size: field.size,
        clusterId: field.cluster_id,
        sportTypeName: field.sport_type?.name || "Chưa phân loại",
        description: field.description || "Chưa có mô tả",
        pricePerHour: field.price_per_hour || 0,
      }));

      setState((prev) => ({
        ...prev,
        stadiums,
        isLoading: false,
      }));
      console.log("[STADIUM MGMT] Loaded stadiums:", stadiums.length);
    } catch (error: any) {
      console.error("[STADIUM MGMT] Error fetching fields:", error);
      let errorMessage = "Đã có lỗi xảy ra khi lấy danh sách sân.";
      if (error.message?.includes("Network request failed")) {
        errorMessage = "Không thể kết nối đến server. Vui lòng kiểm tra kết nối internet.";
      } else if (error.message?.includes("401")) {
        errorMessage = "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.";
      }
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
    }
  }, [routeClusterId]);

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

  const availableSportTypes = useMemo(() => {
    const uniqueTypes = new Map<number, string>();

    state.stadiums.forEach((stadium) => {
      const existing = Array.from(uniqueTypes.values()).includes(stadium.sportTypeName);
      if (!existing) {
        uniqueTypes.set(stadium.id, stadium.sportTypeName);
      }
    });

    return Array.from(new Set(state.stadiums.map((stadium) => stadium.sportTypeName)));
  }, [state.stadiums]);

  const filteredStadiums = useMemo(
    () =>
      state.stadiums.filter((stadium) => {
        const matchesStatus =
          state.filter === "Tất cả" ? true : stadium.status === state.filter;
        return matchesStatus;
      }),
    [state.filter, state.stadiums]
  );

  const stadiumSummary = useMemo(() => {
    const activeCount = state.stadiums.filter((stadium) => stadium.status === "Đang hoạt động").length;
    const maintenanceCount = state.stadiums.filter((stadium) => stadium.status === "Bảo trì").length;
    return { total: state.stadiums.length, activeCount, maintenanceCount };
  }, [state.stadiums]);

  const handleMaintenance = async (stadiumId: number, stadiumName: string) => {
    try {
      const authToken = await AsyncStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");
      }

      await legacyApiService.updateFieldMaintainStatus(stadiumId.toString(), true, authToken);
      {
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
      }
    } catch (error: any) {
      console.error("Lỗi khi chuyển sang bảo trì:", error);
      setState((prev) => ({
        ...prev,
        error: error.message || "Không thể chuyển sân sang trạng thái bảo trì.",
      }));
    }
  };

  const handleResume = async (stadiumId: number, stadiumName: string) => {
    try {
      const authToken = await AsyncStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");
      }

      await legacyApiService.updateFieldMaintainStatus(stadiumId.toString(), false, authToken);
      {
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

  const handleDelete = async (stadiumId: number, stadiumName: string) => {
    try {
      const authToken = await AsyncStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");
      }

      await legacyApiService.deleteField(stadiumId.toString(), authToken);
      {
        setState((prev) => ({
          ...prev,
          stadiums: prev.stadiums.filter((stadium) => stadium.id !== stadiumId),
          selectedStadiumName: stadiumName,
          deleteModalVisible: true,
        }));
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
      {/* <View className="w-full h-11 bg-black" /> */}

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

        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            className="bg-[#0B8FAC] py-2 px-3 rounded-lg items-center"
            onPress={() => router.push("/(owners)/(stadium)/addField")}
          >
            <Text className="text-white text-xs font-semibold">Thêm sân</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-4 mt-5">
        <View className="bg-[#F5F8FF] rounded-2xl p-4 border border-[#d9e6fb]">
          <Text className="text-[#1E232C] font-bold text-base">Bộ lọc sân con</Text>
          <Text className="text-gray-500 text-xs mt-1">
            {stadiumSummary.total} sân con • {stadiumSummary.activeCount} đang hoạt động • {stadiumSummary.maintenanceCount} bảo trì
          </Text>

          <View className="flex-row flex-wrap gap-2 mt-3">
            {[
              { label: "Tất cả", value: "Tất cả" },
              { label: "Đang hoạt động", value: "Đang hoạt động" },
              { label: "Bảo trì", value: "Bảo trì" },
            ].map((item) => {
              const active = state.filter === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  className={`px-4 py-2 rounded-full border ${
                    active ? "bg-[#114F99] border-[#114F99]" : "bg-white border-gray-300"
                  }`}
                  onPress={() => setState((prev) => ({ ...prev, filter: item.value as StadiumManagementState["filter"] }))}
                >
                  <Text className={`text-xs font-semibold ${active ? "text-white" : "text-gray-700"}`}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 mt-4">
        {availableSportTypes.length > 0 && (
          <View className="mb-4">
            <Text className="text-[#1E232C] font-semibold mb-2">Loại sân</Text>
            <View className="flex-row flex-wrap gap-2">
              {availableSportTypes.map((sportType) => (
                <View key={sportType} className="px-3 py-1 rounded-full bg-[#eef4ff] border border-[#cfdcf7]">
                  <Text className="text-[#114F99] text-xs font-semibold">{sportType}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {filteredStadiums.length === 0 ? (
          <View className="bg-white border border-gray-200 rounded-2xl p-4">
            <Text className="text-gray-700 font-semibold">Không có sân nào khớp bộ lọc</Text>
            <Text className="text-gray-500 text-sm mt-1">Thử đổi trạng thái hoặc xem lại cụm sân hiện tại.</Text>
          </View>
        ) : (
          filteredStadiums.map((stadium) => (
            <View
              key={stadium.id}
              className="bg-white border border-[#dbe7f8] rounded-2xl mb-4 p-4"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-xl font-bold text-black">{stadium.name}</Text>
                  <Text className="text-gray-600 text-sm mt-1">{stadium.description}</Text>
                  <Text className="text-gray-600 text-sm mt-1">Loại sân: {stadium.sportTypeName}</Text>
                  <Text className="text-gray-600 text-sm mt-1">Kích thước: {stadium.size}</Text>
                  <Text className="text-[#114F99] font-semibold text-sm mt-1">
                    Giá giờ: {stadium.pricePerHour.toLocaleString("vi-VN")} VND
                  </Text>
                </View>

                <View
                  className={`px-3 py-1 rounded-full ${
                    stadium.status === "Đang hoạt động" ? "bg-emerald-100" : "bg-orange-100"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      stadium.status === "Đang hoạt động" ? "text-emerald-700" : "text-orange-700"
                    }`}
                  >
                    {stadium.status}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-2 mt-4">
                <TouchableOpacity
                  className="flex-1 bg-white border border-gray-300 rounded-xl py-3 items-center"
                  onPress={() =>
                    router.push({
                      pathname: "/(owners)/(stadium)/editField",
                      params: { stadiumName: stadium.name },
                    })
                  }
                >
                  <Text className="text-gray-700 text-sm font-semibold">Chỉnh giờ</Text>
                </TouchableOpacity>

                {stadium.status === "Đang hoạt động" ? (
                  <TouchableOpacity
                    className="flex-1 bg-white border border-gray-300 rounded-xl py-3 items-center"
                    onPress={() => handleMaintenance(stadium.id, stadium.name)}
                  >
                    <Text className="text-gray-700 text-sm font-semibold">Bảo trì</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    className="flex-1 bg-white border border-gray-300 rounded-xl py-3 items-center"
                    onPress={() => handleResume(stadium.id, stadium.name)}
                  >
                    <Text className="text-gray-700 text-sm font-semibold">Hoạt động lại</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  className="bg-[#C21010] rounded-xl px-4 py-3 items-center"
                  onPress={() => handleDelete(stadium.id, stadium.name)}
                >
                  <Text className="text-white text-sm font-semibold">Xóa</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
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
