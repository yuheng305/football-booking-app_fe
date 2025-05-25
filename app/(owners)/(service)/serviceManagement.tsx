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

export default function ServiceManagement() {
  const router = useRouter();
  const [services, setServices] = useState([
    { name: "Thuê sân (1 giờ)", price: 160000 },
    { name: "Thuê trọng tài", price: 80000 },
    { name: "Thuê thủ môn", price: 80000 },
    { name: "Nước uống", price: 20000 },
    { name: "Áo bibs (10 cái)", price: 80000 },
    { name: "Găng tay thủ môn", price: 10000 },
    { name: "Quây lưới trận đấu", price: 70000 },
  ]);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const nonDeletableServices = ["Thuê sân (1 giờ)", "Thuê trọng tài", "Thuê thủ môn"];

  const handleDelete = (serviceName: string) => {
    setServices(services.filter((service) => service.name !== serviceName));
    setSuccessModalVisible(true);
  };

  const closeSuccessModal = () => {
    setSuccessModalVisible(false);
  };

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
          <TouchableOpacity onPress={() => router.push("../(booking)/ownerBookingManagement")}>
            <Text className="text-[#114F99] text-base font-normal">Quản lý đặt sân</Text>
          </TouchableOpacity>
        </View>
        <View className="w-10 h-10" />
      </View>
      <TouchableOpacity
        className="bg-[#0B8FAC] py-2 rounded px-4 mx-4 mt-4 items-center"
        onPress={() => router.push("/(owners)/(service)/addService")}
      >
        <Text className="text-white font-semibold text-xs">Thêm dịch vụ</Text>
      </TouchableOpacity>
      <ScrollView className="flex-1 px-4 mt-4">
        <View className="flex-row bg-gray-200 border border-gray-400 rounded-t">
          <Text className="flex-1 p-2 font-bold text-sm text-black">Dịch vụ</Text>
          <Text className="flex-1 p-2 font-bold text-sm text-black text-right">Giá (VND)</Text>
        </View>
        {services.map((service, index) => (
          <View
            key={index}
            className={`flex-row items-center bg-white border border-gray-400 ${
              index === services.length - 1 ? "rounded-b" : ""
            }`}
          >
            <Text className="flex-1 p-2 text-sm text-black">{service.name}</Text>
            <Text className="flex-1 p-2 text-sm text-black text-right">
              {service.price.toLocaleString()}
            </Text>
            <TouchableOpacity
              className="p-2"
              onPress={() =>
                router.push({
                  pathname: "/(owners)/(service)/editServicePrice",
                  params: { name: service.name, price: service.price.toString() },
                })
              }
            >
              <Ionicons name="pencil-outline" size={20} color="#0B8FAC" />
            </TouchableOpacity>
            {!nonDeletableServices.includes(service.name) && (
              <TouchableOpacity className="p-2" onPress={() => handleDelete(service.name)}>
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
            <TouchableOpacity style={styles.closeButton} onPress={closeSuccessModal}>
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