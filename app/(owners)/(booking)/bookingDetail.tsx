import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";

interface Booking {
  id: string;
  field: string;
  time: string;
  date: string;
  status: string;
}

const bookings: Booking[] = [
  { id: "#2212700", field: "Sân 1", time: "17:00", date: "25/03/2025", status: "Sắp tới" },
  { id: "#234567", field: "Sân 1", time: "15:00", date: "25/03/2025", status: "Hoàn thành" },
  { id: "#0123456", field: "Sân 2", time: "17:00", date: "24/03/2025", status: "Chờ duyệt" },
  { id: "#9876543", field: "Sân 1", time: "17:00", date: "24/03/2025", status: "Chờ duyệt" },
];

export default function BookingDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);

  useEffect(() => {
    const foundBooking = bookings.find((b) => b.id === id);
    setBooking(foundBooking || null);
  }, [id]);

  if (!booking) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text>Không tìm thấy booking</Text>
      </SafeAreaView>
    );
  }

  const handleApprove = () => {
    console.log(`Phê duyệt booking ${booking.id}`);
    setApproveModalVisible(true);
  };

  const handleReject = () => {
    console.log(`Từ chối booking ${booking.id}`);
    setRejectModalVisible(true);
  };

  const closeApproveModal = () => {
    setApproveModalVisible(false);
    router.push({ pathname: "/ownerBookingManagement", params: { filter: "Chờ duyệt" } });
  };

  const closeRejectModal = () => {
    setRejectModalVisible(false);
    router.push({ pathname: "/ownerBookingManagement", params: { filter: "Chờ duyệt" } });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="w-full h-[44px] bg-black" />
      <View className="flex-row items-center px-4 pt-4">
        <TouchableOpacity
          className="w-10 h-10 bg-white border border-gray-200 rounded-xl items-center justify-center"
          onPress={() => router.push({ pathname: "/ownerBookingManagement", params: { filter: "Chờ duyệt" } })}
        >
          <Ionicons name="arrow-back" size={20} color="#1E232C" />
        </TouchableOpacity>
        <Text
          className="flex-1 font-bold text-[26px] text-[#1E232C] text-center"
          style={{ fontFamily: "Open Sans" }}
        >
          Chi tiết đặt sân
        </Text>
        <View className="w-[41px] h-[41px]" />
      </View>

      <ScrollView className="flex-1 px-4 mt-4">
        <View className="mb-4">
          <Text className="text-black text-base font-bold">Người đặt sân: Nguyễn Văn A</Text>
        </View>
        <View className="w-full h-[1px] bg-black" />

        <View className="mt-4 mb-4">
          <Text className="text-black text-base font-bold">Liên hệ: 0123456789</Text>
        </View>
        <View className="w-full h-[1px] bg-black" />

        <View className="mt-4 mb-4">
          <Text className="text-black text-base font-bold">Email: user@gmail.com</Text>
        </View>
        <View className="w-full h-[1px] bg-black" />

        <View className="mt-4 mb-4">
          <Text className="text-black text-base font-bold">Sân: {booking.field}</Text>
        </View>
        <View className="w-full h-[1px] bg-black" />

        <View className="mt-4 mb-4">
          <Text className="text-black text-base font-bold">Ngày: 23/06/2025</Text>
        </View>
        <View className="w-full h-[1px] bg-black" />

        <View className="mt-4 mb-4">
          <Text className="text-black text-base font-bold">Thời gian: 1 giờ</Text>
        </View>
        <View className="w-full h-[1px] bg-black" />

        <View className="mt-4 mb-4">
          <Text className="text-black text-base font-normal">Địa chỉ: TP Thủ Đức, Thành phố Hồ Chí Minh</Text>
        </View>
        <View className="w-full h-[1px] bg-black" />

        <View className="mt-4 mb-4">
          <Text className="text-black text-base font-bold">Loại hình: Đặt nửa sân</Text>
        </View>
        <View className="w-full h-[1px] bg-black" />

        <View className="mt-4 mb-4">
          <Text className="text-black text-base font-bold">Thuê trọng tài: Có</Text>
        </View>
        <View className="w-full h-[1px] bg-black" />

        <View className="mt-4 mb-4">
          <Text className="text-black text-base font-bold">Dịch vụ khác: Nước uống | Găng tay thủ môn | Áo bib | Quay lại trận đấu</Text>
        </View>
        <View className="w-full h-[1px] bg-black" />

        <View className="mt-4 mb-4">
          <Text className="text-black text-base font-normal">Tổng cộng: 500000</Text>
        </View>
        <View className="w-full h-[1px] bg-black" />

        <View className="mt-4 mb-8">
          <Text className="text-black text-base font-normal">Trạng thái: Chưa thanh toán</Text>
        </View>

        {booking.status === "Chờ duyệt" && (
          <View className="flex-row justify-between px-4 mb-6">
            <TouchableOpacity
              className="flex-1 h-12 bg-[#119916] rounded-full items-center justify-center mr-2"
              onPress={handleApprove}
            >
              <Text className="text-white text-base font-bold">Phê duyệt</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 h-12 bg-[#FF0000] rounded-full items-center justify-center ml-2"
              onPress={handleReject}
            >
              <Text className="text-white text-base font-bold">Từ chối</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={approveModalVisible}
        onRequestClose={closeApproveModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={closeApproveModal}>
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.checkmarkContainer}>
              <Ionicons name="checkmark-circle-outline" size={60} color="#119916" />
            </View>
            <Text style={styles.successText}>Phê duyệt thành công</Text>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={rejectModalVisible}
        onRequestClose={closeRejectModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={closeRejectModal}>
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.checkmarkContainer}>
              <Ionicons name="close-circle-outline" size={60} color="#FF0000" />
            </View>
            <Text style={[styles.successText, { left: 95, width: 195 }]}>Từ chối thành công</Text>
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