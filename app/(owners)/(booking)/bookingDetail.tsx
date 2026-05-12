import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { bookingService } from "@/src/services/booking.service";
import type { Booking as BookingType } from "@/src/types/booking.types";
import { imageService } from "@/src/services/image.service";
import ContactActions from "@/component/ContactActions";
import AppPopup from "@/component/AppPopup";

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
  price: number;
}

export default function BookingDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [booking, setBooking] = useState<DisplayBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmRejectModalVisible, setConfirmRejectModalVisible] =
    useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [playerInfo, setPlayerInfo] = useState<{
    id: number;
    fullName: string;
    email: string;
    phone: string;
    role?: string;
  } | null>(null);
  const [playerQrUrl, setPlayerQrUrl] = useState<string | null>(null);
  const [loadingPlayerInfo, setLoadingPlayerInfo] = useState(false);
  const [showEmergencyInfo, setShowEmergencyInfo] = useState(false);
  const [showQrPreview, setShowQrPreview] = useState(false);

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
    const loadPlayerEmergencyInfo = async (targetPlayerId: number) => {
      setLoadingPlayerInfo(true);
      try {
        const [profile, qrUrl] = await Promise.all([
          bookingService.getUserBasicProfile(targetPlayerId),
          imageService.getQrCodeUrl(targetPlayerId),
        ]);

        setPlayerInfo(profile);
        setPlayerQrUrl(qrUrl);
      } finally {
        setLoadingPlayerInfo(false);
      }
    };

    const fetchBookingDetail = async () => {
      try {
        console.log("[BOOKING DETAIL] Fetching booking ID:", id);
        const bookingId = parseInt(id as string);
        
        const data: BookingType = await bookingService.getBookingById(bookingId);
        console.log("[BOOKING DETAIL] API Response:", JSON.stringify(data, null, 2));

        const displayBooking: DisplayBooking = {
          id: data.id,
          field: `Sân ${data.field.size}`,
          fieldSize: data.field.size,
          time: `${data.start_time} - ${data.end_time}`,
          date: new Date(data.booking_date).toLocaleDateString("vi-VN"),
          status: data.status,
          statusDisplay: mapStatus(data.status),
          clubName: data.club?.name || `CLB #${data.club_id}`,
          clubAddress: data.club?.address || "Không có dữ liệu",
          clusterName: data.field?.cluster?.name || "Không có dữ liệu",
          clusterAddress: data.field?.cluster ? `${data.field.cluster.street}, ${data.field.cluster.district}, ${data.field.cluster.city}` : "Không có dữ liệu",
          price: data.total_price,
        };

        setBooking(displayBooking);
        setPlayerId(data.player_id || null);
        console.log("[BOOKING DETAIL] Loaded booking:", displayBooking);

        if (data.player_id) {
          await loadPlayerEmergencyInfo(data.player_id);
        }
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
        <Text>Không tìm thấy đặt sân</Text>
      </SafeAreaView>
    );
  }

  const handleApprove = async () => {
    if (!booking) return;
    try {
      setSubmittingAction(true);
      console.log(`[BOOKING DETAIL] Approve booking ${booking.id}`);
      await bookingService.ownerConfirmBooking(booking.id, "Chủ sân đã xác nhận đặt sân");
      setBooking((prev) =>
        prev
          ? {
              ...prev,
              status: "confirmed",
              statusDisplay: mapStatus("confirmed"),
            }
          : prev
      );
      router.replace("/(owners)/(booking)/ownerBookingManagement");
    } catch (error: any) {
      console.error("[BOOKING DETAIL] Error approving booking:", error);
      Alert.alert("Lỗi", error?.message || "Không thể phê duyệt đặt sân");
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
      const resp = await bookingService.ownerRejectBooking(booking.id, "Chủ sân đã từ chối đặt sân");
      const newStatus = resp?.data?.status || "canceled";
      setBooking((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus,
              statusDisplay: mapStatus(newStatus),
            }
          : prev
      );

      setConfirmRejectModalVisible(false);
      router.replace("/(owners)/(booking)/ownerBookingManagement");
    } catch (error) {
      console.error("[BOOKING DETAIL] Error rejecting booking:", error);
      Alert.alert("Lỗi", "Không thể từ chối đặt sân. Vui lòng thử lại!");
    } finally {
      setSubmittingAction(false);
    }
  };

  const closeConfirmRejectModal = () => {
    setConfirmRejectModalVisible(false);
  };

  const handleOpenChat = () => {
    if (!playerId) {
      Alert.alert("Thông báo", "Không tìm thấy người chơi để liên hệ");
      return;
    }

    router.push({
      pathname: "/chat",
      params: {
        receiverId: String(playerId),
        name: playerInfo?.fullName || "Người đặt",
      },
    } as any);
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

      <ScrollView className="flex-1 px-4 mt-4" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Club info hidden per owner request */}

        <View className="bg-blue-50 border border-blue-200 rounded-xl mb-4 overflow-hidden">
          <TouchableOpacity
            className="px-4 py-3 flex-row items-center justify-between"
            onPress={() => setShowEmergencyInfo((prev) => !prev)}
          >
            <View className="flex-row items-center flex-1 pr-3">
              <Ionicons name="shield-checkmark-outline" size={18} color="#1d4ed8" />
              <Text className="text-blue-900 text-base font-bold ml-2 flex-1">
                Thông tin user xử lý sự cố
              </Text>
            </View>
            <Ionicons
              name={showEmergencyInfo ? "chevron-up" : "chevron-down"}
              size={20}
              color="#1d4ed8"
            />
          </TouchableOpacity>

          {showEmergencyInfo && (
            <View className="px-4 pb-4 border-t border-blue-200">
              {loadingPlayerInfo ? (
                <View className="items-center py-3">
                  <ActivityIndicator size="small" color="#1d4ed8" />
                  <Text className="text-blue-700 mt-2">Đang tải thông tin người dùng...</Text>
                </View>
              ) : (
                <>
                  <Text className="text-gray-800 font-semibold mt-3">
                    Họ tên: {playerInfo?.fullName || "Không có dữ liệu"}
                  </Text>
                  <Text className="text-gray-700 mt-1">
                    Email: {playerInfo?.email || "Không có dữ liệu"}
                  </Text>
                  <Text className="text-gray-700 mt-1">SĐT: {playerInfo?.phone || "Không có dữ liệu"}</Text>
                  <ContactActions receiverId={playerInfo?.id || playerId} name={playerInfo?.fullName} phone={playerInfo?.phone} />
                  <Text className="text-gray-700 mt-1">Mã người đặt: {playerInfo?.id || playerId || "--"}</Text>

                  <View className="mt-3 pt-3 border-t border-blue-200">
                    <Text className="text-blue-900 font-semibold mb-2">Mã QR nhận tiền của người đặt</Text>
                    {playerQrUrl ? (
                      <>
                        <Image
                          source={{ uri: playerQrUrl }}
                          style={{ width: 220, height: 220, borderRadius: 12 }}
                          resizeMode="cover"
                        />
                        <View className="flex-row mt-3">
                          <TouchableOpacity
                            className="bg-blue-600 px-4 py-2 rounded-lg mr-2"
                            onPress={() => setShowQrPreview(true)}
                          >
                            <Text className="text-white font-semibold">Xem trước</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            className="bg-white border border-blue-600 px-4 py-2 rounded-lg"
                            onPress={() => Linking.openURL(playerQrUrl)}
                          >
                            <Text className="text-blue-700 font-semibold">Mở/Tải về</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <Text className="text-amber-700">Người đặt chưa cập nhật mã QR nhận tiền.</Text>
                    )}
                    <Text className="text-xs text-gray-600 mt-2">
                      Chỉ dùng mã QR này khi cần hoàn tiền hoặc chuyển khoản xử lý sự cố đặt sân.
                    </Text>
                  </View>
                </>
              )}
            </View>
          )}
        </View>
        <View className="w-full h-[1px] bg-gray-300" />

        {/* Club address hidden per owner request */}
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
              <Text className="text-white text-base font-bold">Từ chối</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <AppPopup
        visible={confirmRejectModalVisible}
        title="Từ chối đặt sân?"
        message="Đặt sân này sẽ được chuyển sang trạng thái đã hủy. Hành động này không nên thực hiện nếu bạn vẫn có thể phục vụ khung giờ đó."
        tone="danger"
        onClose={closeConfirmRejectModal}
        dismissible={!submittingAction}
        actions={[
          {
            label: "Quay lại",
            variant: "secondary",
            onPress: closeConfirmRejectModal,
            disabled: submittingAction,
          },
          {
            label: "Từ chối",
            variant: "danger",
            onPress: confirmReject,
            loading: submittingAction,
          },
        ]}
      />

      <AppPopup
        visible={showQrPreview}
        title="Mã QR nhận tiền"
        tone="info"
        icon="qr-code-outline"
        onClose={() => setShowQrPreview(false)}
        actions={[
          {
            label: "Đóng",
            variant: "primary",
            onPress: () => setShowQrPreview(false),
          },
        ]}
      >
        {playerQrUrl ? (
          <Image
            source={{ uri: playerQrUrl }}
            style={{ width: 260, height: 260, borderRadius: 14 }}
            resizeMode="cover"
          />
        ) : (
          <Text style={{ color: "#6b7280" }}>Không có mã QR</Text>
        )}
      </AppPopup>

      <TouchableOpacity
        className="absolute right-5 bottom-6 w-14 h-14 rounded-full bg-blue-600 items-center justify-center shadow"
        onPress={handleOpenChat}
      >
        <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
