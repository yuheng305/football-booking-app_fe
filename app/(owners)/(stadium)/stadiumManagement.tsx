import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

const stadiums = [
  { id: "1", name: "SAN1", status: "Đang hoạt động" },
  { id: "2", name: "SAN2", status: "Đang hoạt động" },
  { id: "3", name: "SAN3", status: "Bảo trì" },
];

export default function StadiumManagement() {
  const router = useRouter();
  const [filter, setFilter] = useState("Đang hoạt động");
  const [maintenanceModalVisible, setMaintenanceModalVisible] = useState(false);
  const [resumeModalVisible, setResumeModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedStadiumName, setSelectedStadiumName] = useState("");

  const filteredStadiums = stadiums.filter((stadium) => stadium.status === filter);

  const handleMaintenance = (stadiumName: string) => {
    setSelectedStadiumName(stadiumName);
    setMaintenanceModalVisible(true);
  };

  const handleResume = (stadiumName: string) => {
    setSelectedStadiumName(stadiumName);
    setResumeModalVisible(true);
  };

  const handleDelete = (stadiumName: string) => {
    setSelectedStadiumName(stadiumName);
    setDeleteModalVisible(true);
  };

  const closeMaintenanceModal = () => {
    setMaintenanceModalVisible(false);
    setSelectedStadiumName("");
  };

  const closeResumeModal = () => {
    setResumeModalVisible(false);
    setSelectedStadiumName("");
  };

  const closeDeleteModal = () => {
    setDeleteModalVisible(false);
    setSelectedStadiumName("");
  };

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
            filter === "Đang hoạt động" ? "bg-[#119916]" : "bg-white border-2 border-[#119916]"
          } px-6 py-2 rounded-full items-center`}
          onPress={() => setFilter("Đang hoạt động")}
        >
          <Text
            className={`text-base font-medium ${
              filter === "Đang hoạt động" ? "text-white" : "text-[#119916]"
            }`}
          >
            Đang hoạt động
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`${
            filter === "Bảo trì" ? "bg-[#114F99]" : "bg-white border-2 border-[#114F99]"
          } px-6 py-2 rounded-full items-center`}
          onPress={() => setFilter("Bảo trì")}
        >
          <Text
            className={`text-base font-medium ${
              filter === "Bảo trì" ? "text-white" : "text-[#114F99]"
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
            <Text className="text-xl font-semibold text-black">{stadium.name}</Text>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                className="bg-white border-2 border-gray-500 rounded-full w-8 h-8 items-center justify-center"
                onPress={() => router.push({ pathname: "/(owners)/(stadium)/editField", params: { stadiumName: stadium.name } })}
              >
                <Ionicons name="time-outline" size={20} color="#000000" />
              </TouchableOpacity>
              {stadium.status === "Đang hoạt động" ? (
                <TouchableOpacity
                  className="bg-white border-2 border-gray-500 rounded-full px-4 py-2"
                  onPress={() => handleMaintenance(stadium.name)}
                >
                  <Text className="text-gray-500 text-base font-medium">Bảo trì</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  className="bg-white border-2 border-gray-500 rounded-full px-4 py-2"
                  onPress={() => handleResume(stadium.name)}
                >
                  <Text className="text-gray-500 text-base font-medium">Hoạt động lại</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                className="bg-[#C21010] rounded-full px-4 py-2"
                onPress={() => handleDelete(stadium.name)}
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
        visible={maintenanceModalVisible}
        onRequestClose={closeMaintenanceModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={closeMaintenanceModal}>
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.checkmarkContainer}>
              <Ionicons name="checkmark-circle-outline" size={60} color="#119916" />
            </View>
            <Text style={styles.successText}>Bảo trì thành công</Text>
          </View>
        </View>
      </Modal>


      <Modal
        animationType="fade"
        transparent={true}
        visible={resumeModalVisible}
        onRequestClose={closeResumeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={closeResumeModal}>
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.checkmarkContainer}>
              <Ionicons name="checkmark-circle-outline" size={60} color="#119916" />
            </View>
            <Text style={styles.successText}>Hoạt động lại thành công</Text>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={closeDeleteModal}>
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.checkmarkContainer}>
              <Ionicons name="checkmark-circle-outline" size={60} color="#119916" />
            </View>
            <Text style={[styles.successText, { left: 80, width: 225 }]}>Xóa thành công</Text>
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