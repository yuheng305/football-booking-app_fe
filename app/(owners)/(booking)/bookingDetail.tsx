import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { bookingService } from "@/src/services/booking.service";
import type { Booking as BookingType } from "@/src/types/booking.types";

interface DisplayBooking {
  id: number;
  field: string;
  fieldSize: string;
  time: string;
  date: string;
  status: string;
  statusDisplay: string;
  clubName: string;
  clubAddress: string;
  clusterName: string;
  clusterAddress: string;
  type: string;
  price: number;
}

export default function BookingDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [booking, setBooking] = useState<DisplayBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [confirmRejectModalVisible, setConfirmRejectModalVisible] =
    useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Map API status to display status
  const mapStatus = (status: string): string => {
    switch (status) {
      case "confirmed":
        return "Đã xác nhận";
      case "completed":
        return "Hoàn thành";
      case "payment_required":
      case "pending":
        return "Chờ thanh toán";
      case "canceled":
        return "Đã hủy";
      default:
        return status;
    }
  };

  useEffect(() => {
    const fetchBookingDetail = async () => {
      try {
        console.log("[BOOKING DETAIL] Fetching booking ID:", id);
        const bookingId = parseInt(id as string);
        
        const data: BookingType = await bookingService.getBookingById(bookingId);
        console.log("[BOOKING DETAIL] API Response:", JSON.stringify(data, null, 2));

        const displayBooking: DisplayBooking = {
          id: data.id,
          field: data.field.name,
          fieldSize: data.field.size,
          time: `${data.start_time} - ${data.end_time}`,
          date: new Date(data.booking_date).toLocaleDateString("vi-VN"),
          status: data.status,
          statusDisplay: mapStatus(data.status),
          clubName: data.club.name,
          clubAddress: data.club.address,
          clusterName: data.field.cluster.name,
          clusterAddress: `${data.field.cluster.street}, ${data.field.cluster.district}, ${data.field.cluster.city}`,
          type: data.type === "half" ? "Nửa sân" : "Toàn sân",
          price: data.total_price,
        };

        setBooking(displayBooking);
        console.log("[BOOKING DETAIL] Loaded booking:", displayBooking);
      } catch (error) {
        console.error("[BOOKING DETAIL] Error:", error);
        Alert.alert("Lỗi", "Không thể tải thông tin đặt sân");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchBookingDetail();
    }
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

  const handleApprove = async () => {
    if (!booking) return;
    try {
      setSubmittingAction(true);
      console.log(`[BOOKING DETAIL] Approve booking ${booking.id}`);
      await bookingService.ownerConfirmBooking(booking.id, "Owner approved booking");
      setBooking((prev) =>
        prev
          ? {
              ...prev,
              status: "confirmed",
              statusDisplay: mapStatus("confirmed"),
            }
          : prev
      );
      setApproveModalVisible(true);
    } catch (error: any) {
      console.error("[BOOKING DETAIL] Error approving booking:", error);
      Alert.alert("Lỗi", error?.message || "Không thể phê duyệt booking");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReject = () => {
    console.log(`[BOOKING DETAIL] Confirm reject booking ${booking.id}`);
    setConfirmRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (!booking) return;
    try {
      setSubmittingAction(true);
      console.log(`[BOOKING DETAIL] Rejecting booking ${booking.id}`);
      await bookingService.ownerCancelBooking(booking.id, "Owner canceled booking");
      setBooking((prev) =>
        prev
          ? {
              ...prev,
              status: "canceled",
              statusDisplay: mapStatus("canceled"),
            }
          : prev
      );
      
      setConfirmRejectModalVisible(false);
      setRejectModalVisible(true);
    } catch (error) {
      console.error("[BOOKING DETAIL] Error rejecting booking:", error);
      Alert.alert("Lỗi", "Không thể từ chối booking. Vui lòng thử lại!");
    } finally {
      setSubmittingAction(false);
    }
  };

  const closeApproveModal = () => {
    setApproveModalVisible(false);
    router.push("/(owners)/(booking)/ownerBookingManagement");
  };

  const closeRejectModal = () => {
    setRejectModalVisible(false);
    router.push("/(owners)/(booking)/ownerBookingManagement");
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
          onPress={() => router.push("/(owners)/(booking)/ownerBookingManagement")}
        >
          <Ionicons name="arrow-back" size={20} color="#1E232C" />
        </TouchableOpacity>
        <Text className="flex-1 font-bold text-[26px] text-[#1E232C] text-center">
          Chi tiết đặt sân
        </Text>
        <View className="w-[41px] h-[41px]" />
      </View>

      <ScrollView className="flex-1 px-4 mt-4">
        <View className="mb-4">
          <Text className="text-gray-900 text-lg font-bold">
            CLB: {booking.clubName}
          </Text>
        </View>
        <View className="w-full h-[1px] bg-gray-300" />

        <View className="mt-4 mb-4">
          <Text className="text-gray-900 text-base font-semibold">
            Địa chỉ CLB: {booking.clubAddress}
          </Text>
        </View>
        <View className="w-full h-[1px] bg-gray-300" />

        <View className="mt-4 mb-4">
          <Text className="text-gray-900 text-base font-semibold">
            Cụm sân: {booking.clusterName}
          </Text>
        </View>
        <View className="w-full h-[1px] bg-gray-300" />

        <View className="mt-4 mb-4">
          <Text className="text-gray-900 text-base font-normal">
            Địa chỉ: {booking.clusterAddress}
          </Text>
        </View>
        <View className="w-full h-[1px] bg-gray-300" />

        <View className="mt-4 mb-4">
          <Text className="text-gray-900 text-base font-bold">
            Sân: {booking.field} ({booking.fieldSize})
          </Text>
        </View>
        <View className="w-full h-[1px] bg-gray-300" />

        <View className="mt-4 mb-4">
          <Text className="text-gray-900 text-base font-bold">
            Ngày: {booking.date}
          </Text>
        </View>
        <View className="w-full h-[1px] bg-gray-300" />

        <View className="mt-4 mb-4">
          <Text className="text-gray-900 text-base font-bold">
            Giờ: {booking.time}
          </Text>
        </View>
        <View className="w-full h-[1px] bg-gray-300" />

        <View className="mt-4 mb-4">
          <Text className="text-gray-900 text-base font-bold">
            Loại hình: {booking.type}
          </Text>
        </View>
        <View className="w-full h-[1px] bg-gray-300" />

        <View className="mt-4 mb-4">
          <Text className="text-gray-900 text-lg font-bold">
            Tổng cộng: {booking.price.toLocaleString("vi-VN")} VNĐ
          </Text>
        </View>
        <View className="w-full h-[1px] bg-gray-300" />

        <View className="mt-4 mb-8">
          <Text
            className={`text-base font-bold ${
              booking.status === "payment_required"
                ? "text-[#FF9500]"
                : booking.status === "confirmed"
                ? "text-[#119916]"
                : booking.status === "completed"
                ? "text-[#114F99]"
                : "text-gray-500"
            }`}
          >
            Trạng thái: {booking.statusDisplay}
          </Text>
        </View>

        {(booking.status === "payment_required" || booking.status === "pending") && (
          <View className="flex-row justify-between px-4 mb-6">
            <TouchableOpacity
              className="flex-1 h-12 bg-[#119916] rounded-full items-center justify-center mr-2"
              onPress={handleApprove}
              disabled={submittingAction}
            >
              <Text className="text-white text-base font-bold">
                {submittingAction ? "Đang xử lý..." : "Phê duyệt"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 h-12 bg-[#FF0000] rounded-full items-center justify-center ml-2"
              onPress={handleReject}
              disabled={submittingAction}
            >
              <Text className="text-white text-base font-bold">Hủy</Text>
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
            <Text style={styles.successText}>Xác nhận thành công</Text>
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
                disabled={submittingAction}
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
