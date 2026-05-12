import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { bookingService } from "@/src/services/booking.service";
import { clusterService } from "@/src/services/cluster.service";
import tournamentService from "@/src/services/tournament.service";
import { fieldService } from "@/src/services/field.service";
import type { Booking as BookingType, BookingStatus } from "@/src/types/booking.types";
import paymentService from "@/src/services/payment.service";
import {
  OwnerRevenueClusterItem,
  OwnerRevenueData,
  PaymentItem,
} from "@/src/types/payment.types";
import {
  OwnerTournamentItem,
  TournamentOwnerBookingStatus,
} from "@/src/types/tournament.types";
import { toVietnameseSportType } from "@/src/utils/sport-type.util";

const TEMP_OWNER_CLUSTER_ID = 3;

type ManagementPanel = "field" | "revenue" | "tournament";

/** Doanh thu BE chỉ cộng thanh toán hoàn tất — modal chi tiết phải khớp. */
const isPaymentCountedInOwnerRevenue = (status: string) => {
  const n = String(status || "").toLowerCase();
  return n === "success" || n === "completed";
};

interface DisplayBooking {
  id: number;
  displayId: string;
  field: string;
  time: string;
  date: string;
  status: string;
  clubName: string;
}

export default function BookingManagement() {
  const router = useRouter();
  const [activePanel, setActivePanel] = useState<ManagementPanel>("field");
  const [filter, setFilter] = useState("All");
  const [ownerFields, setOwnerFields] = useState<{ id: number; size: string }[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [ownerClusters, setOwnerClusters] = useState<{ id: number; name: string }[]>([]);
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(null);
  const [showClusterDropdown, setShowClusterDropdown] = useState(false);
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState<boolean>(true);
  const [bookings, setBookings] = useState<DisplayBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenueData, setRevenueData] = useState<OwnerRevenueData | null>(null);
  const [ownerPayments, setOwnerPayments] = useState<PaymentItem[]>([]);
  const [ownerPaymentsLoading, setOwnerPaymentsLoading] = useState(false);
  const [paymentClusterByBookingId, setPaymentClusterByBookingId] = useState<
    Record<number, { clusterId: number; clusterName: string }>
  >({});
  const [selectedRevenueCluster, setSelectedRevenueCluster] =
    useState<OwnerRevenueClusterItem | null>(null);
  const [clusterPayments, setClusterPayments] = useState<PaymentItem[]>([]);
  const [clusterPaymentsLoading, setClusterPaymentsLoading] = useState(false);
  const [showClusterPaymentModal, setShowClusterPaymentModal] = useState(false);

  const [ownerTournaments, setOwnerTournaments] = useState<OwnerTournamentItem[]>([]);
  const [tournamentLoading, setTournamentLoading] = useState(false);
  const [tournamentStatusFilter, setTournamentStatusFilter] =
    useState<TournamentOwnerBookingStatus>("all");
  const [approvingTournamentId, setApprovingTournamentId] = useState<number | null>(null);

  /** Khớp booking.types BookingStatus + vài giá trị BE gửi thêm */
  const mapStatus = (status: string): string => {
    const s = String(status ?? "").trim().toLowerCase();
    switch (s) {
      case "pending":
        return "Chờ duyệt";
      case "confirmed":
      case "approved":
        return "Đã xác nhận";
      case "payment_required":
        return "Chờ thanh toán";
      case "completed":
      case "success":
        return "Hoàn thành";
      case "canceled":
      case "cancelled":
      case "rejected":
        return "Đã hủy";
      default:
        return "Không xác định";
    }
  };

  /** Ánh xạ chip UI → query BE (không dùng includes("chờ") — tránh "Chờ thanh toán" → pending). */
  const resolveOwnerBookingStatusQuery = (
    filterKey: string
  ): BookingStatus | "done_merged" | undefined => {
    switch (filterKey) {
      case "All":
        return undefined;
      case "Chờ duyệt":
        return "pending";
      case "Đã xác nhận":
        return "confirmed";
      case "Chờ thanh toán":
        return "payment_required";
      case "Hoàn thành":
        return "done_merged";
      case "Đã hủy":
        return "canceled";
      default:
        return undefined;
    }
  };

  // Load owner clusters on mount and restore stored cluster selection
  useEffect(() => {
    (async () => {
      try {
        const clustersResp = await clusterService.getClusters({ offset: 0, limit: 50 });
        console.log("[OWNER BOOKINGS] getClusters response:", clustersResp);
        setOwnerClusters((clustersResp.clusters || []).map((c: any) => ({ id: c.id, name: c.name })));

        const storedCluster = await AsyncStorage.getItem("clusterId");
        if (storedCluster && Number.isFinite(Number(storedCluster))) {
          setSelectedClusterId(Number(storedCluster));
        }
      } catch (e) {
        console.warn("[OWNER BOOKINGS] Failed to load clusters on mount", e);
      }
    })();
  }, []);

  // Load fields whenever selectedClusterId changes
  useEffect(() => {
    (async () => {
      if (selectedClusterId) {
        try {
          const fieldsResp = await fieldService.getFieldsByCluster(selectedClusterId);
          setOwnerFields(fieldsResp.fields.map((f: any) => ({ id: f.id, size: f.size })));
        } catch (e) {
          console.warn("[OWNER BOOKINGS] Could not load fields for cluster", e);
          setOwnerFields([]);
        }
      } else {
        setOwnerFields([]);
      }
    })();
  }, [selectedClusterId]);

  const fetchBookings = useCallback(async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);

      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        router.replace("/login");
        return;
      }

      if (!isRefreshing) {
        const cached = await AsyncStorage.getItem("ownerBookingsCache");
        if (cached) {
          setBookings(JSON.parse(cached));
          setLoading(false);
        }
      }

      // selectedClusterId should be set (from storage or owner clusters). If not, try to resolve it now.
      let clusterId = selectedClusterId;
      if (!clusterId) {
        const storedCluster = await AsyncStorage.getItem("clusterId");
        if (storedCluster && Number.isFinite(Number(storedCluster))) {
          clusterId = Number(storedCluster);
          setSelectedClusterId(clusterId);
        }
      }

      // Do not auto-select a cluster by default. Allow null to mean "All clusters".
      if (!clusterId) {
        try {
          const clusters = await clusterService.getClusters({ offset: 0, limit: 50 });
          console.log("[OWNER BOOKINGS] getClusters (fetchBookings) response:", clusters);
          setOwnerClusters((clusters.clusters || []).map((c) => ({ id: c.id, name: c.name })));
        } catch (e) {
          console.warn("[OWNER BOOKINGS] Could not resolve clusterId dynamically", e);
        }
      }

      // Allow null clusterId to mean "all clusters". Do not throw.

      // Ensure ownerClusters list is populated for cluster selector
      try {
        const clusters = await clusterService.getClusters({ offset: 0, limit: 50 });
        setOwnerClusters((clusters.clusters || []).map((c) => ({ id: c.id, name: c.name })));
      } catch (e) {
        // non-fatal
      }

      // Load fields for the cluster so owner can filter by field (only when a cluster is selected)
      if (clusterId) {
        try {
          const fieldsResp = await fieldService.getFieldsByCluster(clusterId);
          setOwnerFields(fieldsResp.fields.map((f) => ({ id: f.id, size: f.size })));
        } catch (e) {
          console.warn("[OWNER BOOKINGS] Could not load fields for cluster", e);
        }
      } else {
        setOwnerFields([]);
      }

      const statusQuery = resolveOwnerBookingStatusQuery(filter);

      const baseParams = {
        fieldId: selectedFieldId ?? undefined,
        offset: 0,
        limit: 100,
        ...(clusterId ? { clusterId } : {}),
      };

      let responseBookings: BookingType[];

      if (statusQuery === "done_merged") {
        const [resSuccess, resCompleted] = await Promise.all([
          bookingService.getOwnerBookings({ ...baseParams, status: "success" }),
          bookingService.getOwnerBookings({ ...baseParams, status: "completed" }),
        ]);
        const byId = new Map<number, BookingType>();
        for (const b of [...resSuccess.bookings, ...resCompleted.bookings]) {
          byId.set(b.id, b);
        }
        responseBookings = Array.from(byId.values());
      } else {
        const response = await bookingService.getOwnerBookings({
          ...baseParams,
          ...(statusQuery ? { status: statusQuery } : {}),
        });
        responseBookings = response.bookings;
      }

      const displayBookings: DisplayBooking[] = responseBookings
        .filter((booking: BookingType) => !booking.tournament_id)
        .map(
          (booking: BookingType, index: number) => ({
            id: booking.id,
            displayId: `#${booking.id}`,
            field:
              (booking as any)?.field?.name ||
              (booking.field?.size ? `Sân ${booking.field.size}` : `Sân #${booking.field_id}`),
            time: `${booking.start_time} - ${booking.end_time}`,
            date: new Date(booking.booking_date).toLocaleDateString("vi-VN"),
            status: mapStatus(booking.status),
            clubName: booking.club?.name || `CLB #${booking.club_id}`,
          })
        );

      setBookings(displayBookings);
      await AsyncStorage.setItem("ownerBookingsCache", JSON.stringify(displayBookings));
    } catch (error) {
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes("not authenticated") || message.includes("403")) {
          router.replace("/login");
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, selectedClusterId, selectedFieldId, filter]);

  const fetchRevenue = useCallback(async () => {
    try {
      setRevenueLoading(true);
      const data = await paymentService.getOwnerRevenue("month");
      setRevenueData(data);
    } catch (error) {
      console.error("[OWNER REVENUE] Error:", error);
    } finally {
      setRevenueLoading(false);
    }
  }, []);

  const fetchOwnerPayments = useCallback(async () => {
    try {
      setOwnerPaymentsLoading(true);
      const data = await paymentService.getOwnerPayments({
        offset: 0,
        limit: 100,
      });
      const payments = data.payments || [];
      setOwnerPayments(payments);
      return payments;
    } catch (error) {
      console.error("[OWNER PAYMENTS] Error:", error);
      setOwnerPayments([]);
      return [] as PaymentItem[];
    } finally {
      setOwnerPaymentsLoading(false);
    }
  }, []);

  const fetchOwnerTournaments = useCallback(async () => {
    try {
      setTournamentLoading(true);
      const data = await tournamentService.listOwnerTournaments({
        bookingStatus: tournamentStatusFilter,
        offset: 0,
        limit: 20,
      });
      setOwnerTournaments(data.tournaments || []);
    } catch (error) {
      console.error("[OWNER TOURNAMENT] Error:", error);
      setOwnerTournaments([]);
    } finally {
      setTournamentLoading(false);
    }
  }, [tournamentStatusFilter]);

  useFocusEffect(
    useCallback(() => {
      fetchBookings(false);
      fetchRevenue();
      fetchOwnerPayments();
      fetchOwnerTournaments();
    }, [fetchBookings, fetchRevenue, fetchOwnerPayments, fetchOwnerTournaments])
  );

  useEffect(() => {
    fetchOwnerTournaments();
  }, [fetchOwnerTournaments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings(true);
    fetchRevenue();
    fetchOwnerPayments();
    fetchOwnerTournaments();
  }, [fetchBookings, fetchRevenue, fetchOwnerPayments, fetchOwnerTournaments]);

  const loadClusterMappingsForPayments = useCallback(async (payments: PaymentItem[]) => {
    const bookingIds = Array.from(
      new Set(
        payments
          .map((payment) => payment.booking_id)
          .filter((bookingId): bookingId is number => Number.isFinite(bookingId) && bookingId > 0)
      )
    );

    const missingBookingIds = bookingIds.filter((bookingId) => !paymentClusterByBookingId[bookingId]);
    if (missingBookingIds.length === 0) {
      return;
    }

    const entries = await Promise.all(
      missingBookingIds.map(async (bookingId) => {
        try {
          const booking = await bookingService.getBookingById(bookingId);
          const clusterId = booking.field?.cluster_id;
          const clusterName = booking.field?.cluster?.name;

          if (clusterId && clusterName) {
            return [bookingId, { clusterId, clusterName }] as const;
          }
        } catch {
          // Ignore missing booking detail and keep list usable.
        }

        return null;
      })
    );

    const validEntries = entries.filter(
      (entry): entry is readonly [number, { clusterId: number; clusterName: string }] => !!entry
    );

    if (validEntries.length === 0) {
      return;
    }

    setPaymentClusterByBookingId((prev) => {
      const next = { ...prev };
      validEntries.forEach(([bookingId, cluster]) => {
        next[bookingId] = cluster;
      });
      return next;
    });
  }, [paymentClusterByBookingId]);

  const formatPaymentStatus = (status: string) => {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "success" || normalized === "completed") return "Thành công";
    if (normalized === "pending") return "Đang chờ";
    if (normalized === "processing" || normalized === "in_progress" || normalized === "pending_payment")
      return "Đang xử lý";
    if (normalized === "confirmed") return "Đã xác nhận";
    if (normalized === "expired") return "Hết hạn";
    if (normalized === "failed" || normalized === "canceled" || normalized === "cancelled")
      return "Thất bại";
    return "Không xác định";
  };

  const shouldShowPaymentType = (paymentType?: string | null) => {
    const normalized = String(paymentType || "").trim().toLowerCase();
    return normalized !== "" && normalized !== "deposit";
  };

  const formatPaymentType = (paymentType?: string | null) => {
    const normalized = String(paymentType || "").trim().toLowerCase();
    if (normalized === "remaining") return "Thanh toán còn lại";
    return String(paymentType || "").trim();
  };

  const openClusterPayments = async (cluster: OwnerRevenueClusterItem) => {
    try {
      setSelectedRevenueCluster(cluster);
      setShowClusterPaymentModal(true);
      setClusterPaymentsLoading(true);

      const paymentsSource =
        ownerPayments.length > 0
          ? ownerPayments
          : ownerPaymentsLoading
          ? []
          : await fetchOwnerPayments();

      const revenuePayments = paymentsSource.filter((p) =>
        isPaymentCountedInOwnerRevenue(String(p.status))
      );

      await loadClusterMappingsForPayments(revenuePayments);

      const filtered = revenuePayments.filter((payment) => {
        const mapping = paymentClusterByBookingId[payment.booking_id];
        return mapping?.clusterId === cluster.cluster_id;
      });

      setClusterPayments(
        filtered.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      );
    } catch (error) {
      console.error("[OWNER REVENUE] openClusterPayments error", error);
      setClusterPayments([]);
    } finally {
      setClusterPaymentsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedRevenueCluster || !showClusterPaymentModal) {
      return;
    }

    const filtered = ownerPayments
      .filter((p) => isPaymentCountedInOwnerRevenue(String(p.status)))
      .filter((payment) => {
        const mapping = paymentClusterByBookingId[payment.booking_id];
        return mapping?.clusterId === selectedRevenueCluster.cluster_id;
      });

    setClusterPayments(
      filtered.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    );
  }, [ownerPayments, paymentClusterByBookingId, selectedRevenueCluster, showClusterPaymentModal]);

  const formatCurrency = (amount?: number) => {
    return (amount || 0).toLocaleString("vi-VN") + " VND";
  };

  const formatDate = (value?: string) => {
    if (!value) return "--";
    return new Date(value).toLocaleDateString("vi-VN");
  };

  const getTournamentFilterLabel = (status: TournamentOwnerBookingStatus) => {
    const s = String(status ?? "").toLowerCase();
    if (s === "all") return "Tất cả";
    if (s === "pending") return "Chờ duyệt";
    if (s === "confirmed" || s === "payment_required") return "Chờ thanh toán";
    if (s === "completed" || s === "success") return "Đã thanh toán";
    if (s === "canceled" || s === "cancelled") return "Đã hủy";
    if (s === "rejected") return "Từ chối";
    return "Không xác định";
  };

  const buildDefaultExpiresAt = () => {
    const now = new Date();
    const plusOneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const year = plusOneDay.getFullYear();
    const month = String(plusOneDay.getMonth() + 1).padStart(2, "0");
    const day = String(plusOneDay.getDate()).padStart(2, "0");
    const hour = String(plusOneDay.getHours()).padStart(2, "0");
    const minute = String(plusOneDay.getMinutes()).padStart(2, "0");
    const second = String(plusOneDay.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hour}:${minute}:${second}+07:00`;
  };

  const filteredBookings = bookings.filter((booking) => {
    if (filter === "All") return true;
    return booking.status === filter;
  });

  const handleConfirmTournament = async (
    tournamentId: number,
    confirmedCount: number,
    expiresAt: string
  ) => {
    try {
      setApprovingTournamentId(tournamentId);
      await tournamentService.ownerConfirmTournament(tournamentId, {
        confirmed_count: confirmedCount,
        expires_at: expiresAt,
      });

      await fetchOwnerTournaments();

      Alert.alert("Thành công", `Đã duyệt giải #${tournamentId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể duyệt giải";
      Alert.alert("Duyệt giải thất bại", message);
    } finally {
      setApprovingTournamentId(null);
    }
  };

  const renderPanelTabs = () => {
    const tabs: Array<{ key: ManagementPanel; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
      { key: "field", label: "Đặt sân", icon: "calendar-outline" },
      { key: "revenue", label: "Doanh thu", icon: "stats-chart-outline" },
      { key: "tournament", label: "Giải đấu", icon: "trophy-outline" },
    ];

    return (
      <View className="px-4 mt-4 mb-3">
        <View className="flex-row bg-[#eef4ff] rounded-2xl p-1">
          {tabs.map((tab) => {
            const active = activePanel === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                className={`flex-1 rounded-xl py-3 px-2 items-center ${
                  active ? "bg-[#114F99]" : "bg-transparent"
                }`}
                onPress={() => setActivePanel(tab.key)}
              >
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={active ? "#ffffff" : "#4b5563"}
                />
                <Text
                  className={`mt-1 text-xs font-semibold ${
                    active ? "text-white" : "text-[#4b5563]"
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderFieldPanel = () => (
    <>
      <View className="px-4 mt-3 flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-[#1E232C]">Bộ lọc</Text>
        <TouchableOpacity
          className="px-3 py-2 rounded-full"
          onPress={() => setFiltersCollapsed((s) => !s)}
        >
          <Ionicons name={filtersCollapsed ? "chevron-down" : "chevron-up"} size={20} color="#374151" />
        </TouchableOpacity>
      </View>

      {!filtersCollapsed && (
        <>
          {/* Cluster Dropdown */}
          <View className="px-4 mt-3">
            <Text className="text-gray-700 text-sm font-semibold mb-2">Cụm sân</Text>
            <TouchableOpacity
              className="bg-white border border-[#114F99] rounded-lg px-4 py-3 flex-row items-center justify-between"
              onPress={() => setShowClusterDropdown(true)}
            >
              <Text className="text-[#114F99] font-medium">
                {ownerClusters.find((c) => c.id === selectedClusterId)?.name || "Chọn cụm sân"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#114F99" />
            </TouchableOpacity>

            <Modal visible={showClusterDropdown} transparent animationType="fade">
              <TouchableOpacity
                className="flex-1 bg-black/30"
                activeOpacity={1}
                onPress={() => setShowClusterDropdown(false)}
              >
                <View className="flex-1 justify-center items-center">
                  <View className="bg-white rounded-2xl w-80 max-h-72 overflow-hidden">
                    <View className="px-4 py-3 border-b border-gray-200 flex-row items-center justify-between">
                      <Text className="text-lg font-bold text-[#1E232C]">Chọn cụm sân</Text>
                      <TouchableOpacity onPress={() => setShowClusterDropdown(false)}>
                        <Ionicons name="close" size={24} color="#1E232C" />
                      </TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      <TouchableOpacity
                        className={`px-4 py-3 border-b border-gray-100 ${
                          selectedClusterId === null ? "bg-[#eef4ff]" : ""
                        }`}
                        onPress={async () => {
                          setSelectedClusterId(null);
                          await AsyncStorage.removeItem("clusterId");
                          setSelectedFieldId(null);
                          setShowClusterDropdown(false);
                          setTimeout(() => fetchBookings(true), 0);
                        }}
                      >
                        <View className="flex-row items-center justify-between">
                          <Text className={`font-medium ${
                            selectedClusterId === null ? "text-[#114F99]" : "text-[#1E232C]"
                          }`}>
                            Tất cả cụm sân
                          </Text>
                          {selectedClusterId === null && (
                            <Ionicons name="checkmark" size={20} color="#114F99" />
                          )}
                        </View>
                      </TouchableOpacity>

                      {ownerClusters.map((cluster) => (
                        <TouchableOpacity
                          key={cluster.id}
                          className={`px-4 py-3 border-b border-gray-100 ${
                            selectedClusterId === cluster.id ? "bg-[#eef4ff]" : ""
                          }`}
                          onPress={async () => {
                            setSelectedClusterId(cluster.id);
                            await AsyncStorage.setItem("clusterId", String(cluster.id));
                            setSelectedFieldId(null);
                            setShowClusterDropdown(false);
                            setTimeout(() => fetchBookings(true), 0);
                          }}
                        >
                          <View className="flex-row items-center justify-between">
                            <Text
                              className={`font-medium ${
                                selectedClusterId === cluster.id ? "text-[#114F99]" : "text-[#1E232C]"
                              }`}
                            >
                              {cluster.name}
                            </Text>
                            {selectedClusterId === cluster.id && (
                              <Ionicons name="checkmark" size={20} color="#114F99" />
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </TouchableOpacity>
            </Modal>
          </View>

          {/* Field Dropdown (only when a cluster is selected) */}
          {selectedClusterId ? (
            <View className="px-4 mt-3">
            <Text className="text-gray-700 text-sm font-semibold mb-2">Sân</Text>
            <TouchableOpacity
              className="bg-white border border-[#114F99] rounded-lg px-4 py-3 flex-row items-center justify-between"
              onPress={() => setShowFieldDropdown(true)}
            >
              <Text className="text-[#114F99] font-medium">
                {selectedFieldId === null
                  ? "Tất cả sân"
                  : `Sân ${ownerFields.find((f) => f.id === selectedFieldId)?.size || ""}`}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#114F99" />
            </TouchableOpacity>

            <Modal visible={showFieldDropdown} transparent animationType="fade">
              <TouchableOpacity
                className="flex-1 bg-black/30"
                activeOpacity={1}
                onPress={() => setShowFieldDropdown(false)}
              >
                <View className="flex-1 justify-center items-center">
                  <View className="bg-white rounded-2xl w-80 max-h-72 overflow-hidden">
                    <View className="px-4 py-3 border-b border-gray-200 flex-row items-center justify-between">
                      <Text className="text-lg font-bold text-[#1E232C]">Chọn sân</Text>
                      <TouchableOpacity onPress={() => setShowFieldDropdown(false)}>
                        <Ionicons name="close" size={24} color="#1E232C" />
                      </TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      <TouchableOpacity
                        className={`px-4 py-3 border-b border-gray-100 ${
                          selectedFieldId === null ? "bg-[#eef4ff]" : ""
                        }`}
                        onPress={() => {
                          setSelectedFieldId(null);
                          setShowFieldDropdown(false);
                          setTimeout(() => fetchBookings(true), 0);
                        }}
                      >
                        <View className="flex-row items-center justify-between">
                          <Text className={`font-medium ${
                            selectedFieldId === null ? "text-[#114F99]" : "text-[#1E232C]"
                          }`}>
                            Tất cả sân
                          </Text>
                          {selectedFieldId === null && (
                            <Ionicons name="checkmark" size={20} color="#114F99" />
                          )}
                        </View>
                      </TouchableOpacity>
                      {ownerFields.map((field) => (
                        <TouchableOpacity
                          key={field.id}
                          className={`px-4 py-3 border-b border-gray-100 ${
                            selectedFieldId === field.id ? "bg-[#eef4ff]" : ""
                          }`}
                          onPress={() => {
                            setSelectedFieldId(field.id);
                            setShowFieldDropdown(false);
                            setTimeout(() => fetchBookings(true), 0);
                          }}
                        >
                          <View className="flex-row items-center justify-between">
                            <Text className={`font-medium ${
                              selectedFieldId === field.id ? "text-[#114F99]" : "text-[#1E232C]"
                            }`}>
                              Sân {field.size}
                            </Text>
                            {selectedFieldId === field.id && (
                              <Ionicons name="checkmark" size={20} color="#114F99" />
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </TouchableOpacity>
            </Modal>
            </View>
          ) : null}

          {/* Status Filter Buttons */}
          <View className="flex-row flex-wrap justify-center gap-2 px-4 mt-4 mb-3">
            {[
              { label: "Tất cả", value: "All", activeBg: "#114F99", activeText: "#ffffff", border: "#114F99" },
              { label: "Chờ duyệt", value: "Chờ duyệt", activeBg: "#F59E0B", activeText: "#ffffff", border: "#F59E0B" },
              { label: "Đã xác nhận", value: "Đã xác nhận", activeBg: "#16A34A", activeText: "#ffffff", border: "#16A34A" },
              { label: "Chờ thanh toán", value: "Chờ thanh toán", activeBg: "#0B8FAC", activeText: "#ffffff", border: "#0B8FAC" },
              { label: "Hoàn thành", value: "Hoàn thành", activeBg: "#8B5CF6", activeText: "#ffffff", border: "#8B5CF6" },
              { label: "Đã hủy", value: "Đã hủy", activeBg: "#DC2626", activeText: "#ffffff", border: "#DC2626" },
            ].map((item) => {
              const active = filter === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  className="px-3 py-2 rounded-full items-center border"
                  style={{
                    backgroundColor: active ? item.activeBg : "#ffffff",
                    borderColor: item.border,
                    minWidth: 78,
                    paddingHorizontal: 10,
                    justifyContent: "center",
                  }}
                  onPress={() => {
                    setFilter(item.value);
                    setTimeout(() => fetchBookings(true), 0);
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{ color: active ? item.activeText : item.border, textAlign: "center" }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-center text-base mt-10 text-gray-600">Đang tải danh sách đặt sân...</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 mt-4"
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {filteredBookings.length === 0 ? (
            <View className="items-center justify-center mt-10 bg-white rounded-2xl p-6 border border-gray-200">
              <Text className="text-gray-500 text-base">Không có đặt sân nào</Text>
            </View>
          ) : (
            filteredBookings.map((booking) => (
              <View
                key={booking.id}
                className="bg-white border border-[#cde0ff] rounded-2xl mb-4 p-4"
              >
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-gray-900">{booking.displayId}</Text>
                    
                    <Text className="text-sm text-gray-700">Sân: {booking.field}</Text>
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="time-outline" size={16} color="#374151" />
                      <Text className="text-sm text-gray-700 ml-1">{booking.time}</Text>
                    </View>
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="calendar-outline" size={16} color="#374151" />
                      <Text className="text-sm text-gray-700 ml-1">{booking.date}</Text>
                    </View>
                    <View className="mt-2">
                      <Text
                        className={`text-sm font-semibold ${
                          booking.status === "Đã xác nhận"
                            ? "text-[#10B981]"
                            : booking.status === "Hoàn thành"
                            ? "text-[#8B5CF6]"
                            : booking.status === "Chờ duyệt"
                            ? "text-[#F59E0B]"
                            : booking.status === "Chờ thanh toán"
                            ? "text-[#0B8FAC]"
                                                        : booking.status === "Đã hủy"
                                                        ? "text-[#DC2626]"
                            : "text-gray-500"
                        }`}
                      >
                        {booking.status}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    className="bg-[#0B8FAC] rounded-full px-4 py-2 ml-2"
                    onPress={() =>
                      router.push({
                        pathname: "/(owners)/(booking)/bookingDetail",
                        params: { id: booking.id.toString() },
                      })
                    }
                  >
                    <Text className="text-white text-sm font-semibold">
                      {booking.status === "Chờ duyệt" ? "Chi tiết" : "Xem"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </>
  );

  const renderRevenuePanel = () => (
    <ScrollView
      className="flex-1 px-4 mt-2"
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="bg-[#0f1f5c] rounded-2xl p-4 mb-4 border border-[#3b82f6]">
        <Text className="text-[#93c5fd] text-sm">Doanh thu tháng này</Text>
        <Text className="text-white text-3xl font-extrabold mt-1">
          {revenueLoading ? "Đang tải..." : formatCurrency(revenueData?.total_revenue)}
        </Text>
        <Text className="text-[#bfdbfe] text-sm mt-2">
          {revenueData?.total_payments || 0} giao dịch thành công
        </Text>
        <Text className="text-[#bfdbfe] text-xs mt-1">
          {formatDate(revenueData?.start_date)} - {formatDate(revenueData?.end_date)}
        </Text>
      </View>

      <Text className="text-[#1E232C] text-lg font-bold mb-3">Theo cụm sân</Text>
      {(revenueData?.by_cluster || []).length === 0 ? (
        <View className="bg-white rounded-xl border border-gray-200 p-4">
          <Text className="text-gray-500">Chưa có dữ liệu doanh thu cụm sân.</Text>
        </View>
      ) : (
        (revenueData?.by_cluster || []).map((cluster) => (
          <TouchableOpacity
            key={cluster.cluster_id}
            className="bg-white rounded-xl border border-gray-200 p-4 mb-3"
            activeOpacity={0.9}
            onPress={() => openClusterPayments(cluster)}
          >
            <Text className="text-gray-900 font-semibold">{cluster.cluster_name}</Text>
            <Text className="text-[#114F99] text-base font-bold mt-1">
              {formatCurrency(cluster.revenue)}
            </Text>
            <Text className="text-gray-600 text-sm mt-1">
              {cluster.payment_count} giao dịch
            </Text>
                <Text className="text-[#0B8FAC] text-xs mt-2 font-semibold">Nhấn để xem giao dịch</Text>
          </TouchableOpacity>
        ))
      )}

      <Modal
        visible={showClusterPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowClusterPaymentModal(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl p-4 max-h-[82%]">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[#1E232C] font-bold text-base">
                Thanh toán — {selectedRevenueCluster?.cluster_name || "Cụm sân"}
              </Text>
              <TouchableOpacity
                className="px-3 py-2 rounded-full bg-gray-100"
                onPress={() => setShowClusterPaymentModal(false)}
              >
                <Text className="text-gray-700 font-semibold text-xs">Đóng</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-gray-500 mb-3">
              {selectedRevenueCluster?.payment_count || 0} giao dịch theo thống kê doanh thu
            </Text>

            {clusterPaymentsLoading ? (
              <View className="items-center justify-center py-10">
                <ActivityIndicator size="small" color="#114F99" />
                <Text className="text-gray-500 mt-2">Đang tải giao dịch...</Text>
              </View>
            ) : clusterPayments.length === 0 ? (
              <View className="bg-[#f9fafb] rounded-xl border border-gray-200 p-4">
                <Text className="text-gray-500">
                  Chưa tìm thấy giao dịch nào của cụm này trong danh sách thanh toán hiện tại.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {clusterPayments.map((payment) => (
                  <View
                    key={payment.id}
                    className="bg-white border border-[#dbe3f0] rounded-xl p-3 mb-2"
                  >
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className="text-[#1E232C] font-bold flex-1 shrink" numberOfLines={1}>
                        Giao dịch #{payment.id}
                      </Text>
                      <Text
                        className="text-xs font-semibold text-[#114F99] shrink-0 text-right"
                        numberOfLines={2}
                      >
                        {formatPaymentStatus(payment.status)}
                      </Text>
                    </View>

                    <Text className="text-[#114F99] font-bold mt-2">
                      {formatCurrency(Number(payment.amount || 0))}
                    </Text>
                    <Text className="text-gray-600 text-xs mt-1">Mã đặt sân: {payment.booking_id}</Text>
                    <Text className="text-gray-600 text-xs">Mã giải: {payment.tournament_id ?? "—"}</Text>
                    {shouldShowPaymentType(payment.payment_type) && (
                      <Text className="text-gray-600 text-xs">
                        Loại: {formatPaymentType(payment.payment_type)}
                      </Text>
                    )}
                    <Text className="text-gray-600 text-xs mt-1">
                      Tạo lúc: {new Date(payment.created_at).toLocaleString("vi-VN")}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );

  const renderTournamentPanel = () => (
    <ScrollView
      className="flex-1 px-4 mt-2"
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-3 grow-0"
        contentContainerStyle={{ flexDirection: "row", alignItems: "center", paddingRight: 8 }}
      >
        {[
          { key: "all", label: "Tất cả" },
          { key: "pending", label: "Chờ duyệt" },
          { key: "confirmed", label: "Chờ thanh toán" },
          { key: "success", label: "Đã thanh toán" },
          { key: "canceled", label: "Đã hủy" },
        ].map((item) => {
          const active = tournamentStatusFilter === (item.key as TournamentOwnerBookingStatus);
          return (
            <TouchableOpacity
              key={item.key}
              style={{ flexShrink: 0 }}
              className={`mr-2 px-3 py-2 rounded-full border ${
                active ? "bg-[#114F99] border-[#114F99]" : "bg-white border-gray-300"
              }`}
              onPress={() => setTournamentStatusFilter(item.key as TournamentOwnerBookingStatus)}
            >
              <Text
                className={`text-xs font-semibold ${active ? "text-white" : "text-gray-700"}`}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text className="text-[#1E232C] text-lg font-bold mb-3">Danh sách giải đấu</Text>

      {tournamentLoading ? (
        <View className="bg-white rounded-2xl border border-gray-200 p-4">
          <Text className="text-gray-600">Đang tải danh sách giải...</Text>
        </View>
      ) : ownerTournaments.length === 0 ? (
        <View className="bg-white rounded-2xl border border-gray-200 p-4">
          <Text className="text-gray-500">Không có giải đấu nào với trạng thái hiện tại.</Text>
        </View>
      ) : (
        ownerTournaments.map((item) => {
          const tournamentStatus =
            (item as OwnerTournamentItem & { status?: TournamentOwnerBookingStatus }).status ??
            tournamentStatusFilter;

          return (
            <View key={item.id} className="bg-white rounded-2xl border border-gray-200 p-4 mb-3">
              <View className="flex-row justify-between items-start">
                <View className="flex-1 pr-3">
                  <Text className="text-[#111827] font-bold text-base">#{item.id} - {item.name}</Text>
                  <Text className="text-gray-600 text-sm mt-1">
                    Môn: {toVietnameseSportType(item.sport_type)}
                  </Text>
                  <Text className="text-gray-600 text-sm mt-1">
                    Số khung thời gian đã đặt: {item.pending_bookings_count}
                  </Text>
                  <Text className="text-gray-600 text-sm mt-1">
                    Mã người tổ chức: {item.organizer_id}
                  </Text>
                  <Text className="text-gray-600 text-sm mt-1">
                    Tạo lúc: {new Date(item.created_at).toLocaleString("vi-VN")}
                  </Text>
                </View>

                <View className="px-3 py-1 rounded-full bg-[#eef4ff]">
                  <Text className="text-xs font-semibold text-[#114F99]">
                    {getTournamentFilterLabel(tournamentStatus)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                className="mt-3 bg-[#0B8FAC] rounded-xl py-3 items-center"
                onPress={() =>
                  router.push({
                    pathname: "/(owners)/(booking)/tournament-detail",
                    params: { id: String(item.id), source: "owner" },
                  })
                }
              >
                <Text className="text-white font-semibold">Xem chi tiết</Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#f5f8ff]" edges={["top"]}>
      <View className="flex-row items-center px-4 pt-4">
        <TouchableOpacity
          className="w-10 h-10 bg-white border border-gray-200 rounded-xl items-center justify-center"
          onPress={() => router.push("/(owners)/home")}
          activeOpacity={0.9}
        >
          <Ionicons name="arrow-back" size={20} color="#1E232C" />
        </TouchableOpacity>

        <View className="flex-1 ml-3">
          <Text className="font-extrabold text-[24px] text-[#1E232C]">Trung tâm quản lý</Text>
          <Text className="text-xs text-gray-500 mt-0.5">
            Đặt sân • Doanh thu • Duyệt giải đấu
          </Text>
        </View>
      </View>

      {renderPanelTabs()}

      {activePanel === "field" && renderFieldPanel()}
      {activePanel === "revenue" && renderRevenuePanel()}
      {activePanel === "tournament" && renderTournamentPanel()}
    </SafeAreaView>
  );
}
