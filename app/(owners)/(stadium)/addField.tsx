import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AddField() {
  const router = useRouter();
  const [fieldName, setFieldName] = useState("");
  const [note, setNote] = useState("");
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!fieldName) {
      Alert.alert("Lỗi", "Vui lòng điền tên sân!");
      return;
    }

    setLoading(true);
    try {
      const authToken = await AsyncStorage.getItem("authToken");
      if (!authToken) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại!");
        return;
      }

      const response = await fetch("https://gopitch.onrender.com/fields", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: fieldName,
          openHour: 7, // Mặc định theo ví dụ
          closeHour: 22, // Mặc định theo ví dụ
          isMaintain: false, // Mặc định theo ví dụ
          clusterId: "6809b04e7456305b0fb34f5b", // Mặc định theo ví dụ
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccessModalVisible(true);
      } else {
        Alert.alert("Lỗi", data.message || "Thêm sân thất bại!");
      }
    } catch (error: any) {
      console.error("Lỗi khi thêm sân:", error);
      let errorMessage = "Đã có lỗi xảy ra. Vui lòng thử lại!";
      if (error.message.includes("Network request failed")) {
        errorMessage =
          "Không thể kết nối đến server. Vui lòng kiểm tra kết nối internet.";
      }
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const closeSuccessModal = () => {
    setSuccessModalVisible(false);
    router.push("/stadiumManagement");
  };

  if (loading) {
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
          onPress={() => router.push("/stadiumManagement")}
        >
          <Ionicons name="arrow-back" size={20} color="#1E232C" />
        </TouchableOpacity>

        <Text className="flex-1 font-bold text-[26px] text-[#1E232C] text-center">
          Thêm sân
        </Text>

        <View className="w-10 h-10" />
      </View>

      <View className="px-4 mt-8">
        <View className="mb-6">
          <Text className="text-black text-[15px] font-medium mb-2">
            Tên sân
          </Text>
          <TextInput
            className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-black text-[15px] font-medium"
            value={fieldName}
            onChangeText={setFieldName}
            placeholder="Nhập tên sân"
            placeholderTextColor="#8391A1"
            style={{ fontFamily: "Urbanist" }}
          />
        </View>

        <View className="mb-6">
          <Text className="text-black text-[15px] font-medium mb-2">
            Ghi chú
          </Text>
          <TextInput
            className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-black text-[15px] font-medium"
            value={note}
            onChangeText={setNote}
            placeholder="Nhập ghi chú"
            placeholderTextColor="#8391A1"
            style={{ fontFamily: "Urbanist" }}
          />
        </View>

        <View className="mb-6">
          <Text className="text-black text-[15px] font-medium mb-2">
            Upload images
          </Text>
          <View className="w-[82px] h-[82px] bg-gray-200" />
        </View>

        <TouchableOpacity
          className="bg-[#0B8FAC] py-4 px-20 rounded-lg items-center mt-8 self-center"
          onPress={handleSave}
          disabled={loading}
        >
          <Text className="text-white text-xl font-semibold">Thêm</Text>
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
            <Text style={styles.successText}>Thêm sân thành công</Text>
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
    left: 80,
    width: 225,
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
