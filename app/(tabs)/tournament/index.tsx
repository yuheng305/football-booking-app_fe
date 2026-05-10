import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import HeaderUser from "../../../component/HeaderUser";
import tournamentService from "@/src/services/tournament.service";
import { OrganizerTournamentItem } from "@/src/types/tournament.types";
import { toVietnameseSportType } from "@/src/utils/sport-type.util";

export default function Tournament() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<OrganizerTournamentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [helpMode, setHelpMode] = useState<"standard" | "bracket" | null>(null);

  const loadOrganizerTournaments = useCallback(async () => {
    try {
      setLoading(true);
      const rawUserData = await AsyncStorage.getItem("userData");
      const userData = rawUserData ? JSON.parse(rawUserData) : null;
      const organizerId = Number(userData?.user_id ?? userData?.id);

      if (!Number.isFinite(organizerId) || organizerId <= 0) {
        setTournaments([]);
        return;
      }

      const result = await tournamentService.listOrganizerTournaments({
        organizerId,
        offset: 0,
        limit: 20,
      });
      setTournaments(result.tournaments || []);
    } catch {
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOrganizerTournaments();
    }, [loadOrganizerTournaments])
  );

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("vi-VN");
  };

  const modeLabel = (mode?: string) => {
    if (mode === "repeat") return "Lặp theo lịch";
    if (mode === "single") return "Theo ngày cụ thể";
    return "Chưa xác định";
  };

  const paymentStatusLabel = (status?: string) => {
    if (status === "paid") return "Đã thanh toán";
    if (status === "pending") return "Chờ chủ sân duyệt";
    if (status === "confirmed") return "Chờ thanh toán";
    if (status === "no_bookings") return "Chưa có booking";
    return status || "Không rõ";
  };

  const paymentStatusClass = (status?: string) => {
    if (status === "paid") return "bg-emerald-100 text-emerald-700";
    if (status === "pending") return "bg-sky-100 text-sky-700";
    if (status === "confirmed") return "bg-amber-100 text-amber-700";
    if (status === "no_bookings") return "bg-slate-100 text-slate-600";
    return "bg-slate-100 text-slate-600";
  };

  const tournamentLevelLabel = (level?: number | null) => {
    if (level === 1) return "Level 1: Giải đấu tiêu chuẩn";
    if (level === 2) return "Level 2: Giải đấu trực tiếp theo vòng";
    if (level != null && Number.isFinite(level)) return `Level ${level}`;
    return "Chưa xác định";
  };

  const renderHelpModal = () => {
    if (!helpMode) return null;

    const isStandard = helpMode === "standard";
    const title = isStandard
      ? "Giải đấu tiêu chuẩn là gì?"
      : "Giải đấu loại trực tiếp theo vòng là gì?";

    const description = isStandard
      ? "Bạn tự chọn sân và khung giờ theo lịch mong muốn. Phù hợp khi muốn chủ động toàn bộ lịch đấu."
      : "Giải chia nhiều vòng loại trực tiếp: bạn chọn cụm sân và khung thời gian từng vòng; hệ thống tự xếp lịch trận.";

    const steps = isStandard
      ? [
          "Bước 1: Nhập thông tin giải đấu.",
          "Bước 2: Chọn cụm sân, ngày và khung giờ.",
          "Bước 3: Thiết lập lịch cụ thể hoặc lặp theo tuần.",
          "Bước 4: Xem lại và tạo giải đấu.",
        ]
      : [
          "Bước 1: Nhập thông tin giải và tên các đội.",
          "Bước 2: Chọn địa điểm và khung ngày giờ cho từng vòng, rồi tạo giải (lịch trận do hệ thống sắp).",
          "Bước 3: Xem lại tóm tắt giải/sơ đồ nhánh; thanh toán khi được yêu cầu.",
        ];

    return (
      <Modal visible transparent animationType="fade" onRequestClose={() => setHelpMode(null)}>
        <View className="flex-1 bg-black/40 items-center justify-center px-5">
          <View className="bg-white rounded-2xl w-full max-w-[360px] p-4">
            <Text className="text-gray-900 text-base font-semibold">{title}</Text>
            <Text className="text-gray-600 text-sm mt-2">{description}</Text>

            <View className="mt-3">
              {steps.map((step) => (
                <Text key={step} className="text-gray-700 text-sm mt-1">
                  • {step}
                </Text>
              ))}
            </View>

            <TouchableOpacity
              className="mt-4 bg-indigo-600 rounded-xl py-3 items-center"
              onPress={() => setHelpMode(null)}
            >
              <Text className="text-white font-semibold">Đã hiểu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <HeaderUser />

      <View className="flex-1">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : (
          <ScrollView className="flex-1 px-4 pt-4">
            <View className="mb-4">
              <Text className="text-base font-semibold text-gray-800 mb-2">Tạo giải đấu mới</Text>

              <View className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-indigo-900 text-base font-semibold">
                    Giải đấu tiêu chuẩn
                  </Text>
                  <TouchableOpacity
                    className="w-6 h-6 rounded-full border border-indigo-300 items-center justify-center"
                    onPress={() => setHelpMode("standard")}
                  >
                    <Text className="text-indigo-700 text-xs font-bold">i</Text>
                  </TouchableOpacity>
                </View>
                <Text className="text-indigo-700 text-sm mt-1">
                  Thiết lập theo 4 bước: thông tin, sân và giờ, lịch, rồi xác nhận.
                </Text>
                <TouchableOpacity
                  className="mt-3 bg-indigo-600 rounded-xl py-3 items-center"
                  onPress={async () => {
                    router.push("/(tabs)/tournament/create");
                  }}
                >
                  <Text className="text-white font-semibold">Bắt đầu tạo</Text>
                </TouchableOpacity>
              </View>

              <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-emerald-900 text-base font-semibold flex-1 pr-2">
                    Giải đấu loại trực tiếp theo vòng
                  </Text>
                  <TouchableOpacity
                    className="w-6 h-6 rounded-full border border-emerald-300 items-center justify-center"
                    onPress={() => setHelpMode("bracket")}
                  >
                    <Text className="text-emerald-700 text-xs font-bold">i</Text>
                  </TouchableOpacity>
                </View>
                <Text className="text-emerald-700 text-sm mt-1">
                  Nhập danh sách đội, sau đó đặt lịch lần lượt cho từng vòng đấu.
                </Text>
                <TouchableOpacity
                  className="mt-3 bg-emerald-600 rounded-xl py-3 items-center"
                  onPress={async () => {
                    router.push("/(tabs)/tournament/level2-create");
                  }}
                >
                  <Text className="text-white font-semibold">Bắt đầu tạo</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-base font-semibold text-gray-800 mb-2">
                Giải đấu đã tạo
              </Text>
              {tournaments.length === 0 ? (
                <Text className="text-gray-500 text-sm">
                  Chưa có giải đấu nào.
                </Text>
              ) : (
                tournaments.map((tournament) => (
                  <TouchableOpacity
                    key={tournament.id}
                    className="bg-white border border-gray-200 rounded-xl p-3 mb-2"
                    activeOpacity={0.9}
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/tournament/detail",
                        params: {
                          id: String(tournament.id),
                          paymentStatus: tournament.payment_status || "",
                        },
                      })
                    }
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <Text className="text-gray-900 font-semibold flex-1">#{tournament.id} - {tournament.name}</Text>
                      <Text
                        className={`text-[11px] font-semibold px-2 py-1 rounded-full ${paymentStatusClass(
                          tournament.payment_status
                        )}`}
                      >
                        {paymentStatusLabel(tournament.payment_status)}
                      </Text>
                    </View>
                    <Text className="text-gray-500 text-xs mt-1">
                      Môn: {toVietnameseSportType(tournament.sport_type)}
                    </Text>
                    <Text className="text-gray-500 text-xs">
                      Hình thức: {modeLabel(tournament.mode)}
                    </Text>
                    <Text className="text-gray-500 text-xs">
                      {tournamentLevelLabel(tournament.level)}
                    </Text>
                    <Text className="text-gray-500 text-xs">
                      Quy mô: {tournament.size ?? "--"} đội
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1">
                      Tạo lúc: {formatDate(tournament.created_at)}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>
        )}
      </View>

      {renderHelpModal()}
    </SafeAreaView>
  );
}
