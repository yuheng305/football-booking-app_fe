import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Booking {
  id: string;
  field: string;
  time: string;
  date: string;
  status: string;
  userName?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  slot?: number;
  services?: { name: string; price: number }[];
  price?: number;
}

export default function BookingDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [confirmRejectModalVisible, setConfirmRejectModalVisible] =
    useState(false);

  useEffect(() => {
    const fetchBookingDetail = async () => {
      try {
        const token = await AsyncStorage.getItem("authToken");
        if (!token) {
          console.log("Không tìm thấy token");
          router.replace("/login");
          return;
        }

        const response = await fetch(
          `https://gopitch.onrender.com/bookings/${id}`,
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

        setBooking({
          id: data.bookingId,
          field: data.fieldName,
          time: `${data.startHour}:00`,
          date: data.date.split("T")[0],
          status: "Chờ duyệt",
          userName: data.userName,
          phoneNumber: data.phoneNumber,
          email: data.email,
          address: data.address,
          slot: data.slot,
          services: data.services,
          price: data.price,
        });
      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu chi tiết đặt sân:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetail();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text>Đang tải...</Text>
      </SafeAreaView>
    );
  }

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
    console.log(`Mở modal xác nhận từ chối booking ${booking.id}`);
    setConfirmRejectModalVisible(true);
  };

  const confirmReject = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        Alert.alert("Lỗi", "Không tìm thấy token, vui lòng đăng nhập lại!");
        router.replace("/login");
        return;
      }

      const response = await fetch(
        `https://gopitch.onrender.com/bookings/${booking.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Lỗi khi xóa booking: ${response.statusText}`);
      }

      console.log(`Xóa booking ${booking.id} thành công`);
      setConfirmRejectModalVisible(false);
      setRejectModalVisible(true);
    } catch (error) {
      console.error("Lỗi khi xóa booking:", error);
      Alert.alert("Lỗi", "Không thể xóa booking. Vui lòng thử lại!");
    }
  };

  const closeApproveModal = () => {
    setApproveModalVisible(false);
    router.push({
      pathname: "/ownerBookingManagement",
      params: { filter: "Chờ duyệt" },
    });
  };

  const closeRejectModal = () => {
    setRejectModalVisible(false);
    router.push({
      pathname: "/ownerBookingManagement",
      params: { filter: "Chờ duyệt" },
    });
  };

  const closeConfirmRejectModal = () => {
    setConfirmRejectModalVisible(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* <View className="w-full h-[44px] bg-black" /> */}
      <View className="flex-row items-center px-4 pt-4">
        <TouchableOpacity
          className="w-10 h-10 bg-white border border-gray-200 rounded-xl items-center justify-center"
          onPress={() =>
            router.push({
              pathname: "/ownerBookingManagement",
              params: { filter: "Chờ duyệt" },
            })
          }
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
          <Text className="text-black text-base font-bold">
            Người đặt sân: {booking.userName}
          </Text>
        </View>
        <View className="w-full h-[1px] bg-black" />

        <View className="mt-4 mb-4">
          <Text className="text-black text-base font-bold">
            Liên hệ: {booking.phoneNumber}
          </Text>
        </View>
        <View className="w-full h-[1px] bg-black" />

        <View className="mt-4 mb-4">
          <Text className="text-black text-base font-bold">
            Email: {booking.email}
          </Text>
        </View>
        <View className="w-full h-[1px] bg-black" />

        <View className="mt-4 mb-4">
          <Text className="text-black text-base font-bold">
            Sân: {booking.field}
          </Text>
        </View>
        <View className="w-full h-[1px] bg-black" />

        <View className="mt-4 mb-4">
          <Text className="text-black text-base font-bold">
            Ngày: {booking.date}
          </Text>
        </View>
        <View className="w-full h-[1px] bg-black" />

        <View className="mt-4 mb-4">
          <Text className="text-black text-base font-bold">
            Thời gian: {booking.slot} giờ
          </Text>
        </View>
        <View className="w-full h-[1px] bg-black" />

        <View className="mt-4 mb-4">
          <Text className="text-black text-base font-normal">
            Địa chỉ: {booking.address}
          </Text>
        </View>
        <View className="w-full h-[1px] bg-black" />

        <View className="mt-4 mb-4">
          <Text className="text-black text-base font-bold">
            Loại hình: Đặt {booking.slot === 1 ? "nửa sân" : "toàn sân"}
          </Text>
        </View>
        <View className="w-full h-[1px] bg-black" />

        <View className="mt-4 mb-4">
          <Text className="text-black text-base font-bold">
            Thuê trọng tài:{" "}
            {booking.services?.some((s) => s.name === "Thuê trọng tài")
              ? "Có"
              : "Không"}
          </Text>
        </View>
        <View className="w-full h-[1px] bg-black" />

        <View className="mt-4 mb-4">
          <Text className="text-black text-base font-bold">
            Dịch vụ khác:{" "}
            {booking.services
              ?.filter((s) => s.name !== "Thuê trọng tài")
              .map((s) => s.name)
              .join(" | ") || "Không có"}
          </Text>
        </View>
        <View className="w-full h-[1px] bg-black" />

        <View className="mt-4 mb-4">
          <Text className="text-black text-base font-normal">
            Tổng cộng: {booking.price} VND
          </Text>
        </View>
        <View className="w-full h-[1px] bg-black" />

        <View className="mt-4 mb-8">
          <Text className="text-black text-base font-normal">
            Trạng thái: Chưa thanh toán
          </Text>
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
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeApproveModal}
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
          <View style={styles.modalRejectContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeRejectModal}
            >
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.iconContainer}>
              <Ionicons name="close-circle-outline" size={60} color="#FF0000" />
            </View>
            <Text style={styles.rejectSuccessText}>Từ chối thành công</Text>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={confirmRejectModalVisible}
        onRequestClose={closeConfirmRejectModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalRejectContainer}>
            <Text style={styles.confirmText}>
              Bạn có chắc chắn muốn từ chối booking này?
            </Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeConfirmRejectModal}
              >
                <Text style={styles.buttonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmReject}
              >
                <Text style={styles.buttonText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
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
  modalRejectContainer: {
    width: 384,
    height: 252,
    backgroundColor: "#FFE2E2", // Màu đỏ nhạt cho cả hai modal từ chối
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    position: "absolute",
    top: 18,
    right: 18,
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
  iconContainer: {
    marginBottom: 20,
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
  rejectSuccessText: {
    fontFamily: "Exo",
    fontWeight: "700",
    fontSize: 24,
    lineHeight: 28,
    textAlign: "center",
    letterSpacing: -1,
    color: "#FF0000", // Màu đỏ đậm cho văn bản
  },
  confirmText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
    color: "#1E232C",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  cancelButton: {
    backgroundColor: "#808080",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    elevation: 3,
  },
  confirmButton: {
    backgroundColor: "#FF0000",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    elevation: 3,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});
