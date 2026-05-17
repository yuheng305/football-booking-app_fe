import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams, useSegments } from "expo-router";
import HeaderUser from "@/component/HeaderUser";
import PickMatchWinnerModal from "@/component/PickMatchWinnerModal";
import ContactActions from "@/component/ContactActions";
import { bookingService } from "@/src/services/booking.service";
import clusterService from "@/src/services/cluster.service";
import { imageService } from "@/src/services/image.service";
import paymentService from "@/src/services/payment.service";
import tournamentService, { mapBracketMatchesForRound } from "@/src/services/tournament.service";
import { fieldService } from "@/src/services/field.service";
import type { Booking, FieldWithAvailability } from "@/src/types/booking.types";
import type { Cluster } from "@/src/types/cluster.types";
import {
  TournamentBracketData,
  TournamentBracketMatch,
  TournamentDetailData,
  TournamentDetailRound,
  TournamentRoundMatch,
  Level2AvailableSlot,
  Level2AvailableSlotsResult,
} from "@/src/types/tournament.types";
import {
  resolveInheritedWinnerSlots,
  winnerPickSlotLabels,
} from "@/src/utils/tournament-bracket-resolve.util";
import {
  formatWinnerBadgeLabel,
  resolveWinnerSideFromExtra,
} from "@/src/utils/tournament-match.util";
import { toVietnameseSportType } from "@/src/utils/sport-type.util";

type MatchesState = {
  loading: boolean;
  data: TournamentRoundMatch[];
  loaded: boolean;
};

type MatchEditValue = {
  team_a_name: string;
  team_b_name: string;
};

const formatDate = (value?: string) => {
  if (!value) return "--";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const formatTime = (value?: string) => {
  if (!value) return "--";
  return value.slice(0, 5);
};

/** BE reschedule yêu cầu HH:mm:ss */
const normalizeTimeForApi = (value: string) => {
  const s = String(value).trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s;
  if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  return s;
};

/** Khung giờ chọn từ GET fields/cluster/…/availability */
type L1SlotChoice = {
  field_id: number;
  field_label: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  price_per_hour: number;
};

function parseTimeToSeconds(t: string): number {
  const parts = String(t).trim().split(":");
  const h = Number(parts[0] || 0);
  const m = Number(parts[1] || 0);
  const s = Number(parts[2] ?? 0);
  return h * 3600 + m * 60 + s;
}

function formatSecondsToHms(total: number): string {
  const t = Math.max(0, Math.floor(total)) % (24 * 3600);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Cắt [rangeStart, rangeEnd] thành các cửa sổ độ dài cố định (bước stepSec). */
function expandTimeRange(
  rangeStart: string,
  rangeEnd: string,
  windowDurationSec: number,
  stepSec: number
): { start: string; end: string }[] {
  const a = parseTimeToSeconds(rangeStart);
  const b = parseTimeToSeconds(rangeEnd);
  if (b <= a || windowDurationSec <= 0 || stepSec <= 0) return [];
  const out: { start: string; end: string }[] = [];
  for (let t = a; t + windowDurationSec <= b; t += stepSec) {
    out.push({
      start: formatSecondsToHms(t),
      end: formatSecondsToHms(t + windowDurationSec),
    });
  }
  return out;
}

function expandL1ChoicesFromRows(
  rows: FieldWithAvailability[],
  bookingDate: string,
  referenceBooking: Booking,
  stepMinutes: number = 30
): L1SlotChoice[] {
  const dur =
    parseTimeToSeconds(referenceBooking.end_time) -
    parseTimeToSeconds(referenceBooking.start_time);
  if (dur <= 0) return [];
  const stepSec = stepMinutes * 60;
  const out: L1SlotChoice[] = [];
  for (const row of rows) {
    const f = row.field;
    const label = `Sân ${f.size}`;
    for (const slot of row.available_slots || []) {
      const wins = expandTimeRange(slot.start_time, slot.end_time, dur, stepSec);
      for (const w of wins) {
        out.push({
          field_id: f.id,
          field_label: label,
          booking_date: bookingDate,
          start_time: w.start,
          end_time: w.end,
          price_per_hour: Number(f.price_per_hour) || 0,
        });
      }
    }
  }
  return out;
}

function expandLevel2AvailableSlots(
  slots: Level2AvailableSlot[],
  match: TournamentRoundMatch,
  stepMinutes: number = 30
): Level2AvailableSlot[] {
  const dur =
    parseTimeToSeconds(match.end_time) - parseTimeToSeconds(match.start_time);
  if (dur <= 0) return [];
  const stepSec = stepMinutes * 60;
  const out: Level2AvailableSlot[] = [];
  for (const slot of slots) {
    const rangeDur =
      parseTimeToSeconds(slot.end_time) - parseTimeToSeconds(slot.start_time);
    if (rangeDur <= 0) continue;
    const wins = expandTimeRange(slot.start_time, slot.end_time, dur, stepSec);
    const basePrice = Number(slot.estimated_price) || 0;
    for (const w of wins) {
      const wDur = parseTimeToSeconds(w.end) - parseTimeToSeconds(w.start);
      const est = basePrice > 0 ? Math.round((wDur / rangeDur) * basePrice) : 0;
      out.push({
        ...slot,
        start_time: w.start,
        end_time: w.end,
        estimated_price: est,
      });
    }
  }
  return out;
}

function slotDurationHours(start: string, end: string): number {
  const d = (parseTimeToSeconds(end) - parseTimeToSeconds(start)) / 3600;
  return d > 0 ? d : 0;
}

const formatClusterAddress = (
  c?: { street?: string; district?: string; city?: string } | null
) => {
  if (!c) return "";
  return [c.street, c.district, c.city].filter(Boolean).join(", ");
};

const bookingDateKey = (iso?: string) => {
  if (!iso) return "";
  return iso.slice(0, 10);
};

const statusLabel = (status?: string) => {
  if (status === "pending") return "Chờ xác nhận";
  if (status === "confirmed" || status === "payment_required" || status === "approved")
    return "Chờ thanh toán";
  if (status === "success" || status === "completed") return "Đã thanh toán";
  if (status === "canceled") return "Đã hủy";
  if (status === "scheduled") return "Đã xếp lịch";
  return status || "--";
};

const statusClasses = (status?: string) => {
  if (status === "success" || status === "completed" || status === "scheduled") {
    return "text-emerald-700 bg-emerald-100";
  }

  if (status === "confirmed" || status === "payment_required" || status === "approved") {
    return "text-indigo-700 bg-indigo-100";
  }

  if (status === "canceled") {
    return "text-rose-700 bg-rose-100";
  }

  return "text-amber-700 bg-amber-100";
};

export default function TournamentDetailScreen() {
  const params = useLocalSearchParams<{ id?: string; paymentStatus?: string; source?: string; openRoundId?: string }>();
  const tournamentId = Number(params.id);
  const segments = useSegments() as string[];
  // consider owner view when route is under owners or explicit source=owner param is present
  const isOwnerView = params.source === "owner" || (segments && segments.includes("(owners)"));
  const backRoute = params.source === "owner"
    ? "/(owners)/(booking)/ownerBookingManagement"
    : "/(tabs)/tournament";


  const [detail, setDetail] = useState<TournamentDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedRounds, setExpandedRounds] = useState<number[]>([]);
  const [matchesByRound, setMatchesByRound] = useState<Record<number, MatchesState>>({});
  const [editingByMatch, setEditingByMatch] = useState<Record<number, MatchEditValue>>({});
  const [savingMatchIds, setSavingMatchIds] = useState<number[]>([]);
  const [savingWinnerIds, setSavingWinnerIds] = useState<number[]>([]);
  const [pickWinnerModal, setPickWinnerModal] = useState<{
    roundId: number;
    match: TournamentRoundMatch;
    topLabel: string;
    bottomLabel: string;
  } | null>(null);
  const [clusterNamesById, setClusterNamesById] = useState<Record<number, string>>({});
  const [isPayingTournament, setIsPayingTournament] = useState(false);
  const [hostContact, setHostContact] = useState<{
    id: number;
    fullName: string;
    email: string;
    phone: string;
    role?: string;
  } | null>(null);
  const [loadingHostInfo, setLoadingHostInfo] = useState(false);
  const [showHostInfo, setShowHostInfo] = useState(false);
  const [ownerActionLoading, setOwnerActionLoading] = useState<"confirm" | "reject" | null>(null);
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const [showRoundsInfo, setShowRoundsInfo] = useState(false);
  const [level1Bookings, setLevel1Bookings] = useState<Booking[]>([]);
  const [level1BookingsLoading, setLevel1BookingsLoading] = useState(false);
  const [primaryClusterDetail, setPrimaryClusterDetail] = useState<Cluster | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  /** Đổi lịch L2 (BTC): modal chọn slot từ GET .../available-slots */
  const [rescheduleTarget, setRescheduleTarget] = useState<{
    roundId: number;
    match: TournamentRoundMatch;
  } | null>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<Level2AvailableSlotsResult | null>(null);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState<Level2AvailableSlot | null>(null);

  /** Level 1: đổi lịch từng booking — GET cluster availability + POST reschedule */
  const [l1RescheduleBooking, setL1RescheduleBooking] = useState<Booking | null>(null);
  const [l1RescheduleDate, setL1RescheduleDate] = useState("");
  const [l1AvailabilityRows, setL1AvailabilityRows] = useState<FieldWithAvailability[]>([]);
  /** Ngày tương ứng dữ liệu vừa tải (tránh lệch với input nếu user đổi ngày chưa bấm Tải). */
  const [l1SlotsForDate, setL1SlotsForDate] = useState("");
  const [l1AvailabilityLoading, setL1AvailabilityLoading] = useState(false);
  const [selectedL1Slot, setSelectedL1Slot] = useState<L1SlotChoice | null>(null);
  const [l1RescheduleSubmitting, setL1RescheduleSubmitting] = useState(false);

  /** Một lần GET /tournaments/:id/matches, dùng cho mọi vòng (lọc theo round_id). */
  const l2MatchesCacheRef = useRef<{ tournamentId: number; data: TournamentBracketData } | null>(null);
  /** Full GET …/matches — suy luận đội thắng hiển thị ở trận vòng sau (extra_data.team_win). */
  const [l2AllBracketMatches, setL2AllBracketMatches] = useState<TournamentBracketMatch[]>([]);

  const paymentStatus = detail?.payment_status || params.paymentStatus || "";

  const paymentStatusLabel = (status?: string) => {
    if (status === "paid" || status === "success" || status === "completed") return "Đã thanh toán";
    if (status === "pending") return "Chờ chủ sân duyệt";
    if (status === "confirmed" || status === "payment_required" || status === "approved")
      return "Chờ thanh toán";
    if (status === "no_bookings") return "Chưa có lượt đặt sân";
    return status || "Không rõ";
  };

  const paymentStatusClasses = (status?: string) => {
    if (status === "paid" || status === "success" || status === "completed")
      return "bg-emerald-100 text-emerald-700";
    if (status === "pending") return "bg-sky-100 text-sky-700";
    if (status === "confirmed" || status === "payment_required" || status === "approved")
      return "bg-amber-100 text-amber-700";
    if (status === "no_bookings") return "bg-slate-100 text-slate-600";
    return "bg-slate-100 text-slate-600";
  };

  const ownerActionStatusMessage = (status?: string) => {
    const s = String(status ?? "").toLowerCase();
    if (s === "confirmed" || s === "payment_required" || s === "approved")
      return "Giải đã được duyệt — đang chờ thanh toán";
    if (s === "success" || s === "completed") return "Giải đấu đã được thanh toán";
    if (s === "canceled" || s === "cancelled") return "Giải đấu đã bị hủy";
    if (s === "expired") return "Giải đấu đã hết hạn";
    if (s === "rejected") return "Giải đấu đã bị từ chối";
    return "Không thể thực hiện thao tác ở trạng thái này";
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

  const fetchLevel1Bookings = useCallback(async (tid: number) => {
    setLevel1BookingsLoading(true);
    try {
      const rawUserData = await AsyncStorage.getItem("userData");
      const userData = rawUserData ? JSON.parse(rawUserData) : null;
      const playerId = Number(userData?.user_id ?? userData?.id);

      if (!Number.isFinite(playerId) || playerId <= 0) {
        setLevel1Bookings([]);
        return;
      }

      const result = await bookingService.getPlayerBookings({
        playerId,
        tournamentId: tid,
        offset: 0,
        limit: 30,
      });

      const list = result.bookings || [];
      setLevel1Bookings(
        list.slice().sort((a, b) => {
          const da = bookingDateKey(a.booking_date);
          const db = bookingDateKey(b.booking_date);
          if (da !== db) return da.localeCompare(db);
          return (a.start_time || "").localeCompare(b.start_time || "");
        })
      );
    } catch {
      setLevel1Bookings([]);
    } finally {
      setLevel1BookingsLoading(false);
    }
  }, []);

  const paymentStatusHint = params.paymentStatus?.trim();

  const loadDetail = useCallback(async (silent?: boolean) => {
    if (!tournamentId || Number.isNaN(tournamentId)) {
      setLoading(false);
      return;
    }

    try {
      if (silent) {
        setRefreshing(true);
        l2MatchesCacheRef.current = null;
        setMatchesByRound({});
        setExpandedRounds([]);
        setL2AllBracketMatches([]);
      } else {
        setLoading(true);
      }

      const data = await tournamentService.getTournamentDetail(tournamentId);
      /** Sau PAYMENT_CONFIRMED, GET đôi khi chưa có payment_status — khớp với deep link thông báo. */
      let merged = data;
      if (
        paymentStatusHint === "paid" &&
        (!data.payment_status || String(data.payment_status).trim() === "")
      ) {
        merged = { ...data, payment_status: "paid" };
      }
      setDetail(merged);

      if (data.level === 1) {
        await fetchLevel1Bookings(tournamentId);
      } else {
        setLevel1Bookings([]);
        setLevel1BookingsLoading(false);
      }
    } catch (error: any) {
      Alert.alert("Không tải được chi tiết", error?.message || "Vui lòng thử lại.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tournamentId, fetchLevel1Bookings, paymentStatusHint]);

  useFocusEffect(
    useCallback(() => {
      loadDetail();
    }, [loadDetail])
  );

  useEffect(() => {
    l2MatchesCacheRef.current = null;
    setMatchesByRound({});
    setExpandedRounds([]);
    setL2AllBracketMatches([]);
  }, [tournamentId]);

  const rounds = useMemo(() => {
    return (detail?.rounds || []).slice().sort((a, b) => a.round_number - b.round_number);
  }, [detail?.rounds]);

  useEffect(() => {
    if (!detail) return;
    const openId = params.openRoundId ? Number(params.openRoundId) : null;
    if (!openId) return;
    const target = rounds.find((r) => Number(r.id) === openId);
    if (!target) return;
    // toggleRound will load matches and expand UI; safe to call after render
    toggleRound(target as any);
  }, [detail, params.openRoundId, rounds]);

  useEffect(() => {
    (async () => {
      try {
        const userDataRaw = await AsyncStorage.getItem("userData");
        const profileRaw = await AsyncStorage.getItem("userProfile");
        const ud = userDataRaw ? JSON.parse(userDataRaw) : null;
        const pr = profileRaw ? JSON.parse(profileRaw) : null;
        const uid = Number(ud?.user_id ?? ud?.id ?? pr?.id ?? pr?.user_id);
        setCurrentUserId(Number.isFinite(uid) && uid > 0 ? uid : null);
      } catch {
        setCurrentUserId(null);
      }
    })();
  }, []);

  const isTournamentOrganizer = useMemo(() => {
    if (detail?.organizer_id == null || currentUserId == null) return false;
    return Number(detail.organizer_id) === Number(currentUserId);
  }, [detail?.organizer_id, currentUserId]);

  const clusterIdForAvailability = useMemo(() => {
    if (typeof detail?.cluster_id === "number" && detail.cluster_id > 0) {
      return detail.cluster_id;
    }
    const fromBooking = level1Bookings.find((b) => typeof b.field?.cluster_id === "number");
    return fromBooking?.field?.cluster_id ?? null;
  }, [detail?.cluster_id, level1Bookings]);

  const expandedL2RescheduleChoices = useMemo(() => {
    if (!rescheduleTarget || !rescheduleSlots?.available_slots?.length) return [];
    return expandLevel2AvailableSlots(rescheduleSlots.available_slots, rescheduleTarget.match);
  }, [rescheduleSlots, rescheduleTarget]);

  const expandedL1RescheduleChoices = useMemo(() => {
    if (!l1RescheduleBooking || !l1AvailabilityRows.length || !l1SlotsForDate) return [];
    return expandL1ChoicesFromRows(l1AvailabilityRows, l1SlotsForDate, l1RescheduleBooking);
  }, [l1AvailabilityRows, l1SlotsForDate, l1RescheduleBooking]);

  useEffect(() => {
    if (!rescheduleTarget || !detail || detail.level !== 2) {
      return;
    }
    let cancelled = false;
    (async () => {
      setRescheduleSlotsLoading(true);
      setRescheduleSlots(null);
      setSelectedRescheduleSlot(null);
      try {
        const data = await tournamentService.getLevel2AvailableSlots(detail.id, rescheduleTarget.roundId);
        if (!cancelled) setRescheduleSlots(data);
      } catch (error: any) {
        if (!cancelled) {
          Alert.alert("Không tải được slot trống", error?.message || "Vui lòng thử lại.");
        }
      } finally {
        if (!cancelled) setRescheduleSlotsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rescheduleTarget, detail?.id, detail?.level]);

  const closeRescheduleModal = () => {
    setRescheduleTarget(null);
    setRescheduleSlots(null);
    setSelectedRescheduleSlot(null);
    setRescheduleSlotsLoading(false);
    setRescheduleSubmitting(false);
  };

  const handleConfirmReschedule = async () => {
    if (!detail || !rescheduleTarget || !selectedRescheduleSlot) return;
    const bookingId = rescheduleTarget.match.booking_id;
    if (!bookingId || bookingId <= 0) return;

    try {
      setRescheduleSubmitting(true);
      const slot = selectedRescheduleSlot;
      const result = await tournamentService.rescheduleLevel2Booking(detail.id, bookingId, {
        booking_date: slot.date,
        start_time: normalizeTimeForApi(slot.start_time),
        end_time: normalizeTimeForApi(slot.end_time),
        field_id: slot.field_id,
      });

      const { roundId } = rescheduleTarget;
      const matchId = rescheduleTarget.match.id;

      setMatchesByRound((prev) => {
        const roundState = prev[roundId];
        if (!roundState) return prev;
        return {
          ...prev,
          [roundId]: {
            ...roundState,
            data: roundState.data.map((item) =>
              item.id === matchId
                ? {
                    ...item,
                    booking_date: result.booking_date,
                    start_time: result.start_time,
                    end_time: result.end_time,
                    field_id: result.field_id,
                    field_name: slot.field_name,
                    field_description: slot.field_name,
                  }
                : item
            ),
          },
        };
      });

      l2MatchesCacheRef.current = null;
      closeRescheduleModal();
      Alert.alert("Thành công", result.message || "Đã cập nhật lịch trận đấu.");
    } catch (error: any) {
      Alert.alert("Đổi lịch thất bại", error?.message || "Vui lòng thử lại.");
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  const closeL1RescheduleModal = () => {
    setL1RescheduleBooking(null);
    setL1RescheduleDate("");
    setL1AvailabilityRows([]);
    setL1SlotsForDate("");
    setSelectedL1Slot(null);
    setL1AvailabilityLoading(false);
    setL1RescheduleSubmitting(false);
  };

  const loadL1ClusterAvailability = async () => {
    if (!clusterIdForAvailability) {
      Alert.alert("Thiếu cụm sân", "Không xác định được cụm sân để tải lịch trống.");
      return;
    }
    const dateStr = l1RescheduleDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      Alert.alert("Ngày không hợp lệ", "Nhập ngày dạng YYYY-MM-DD (ví dụ 2026-05-06).");
      return;
    }
    if (!l1RescheduleBooking) {
      return;
    }
    try {
      setL1AvailabilityLoading(true);
      const rows = await fieldService.getFieldAvailability({
        clusterId: clusterIdForAvailability,
        bookingDate: dateStr,
      });
      setL1AvailabilityRows(rows);
      setL1SlotsForDate(dateStr);
      setSelectedL1Slot(null);
      const choices = expandL1ChoicesFromRows(rows, dateStr, l1RescheduleBooking);
      if (choices.length === 0) {
        Alert.alert("Thông báo", "Không có khung giờ phù hợp để đổi lịch trong ngày này.");
      }
    } catch (error: any) {
      Alert.alert("Không tải được lịch trống", error?.message || "Vui lòng thử lại.");
    } finally {
      setL1AvailabilityLoading(false);
    }
  };

  const handleConfirmL1Reschedule = async () => {
    if (!detail || !l1RescheduleBooking || !selectedL1Slot) return;
    try {
      setL1RescheduleSubmitting(true);
      await tournamentService.rescheduleLevel2Booking(detail.id, l1RescheduleBooking.id, {
        booking_date: selectedL1Slot.booking_date,
        start_time: normalizeTimeForApi(selectedL1Slot.start_time),
        end_time: normalizeTimeForApi(selectedL1Slot.end_time),
        field_id: selectedL1Slot.field_id,
      });
      await fetchLevel1Bookings(detail.id);
      closeL1RescheduleModal();
      Alert.alert("Thành công", "Đã cập nhật lịch đặt sân.");
    } catch (error: any) {
      Alert.alert("Đổi lịch thất bại", error?.message || "Vui lòng thử lại.");
    } finally {
      setL1RescheduleSubmitting(false);
    }
  };

  useEffect(() => {
    if (!detail) return;

    const clusterIds = Array.from(
      new Set(
        [
          detail.cluster_id,
          ...(detail.rounds || []).map((round) => round.cluster_id),
        ].filter((id): id is number => typeof id === "number" && id > 0)
      )
    );

    const missingIds = clusterIds.filter((id) => !clusterNamesById[id]);
    if (missingIds.length === 0) return;

    let active = true;
    const loadClusterNames = async () => {
      const entries = await Promise.all(
        missingIds.map(async (clusterId) => {
          try {
            const cluster = await clusterService.getCluster(clusterId);
            return [clusterId, cluster.name] as const;
          } catch {
            return [clusterId, `Cụm #${clusterId}`] as const;
          }
        })
      );

      if (!active) return;
      setClusterNamesById((prev) => {
        const next = { ...prev };
        entries.forEach(([id, name]) => {
          next[id] = name;
        });
        return next;
      });
    };

    loadClusterNames();

    return () => {
      active = false;
    };
  }, [clusterNamesById, detail]);

  useEffect(() => {
    const clusterId = detail?.cluster_id;
    if (!clusterId) {
      setHostContact(null);
      setPrimaryClusterDetail(null);
      return;
    }

    let active = true;

    const loadHostContact = async () => {
      setLoadingHostInfo(true);
      const cluster = await clusterService.getCluster(clusterId);
      if (active) {
        setPrimaryClusterDetail(cluster);
      }
      const ownerId = Number(cluster.owner_id);
      if (!Number.isFinite(ownerId) || ownerId <= 0) {
        throw new Error("Không tìm thấy chủ sân của cụm này");
      }

      const contact = await bookingService.getUserBasicProfile(ownerId);
      if (active) {
        setHostContact(contact);
      }
    };

    loadHostContact().catch(() => {
      if (active) {
        setHostContact(null);
        setPrimaryClusterDetail(null);
      }
    }).finally(() => {
      if (active) {
        setLoadingHostInfo(false);
      }
    });

    return () => {
      active = false;
    };
  }, [detail?.cluster_id]);

  const clusterSummary = useMemo(() => {
    if (!detail) return "--";

    if (typeof detail.cluster_id === "number") {
      return clusterNamesById[detail.cluster_id] || `Cụm #${detail.cluster_id}`;
    }

    const uniqueRoundClusters = Array.from(
      new Set(
        (detail.rounds || [])
          .map((round) =>
            typeof round.cluster_id === "number"
              ? clusterNamesById[round.cluster_id] || `Cụm #${round.cluster_id}`
              : round.cluster_name
          )
          .filter(Boolean)
      )
    ) as string[];

    if (uniqueRoundClusters.length > 0) {
      return uniqueRoundClusters.join(", ");
    }

    return "--";
  }, [clusterNamesById, detail]);

  const clusterDisplayName = useMemo(() => {
    if (primaryClusterDetail?.name) return primaryClusterDetail.name;
    const named = level1Bookings.find((b) => b.field?.cluster?.name)?.field?.cluster?.name;
    if (named) return named;
    return clusterSummary;
  }, [primaryClusterDetail, level1Bookings, clusterSummary]);

  const clusterDisplayAddress = useMemo(() => {
    const primaryLine = formatClusterAddress(primaryClusterDetail);
    if (primaryLine) return primaryLine;
    for (const b of level1Bookings) {
      const line = formatClusterAddress(b.field?.cluster);
      if (line) return line;
    }
    return "";
  }, [primaryClusterDetail, level1Bookings]);

  const loadRoundMatches = async (round: TournamentDetailRound) => {
    if (!detail || detail.level !== 2) {
      return;
    }

    const cached = matchesByRound[round.id];
    if (cached?.loaded || cached?.loading) {
      return;
    }

    setMatchesByRound((prev) => ({
      ...prev,
      [round.id]: {
        loading: true,
        loaded: false,
        data: [],
      },
    }));

    try {
      let bundle = l2MatchesCacheRef.current;
      if (!bundle || bundle.tournamentId !== detail.id) {
        const all = await tournamentService.getLevel2AllMatches(detail.id);
        bundle = { tournamentId: detail.id, data: all };
        l2MatchesCacheRef.current = bundle;
      }
      setL2AllBracketMatches(bundle.data.matches);

      const roundMatches = mapBracketMatchesForRound(bundle.data, round.id);

      const seededEdits: Record<number, MatchEditValue> = {};
      roundMatches.forEach((match) => {
        seededEdits[match.id] = {
          team_a_name: match.team_a_name || "",
          team_b_name: match.team_b_name || "",
        };
      });

      setEditingByMatch((prev) => ({
        ...prev,
        ...seededEdits,
      }));

      setMatchesByRound((prev) => ({
        ...prev,
        [round.id]: {
          loading: false,
          loaded: true,
          data: roundMatches,
        },
      }));
    } catch (error: any) {
      setMatchesByRound((prev) => ({
        ...prev,
        [round.id]: {
          loading: false,
          loaded: false,
          data: [],
        },
      }));
      Alert.alert("Không tải được trận đấu", error?.message || "Vui lòng thử lại.");
    }
  };

  const toggleRound = (round: TournamentDetailRound) => {
    const isExpanded = expandedRounds.includes(round.id);
    if (isExpanded) {
      setExpandedRounds((prev) => prev.filter((item) => item !== round.id));
      return;
    }

    setExpandedRounds((prev) => [...prev, round.id]);
    loadRoundMatches(round);
  };

  const updateMatchEdit = (matchId: number, key: "team_a_name" | "team_b_name", value: string) => {
    setEditingByMatch((prev) => ({
      ...prev,
      [matchId]: {
        team_a_name: prev[matchId]?.team_a_name ?? "",
        team_b_name: prev[matchId]?.team_b_name ?? "",
        [key]: value,
      },
    }));
  };

  const isSavingMatch = (matchId: number) => savingMatchIds.includes(matchId);
  const isSavingWinner = (matchId: number) => savingWinnerIds.includes(matchId);

  const handleSaveMatchTeams = async (roundId: number, match: TournamentRoundMatch) => {
    if (!detail) return;

    const draft = editingByMatch[match.id] || {
      team_a_name: match.team_a_name || "",
      team_b_name: match.team_b_name || "",
    };

    const payload: { team_a_name?: string; team_b_name?: string } = {};
    const nextTeamA = draft.team_a_name.trim();
    const nextTeamB = draft.team_b_name.trim();

    if (nextTeamA !== (match.team_a_name || "")) {
      payload.team_a_name = nextTeamA;
    }

    if (nextTeamB !== (match.team_b_name || "")) {
      payload.team_b_name = nextTeamB;
    }

    if (!payload.team_a_name && !payload.team_b_name) {
      Alert.alert("Chưa có thay đổi", "Bạn chưa chỉnh tên đội nào cho trận này.");
      return;
    }

    try {
      setSavingMatchIds((prev) => [...prev, match.id]);
      const updated = await tournamentService.updateLevel2MatchTeams(
        detail.id,
        roundId,
        match.id,
        payload
      );

      setMatchesByRound((prev) => {
        const roundState = prev[roundId];
        if (!roundState) return prev;

        return {
          ...prev,
          [roundId]: {
            ...roundState,
            data: roundState.data.map((item) =>
              item.id === updated.id
                ? {
                    ...item,
                    team_a_name: updated.team_a_name,
                    team_b_name: updated.team_b_name,
                    updated_at: updated.updated_at,
                  }
                : item
            ),
          },
        };
      });

      setEditingByMatch((prev) => ({
        ...prev,
        [match.id]: {
          team_a_name: updated.team_a_name || "",
          team_b_name: updated.team_b_name || "",
        },
      }));

      l2MatchesCacheRef.current = null;

      setL2AllBracketMatches((prev) =>
        prev.map((m) =>
          m.id === updated.id
            ? {
                ...m,
                team_a_name: updated.team_a_name ?? m.team_a_name,
                team_b_name: updated.team_b_name ?? m.team_b_name,
                updated_at: updated.updated_at ?? m.updated_at,
              }
            : m
        )
      );

      Alert.alert("Thành công", "Đã cập nhật tên đội cho trận đấu.");
    } catch (error: any) {
      Alert.alert("Cập nhật thất bại", error?.message || "Vui lòng thử lại.");
    } finally {
      setSavingMatchIds((prev) => prev.filter((item) => item !== match.id));
    }
  };

  const handleSetMatchWinner = async (
    roundId: number,
    match: TournamentRoundMatch,
    winnerTeamName: string
  ) => {
    if (!detail) return;

    const name = winnerTeamName.trim();
    if (!name) return;

    try {
      setSavingWinnerIds((prev) => [...prev, match.id]);
      const updated = await tournamentService.patchLevel2Match(detail.id, match.id, {
        extra_data: { team_win: name },
      });

      setMatchesByRound((prev) => {
        const roundState = prev[roundId];
        if (!roundState) return prev;

        return {
          ...prev,
          [roundId]: {
            ...roundState,
            data: roundState.data.map((item) =>
              item.id === updated.id
                ? {
                    ...item,
                    extra_data: updated.extra_data ?? item.extra_data,
                    updated_at: updated.updated_at ?? item.updated_at,
                  }
                : item
            ),
          },
        };
      });

      l2MatchesCacheRef.current = null;

      setL2AllBracketMatches((prev) =>
        prev.map((m) =>
          m.id === updated.id
            ? {
                ...m,
                extra_data: updated.extra_data ?? m.extra_data,
                updated_at: updated.updated_at ?? m.updated_at,
              }
            : m
        )
      );

      setPickWinnerModal(null);
    } catch (error: any) {
      Alert.alert("Không lưu được", error?.message || "Vui lòng thử lại.");
    } finally {
      setSavingWinnerIds((prev) => prev.filter((item) => item !== match.id));
    }
  };

  const openPickWinnerModal = (
    roundId: number,
    match: TournamentRoundMatch,
    roundNumber: number
  ) => {
    if (isSavingWinner(match.id)) return;
    const { top, bottom } = winnerPickSlotLabels(
      {
        id: match.id,
        round_number: match.round_number ?? roundNumber,
        team_a_name: match.team_a_name,
        team_b_name: match.team_b_name,
        extra_data: match.extra_data,
      },
      l2AllBracketMatches
    );
    setPickWinnerModal({
      roundId,
      match,
      topLabel: top,
      bottomLabel: bottom,
    });
  };

  const handlePayTournament = async () => {
    if (!detail || !tournamentId) return;

    try {
      setIsPayingTournament(true);
      const order = await paymentService.getTournamentZaloPayOrder(tournamentId);

      if (!order.order_url) {
        throw new Error("Không có link thanh toán cho giải đấu này");
      }

      const supported = await Linking.canOpenURL(order.order_url);
      if (!supported) {
        Alert.alert("Không thể mở ZaloPay", "Thiết bị không hỗ trợ mở link thanh toán này.");
        return;
      }

      await Linking.openURL(order.order_url);

      Alert.alert(
        "Đã tạo đơn thanh toán",
        `Mã giao dịch: ${order.app_trans_id}\nSố tiền: ${order.amount.toLocaleString("vi-VN")}đ`
      );
    } catch (error: any) {
      Alert.alert("Lỗi thanh toán", error?.message || "Không thể tạo link thanh toán giải đấu");
    } finally {
      setIsPayingTournament(false);
    }
  };

  const handleOwnerConfirmTournament = async () => {
    if (!detail) return;

    try {
      setOwnerActionLoading("confirm");
      await tournamentService.ownerConfirmTournament(detail.id, {
        confirmed_count: Math.max(1, detail.pending_bookings || detail.total_bookings || 1),
        expires_at: buildDefaultExpiresAt(),
      });

      Alert.alert("Thành công", "Đã duyệt giải đấu.", [
        {
          text: "Đồng ý",
          onPress: () => router.replace("/(owners)/(booking)/ownerBookingManagement"),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Duyệt giải thất bại", error?.message || "Không thể duyệt giải đấu");
    } finally {
      setOwnerActionLoading(null);
    }
  };

  const handleOwnerRejectTournament = async () => {
    if (!detail) return;

    try {
      setOwnerActionLoading("reject");
      await tournamentService.ownerRejectTournament(detail.id, {
        reason: "Chủ sân từ chối tổ chức giải đấu",
      });

      Alert.alert("Thành công", "Đã từ chối giải đấu.", [
        {
          text: "Đồng ý",
          onPress: () => router.replace("/(owners)/(booking)/ownerBookingManagement"),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Từ chối giải thất bại", error?.message || "Không thể từ chối giải đấu");
    } finally {
      setOwnerActionLoading(null);
    }
  };

  if (!tournamentId || Number.isNaN(tournamentId)) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <HeaderUser
          title="Chi tiết giải đấu"
          subtitle="Không tìm thấy giải đấu"
          showBackButton
          onBackPress={() => router.replace(backRoute as never)}
        />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-gray-600 text-center">ID giải đấu không hợp lệ.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <PickMatchWinnerModal
        visible={pickWinnerModal != null}
        onDismiss={() => setPickWinnerModal(null)}
        topLabel={pickWinnerModal?.topLabel ?? ""}
        bottomLabel={pickWinnerModal?.bottomLabel ?? ""}
        loading={
          !!pickWinnerModal && savingWinnerIds.includes(pickWinnerModal.match.id)
        }
        onPickTop={() =>
          pickWinnerModal != null &&
          void handleSetMatchWinner(
            pickWinnerModal.roundId,
            pickWinnerModal.match,
            pickWinnerModal.topLabel
          )
        }
        onPickBottom={() =>
          pickWinnerModal != null &&
          void handleSetMatchWinner(
            pickWinnerModal.roundId,
            pickWinnerModal.match,
            pickWinnerModal.bottomLabel
          )
        }
      />

      <HeaderUser
        title={detail?.name || `Giải #${tournamentId}`}
        subtitle="Chi tiết giải đấu"
        showBackButton
        onBackPress={() => router.replace(backRoute as never)}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : !detail ? (
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-gray-600 text-center">Không có dữ liệu chi tiết giải đấu.</Text>
        </View>
      ) : (
        <>
        <ScrollView
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadDetail(true)} />
          }
        >
          <View className="border border-gray-200 rounded-xl p-3 mb-3">
            <Text className="text-gray-900 text-base font-semibold">Thông tin cơ bản</Text>
            <Text className="text-gray-600 mt-2 text-sm">Môn: {toVietnameseSportType(detail.sport_type)}</Text>
            <Text className="text-gray-600 text-sm">
              Cấp độ:{" "}
              {detail.level === 1
                ? "Level 1: Giải đấu tiêu chuẩn"
                : detail.level === 2
                  ? "Level 2: Giải đấu trực tiếp theo vòng"
                  : `Level ${detail.level ?? "—"}`}
            </Text>
            <Text className="text-gray-600 text-sm">Quy mô: {detail.size} đội</Text>
            {detail.created_at ? (
              <Text className="text-gray-600 text-sm">Tạo lúc: {formatDate(detail.created_at.slice(0, 10))}</Text>
            ) : null}
          </View>

          {isOwnerView ? (
            <View className="border border-gray-200 rounded-xl p-3 mb-3">
              <Text className="text-gray-900 text-base font-semibold">Xử lý giải đấu</Text>
              <Text className="text-gray-600 mt-2 text-sm">
                Số khung thời gian đã đặt: {detail.total_bookings}
              </Text>
              <Text className="text-gray-600 text-sm">
                Số khung thời gian chờ duyệt: {detail.pending_bookings}
              </Text>

              <TouchableOpacity
                className="mt-3 flex-row items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3"
                onPress={() => setShowHostInfo((prev) => !prev)}
              >
                <Text className="text-blue-900 font-semibold">Thông tin chủ sân</Text>
                <Text className="text-blue-700 text-xs font-semibold">
                  {showHostInfo ? "Thu gọn" : "Xem thêm"}
                </Text>
              </TouchableOpacity>

              {showHostInfo && (
                <View className="mt-3 rounded-xl border border-blue-200 bg-[#f8fbff] p-3">
                  {loadingHostInfo ? (
                    <View className="items-center py-3">
                      <ActivityIndicator size="small" color="#1d4ed8" />
                      <Text className="text-blue-700 mt-2">Đang tải thông tin chủ sân...</Text>
                    </View>
                  ) : (
                    <>
                      <Text className="text-gray-800 font-semibold">
                        Họ tên: {hostContact?.fullName || `Chủ sân #${detail.cluster_id ?? "--"}`}
                      </Text>
                      <Text className="text-gray-700 mt-1">
                        Email: {hostContact?.email || "Không có dữ liệu"}
                      </Text>
                      <Text className="text-gray-700 mt-1">
                        SĐT: {hostContact?.phone || "Không có dữ liệu"}
                      </Text>
                      <Text className="text-gray-700 mt-1">
                        Mã chủ sân: {hostContact?.id || detail.cluster_id || "--"}
                      </Text>

                      <ContactActions
                        receiverId={hostContact?.id || null}
                        name={hostContact?.fullName || `Chủ sân #${detail.cluster_id ?? "--"}`}
                        phone={hostContact?.phone || null}
                      />
                    </>
                  )}
                </View>
              )}

              {detail.status === "pending" ? (
                <View className="flex-row gap-2 mt-3">
                  <TouchableOpacity
                    className="flex-1 rounded-xl py-2.5 items-center bg-[#0B8FAC]"
                    onPress={handleOwnerConfirmTournament}
                    disabled={ownerActionLoading !== null}
                  >
                    <Text className="text-white font-semibold">
                      {ownerActionLoading === "confirm" ? "Đang duyệt..." : "Duyệt giải đấu"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 rounded-xl py-2.5 items-center bg-[#DC2626]"
                    onPress={handleOwnerRejectTournament}
                    disabled={ownerActionLoading !== null}
                  >
                    <Text className="text-white font-semibold">
                      {ownerActionLoading === "reject" ? "Đang từ chối..." : "Từ chối"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="mt-3 rounded-xl bg-gray-100 py-2.5 px-4 items-center">
                  <Text className="text-gray-500 font-semibold text-sm text-center">
                    {ownerActionStatusMessage(detail.status)}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View className="border border-gray-200 rounded-xl p-3 mb-3">
              <Text className="text-gray-900 text-base font-semibold">Thông tin chủ sân</Text>
              <Text className="text-gray-600 mt-2 text-sm">
                Người liên hệ trực tiếp cho giải đấu này.
              </Text>

              <TouchableOpacity
                className="mt-3 flex-row items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3"
                onPress={() => setShowHostInfo((prev) => !prev)}
              >
                <Text className="text-blue-900 font-semibold">Xem thông tin liên hệ</Text>
                <Text className="text-blue-700 text-xs font-semibold">
                  {showHostInfo ? "Thu gọn" : "Xem thêm"}
                </Text>
              </TouchableOpacity>

              {showHostInfo && (
                <View className="mt-3 rounded-xl border border-blue-200 bg-[#f8fbff] p-3">
                  {loadingHostInfo ? (
                    <View className="items-center py-3">
                      <ActivityIndicator size="small" color="#1d4ed8" />
                      <Text className="text-blue-700 mt-2">Đang tải thông tin chủ sân...</Text>
                    </View>
                  ) : (
                    <>
                      <Text className="text-gray-800 font-semibold">
                        Họ tên: {hostContact?.fullName || `Chủ sân #${detail.cluster_id ?? "--"}`}
                      </Text>
                      <Text className="text-gray-700 mt-1">
                        Email: {hostContact?.email || "Không có dữ liệu"}
                      </Text>
                      <Text className="text-gray-700 mt-1">
                        SĐT: {hostContact?.phone || "Không có dữ liệu"}
                      </Text>
                      <Text className="text-gray-700 mt-1">
                        Mã chủ sân: {hostContact?.id || detail.cluster_id || "--"}
                      </Text>

                      <ContactActions
                        receiverId={hostContact?.id || null}
                        name={hostContact?.fullName || `Chủ sân #${detail.cluster_id ?? "--"}`}
                        phone={hostContact?.phone || null}
                      />
                    </>
                  )}
                </View>
              )}
            </View>
          )}

          {!isOwnerView && (
          <View className="border border-indigo-200 bg-indigo-50 rounded-xl p-3 mb-3">
            <Text className="text-indigo-900 text-base font-semibold">Cụm sân</Text>
            <Text className="text-indigo-800 mt-2 text-sm font-medium">{clusterDisplayName}</Text>
            {clusterDisplayAddress ? (
              <Text className="text-indigo-800 mt-1 text-sm">
                Địa chỉ: {clusterDisplayAddress}
              </Text>
            ) : loadingHostInfo && typeof detail.cluster_id === "number" ? (
              <Text className="text-indigo-700 mt-1 text-xs">Đang tải địa chỉ cụm...</Text>
            ) : null}
          </View>
          )}

          {detail.level === 1 && !isOwnerView ? (
            <View className="border border-gray-200 rounded-xl p-3 mb-3">
              <Text className="text-gray-900 text-base font-semibold mb-1">
                Khung giờ đã chọn
              </Text>
              <Text className="text-gray-500 text-xs mb-3">
                Danh sách khung giờ và sân đã chọn. Địa chỉ cụm sân nằm trong ô «Cụm sân» phía trên.
              </Text>
              {level1BookingsLoading ? (
                <View className="py-4 items-center">
                  <ActivityIndicator size="small" color="#4f46e5" />
                </View>
              ) : level1Bookings.length === 0 ? (
                <Text className="text-gray-500 text-sm">Chưa có khung giờ nào.</Text>
              ) : (
                level1Bookings.map((b, index) => (
                  <View
                    key={b.id}
                    className="border border-gray-100 rounded-lg p-3 mb-2 bg-gray-50"
                  >
                    <View className="flex-row items-start justify-between gap-2">
                      <Text className="text-gray-900 font-semibold flex-1">
                        Khung giờ {index + 1}
                      </Text>
                      <Text
                        className={`text-[11px] font-semibold px-2 py-1 rounded-full ${statusClasses(b.status)}`}
                      >
                        {statusLabel(b.status)}
                      </Text>
                    </View>
                    <Text className="text-gray-700 text-sm mt-2">
                      Ngày: {formatDate(bookingDateKey(b.booking_date))}
                    </Text>
                    <Text className="text-gray-700 text-sm">
                      Giờ: {formatTime(b.start_time)} – {formatTime(b.end_time)}
                    </Text>
                    <Text className="text-gray-700 text-sm mt-1">
                      Sân: {b.field?.size || `Sân #${b.field_id}`}
                    </Text>
                    {isTournamentOrganizer ? (
                      <TouchableOpacity
                        className="mt-2 rounded-lg py-2 items-center bg-teal-600"
                        onPress={() => {
                          setL1RescheduleBooking(b);
                          setL1RescheduleDate(bookingDateKey(b.booking_date));
                          setL1AvailabilityRows([]);
                          setL1SlotsForDate("");
                          setSelectedL1Slot(null);
                        }}
                      >
                        <Text className="text-white font-semibold text-xs">Đổi lịch</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          ) : null}

          {!isOwnerView && (
          <View className="border border-gray-200 rounded-xl p-3 mb-3">
            <TouchableOpacity
              className="flex-row items-center justify-between"
              onPress={() => setShowPaymentInfo((prev) => !prev)}
            >
              <Text className="text-gray-900 text-base font-semibold">Thanh toán giải đấu</Text>
              <Text className="text-gray-500 text-xs font-semibold">
                {showPaymentInfo ? "Thu gọn" : "Xem thêm"}
              </Text>
            </TouchableOpacity>

            <View className="mt-2 self-start">
              <Text
                className={`text-xs font-semibold px-2 py-1 rounded-full ${paymentStatusClasses(
                  paymentStatus
                )}`}
              >
                {paymentStatusLabel(paymentStatus)}
              </Text>
            </View>

            {showPaymentInfo && (
              <View className="mt-3">
                {paymentStatus === "confirmed" ? (
                  <TouchableOpacity
                    className={`rounded-xl py-2.5 items-center ${
                      isPayingTournament ? "bg-gray-300" : "bg-amber-600"
                    }`}
                    onPress={handlePayTournament}
                    disabled={isPayingTournament}
                  >
                    <Text className="text-white font-semibold">
                      {isPayingTournament ? "Đang tạo link thanh toán..." : "Thanh toán ngay"}
                    </Text>
                  </TouchableOpacity>
                ) : paymentStatus === "pending" ? (
                  <Text className="text-gray-600 text-sm">
                    {
                      'Giải đấu đang chờ chủ sân duyệt. Sau khi được duyệt, trạng thái sẽ chuyển sang "Chờ thanh toán".'
                    }
                  </Text>
                ) : paymentStatus === "no_bookings" ? (
                  <Text className="text-gray-600 text-sm">
                    Chưa có lượt đặt sân được xác nhận nên chưa thể tạo thanh toán.
                  </Text>
                ) : null}
              </View>
            )}
          </View>
          )}

          {!isOwnerView && (
          <View className="border border-gray-200 rounded-xl p-3">
            <TouchableOpacity
              className="flex-row items-center justify-between"
              onPress={() => setShowRoundsInfo((prev) => !prev)}
            >
              <Text className="text-gray-900 text-base font-semibold">Danh sách vòng đấu</Text>
              <Text className="text-gray-500 text-xs font-semibold">
                {showRoundsInfo ? "Thu gọn" : "Xem thêm"}
              </Text>
            </TouchableOpacity>

            {showRoundsInfo && (
              <View className="mt-3">
                {detail.level === 2 ? (
                  <TouchableOpacity
                    className="mb-3 bg-indigo-600 rounded-xl py-2.5 items-center"
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/tournament/level2-bracket",
                        params: { tournamentId: String(detail.id) },
                      })
                    }
                  >
                    <Text className="text-white font-semibold">Xem trước sơ đồ nhánh đấu</Text>
                  </TouchableOpacity>
                ) : null}

                {rounds.length === 0 ? (
                  <Text className="text-gray-500 text-sm">Level 1 không có danh sách vòng.</Text>
                ) : (
                  rounds.map((round) => {
                    const isExpanded = expandedRounds.includes(round.id);
                    const matchesState = matchesByRound[round.id];

                    return (
                      <View key={round.id} className="border border-gray-200 rounded-xl p-3 mb-2">
                        <View className="flex-row items-start justify-between">
                          <View className="flex-1 pr-2">
                            <Text className="text-gray-900 font-semibold">Vòng {round.round_number}</Text>
                            <Text className="text-gray-600 text-xs mt-1">
                              Cụm: {round.cluster_id ? clusterNamesById[round.cluster_id] || `Cụm #${round.cluster_id}` : "--"}
                            </Text>
                            <Text className="text-gray-600 text-xs mt-1">Số trận: {round.match_count}</Text>
                            {round.start_date && round.end_date ? (
                              <Text className="text-gray-600 text-xs">
                                {formatDate(round.start_date)} - {formatDate(round.end_date)}
                              </Text>
                            ) : null}
                          </View>

                          <Text
                            className={`text-xs font-semibold px-2 py-1 rounded-full ${statusClasses(round.status)}`}
                          >
                            {statusLabel(round.status)}
                          </Text>
                        </View>

                        {detail.level === 2 && (
                          <TouchableOpacity
                            className="mt-3 bg-indigo-600 rounded-xl py-2 items-center"
                            onPress={() => toggleRound(round)}
                          >
                            <Text className="text-white font-semibold">
                              {isExpanded ? "Ẩn danh sách trận" : "Xem danh sách trận"}
                            </Text>
                          </TouchableOpacity>
                        )}

                        {isExpanded && detail.level === 2 && (
                          <View className="mt-3 border-t border-gray-100 pt-3">
                            {matchesState?.loading ? (
                              <ActivityIndicator size="small" color="#4f46e5" />
                            ) : !matchesState?.loaded ? (
                              <Text className="text-gray-500 text-sm">Chưa tải được danh sách trận.</Text>
                            ) : matchesState.data.length === 0 ? (
                              <Text className="text-gray-500 text-sm">Chưa có trận đấu trong vòng này.</Text>
                            ) : (
                              matchesState.data.map((match) => {
                                const winnerSide = resolveWinnerSideFromExtra(
                                  match.extra_data,
                                  match.team_a_name,
                                  match.team_b_name
                                );
                                const { inheritedTop, inheritedBottom } = resolveInheritedWinnerSlots(
                                  {
                                    id: match.id,
                                    round_number: match.round_number ?? round.round_number,
                                    team_a_name: match.team_a_name,
                                    team_b_name: match.team_b_name,
                                    extra_data: match.extra_data,
                                  },
                                  l2AllBracketMatches
                                );
                                const displayA =
                                  inheritedTop?.trim() || match.team_a_name?.trim() || "Chưa rõ";
                                const displayB =
                                  inheritedBottom?.trim() || match.team_b_name?.trim() || "Chưa rõ";
                                return (
                                <View
                                  key={match.id}
                                  className="border border-gray-200 rounded-lg p-3 mb-2"
                                >
                                  {(!match.team_a_name || !match.team_b_name) && (
                                    <View className="mb-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
                                      <Text className="text-amber-800 text-xs font-semibold mb-2">
                                        Chưa đủ tên đội, vui lòng nhập nhanh:
                                      </Text>
                                      <TextInput
                                        className="border border-amber-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
                                        placeholder="Tên đội A"
                                        value={editingByMatch[match.id]?.team_a_name ?? match.team_a_name ?? ""}
                                        onChangeText={(text) => updateMatchEdit(match.id, "team_a_name", text)}
                                      />
                                      <TextInput
                                        className="border border-amber-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white mt-2"
                                        placeholder="Tên đội B"
                                        value={editingByMatch[match.id]?.team_b_name ?? match.team_b_name ?? ""}
                                        onChangeText={(text) => updateMatchEdit(match.id, "team_b_name", text)}
                                      />
                                      <TouchableOpacity
                                        className={`mt-2 rounded-lg py-2 items-center ${
                                          isSavingMatch(match.id) ? "bg-gray-300" : "bg-amber-600"
                                        }`}
                                        onPress={() => handleSaveMatchTeams(round.id, match)}
                                        disabled={isSavingMatch(match.id)}
                                      >
                                        <Text className="text-white font-semibold text-xs">
                                          {isSavingMatch(match.id) ? "Đang lưu..." : "Lưu tên đội"}
                                        </Text>
                                      </TouchableOpacity>
                                    </View>
                                  )}

                                  <Text className="text-gray-900 font-medium">
                                    {displayA} vs {displayB}
                                  </Text>
                                  <Text className="text-gray-600 text-xs mt-1">
                                    {formatDate(match.booking_date)} | {formatTime(match.start_time)} - {formatTime(match.end_time)}
                                  </Text>
                                  <Text className="text-gray-600 text-xs">
                                    Sân: {match.field_description || match.field_name || "--"}
                                  </Text>
                                  <Text className="text-gray-600 text-xs mt-1">
                                    Trạng thái: {statusLabel(match.status)}
                                  </Text>
                                  {winnerSide ? (
                                    <Text className="text-emerald-700 text-xs font-semibold mt-1">
                                      Thắng:{" "}
                                      {formatWinnerBadgeLabel(
                                        match.extra_data,
                                        match.team_a_name,
                                        match.team_b_name
                                      )}
                                    </Text>
                                  ) : null}
                                  {match.booking_id ? (
                                    <Text className="text-gray-500 text-[11px] mt-1">
                                      Mã đặt sân: #{match.booking_id}
                                    </Text>
                                  ) : null}
                                  {isTournamentOrganizer &&
                                  detail.level === 2 &&
                                  !!match.team_a_name?.trim() &&
                                  !!match.team_b_name?.trim() ? (
                                    <TouchableOpacity
                                      className={`mt-2 rounded-lg py-2 items-center ${
                                        isSavingWinner(match.id) ? "bg-gray-300" : "bg-emerald-600"
                                      }`}
                                      onPress={() =>
                                        openPickWinnerModal(round.id, match, round.round_number)
                                      }
                                      disabled={isSavingWinner(match.id)}
                                    >
                                      <Text className="text-white font-semibold text-xs">
                                        {isSavingWinner(match.id) ? "Đang lưu..." : "Chọn đội thắng"}
                                      </Text>
                                    </TouchableOpacity>
                                  ) : null}
                                  {isTournamentOrganizer &&
                                  detail.level === 2 &&
                                  match.booking_id != null &&
                                  Number(match.booking_id) > 0 ? (
                                    <TouchableOpacity
                                      className="mt-2 rounded-lg py-2 items-center bg-teal-600"
                                      onPress={() =>
                                        setRescheduleTarget({ roundId: round.id, match })
                                      }
                                    >
                                      <Text className="text-white font-semibold text-xs">
                                        Đổi lịch trận
                                      </Text>
                                    </TouchableOpacity>
                                  ) : null}
                                </View>
                                );
                              })
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </View>
          )}
        </ScrollView>

        <Modal
          visible={!!rescheduleTarget}
          transparent
          animationType="slide"
          onRequestClose={closeRescheduleModal}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl max-h-[88%] p-4 pb-6">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-gray-900 font-bold text-lg flex-1 pr-2">Đổi lịch trận</Text>
                <TouchableOpacity
                  onPress={closeRescheduleModal}
                  className="px-3 py-2 bg-gray-100 rounded-full"
                  disabled={rescheduleSubmitting}
                >
                  <Text className="text-gray-700 font-semibold text-sm">Đóng</Text>
                </TouchableOpacity>
              </View>
              {rescheduleTarget ? (
                <Text className="text-gray-600 text-xs mb-3" numberOfLines={3}>
                  {(rescheduleTarget.match.team_a_name || "Chưa rõ") +
                    " vs " +
                    (rescheduleTarget.match.team_b_name || "Chưa rõ")}{" "}
                  · Đặt sân #{rescheduleTarget.match.booking_id}
                </Text>
              ) : null}
              {rescheduleSlotsLoading ? (
                <View className="py-10 items-center">
                  <ActivityIndicator size="large" color="#0d9488" />
                  <Text className="text-gray-500 mt-2 text-sm">Đang tải slot trống...</Text>
                </View>
              ) : !rescheduleSlots?.available_slots?.length ? (
                <Text className="text-gray-500 py-6 text-center text-sm">
                  Không có khung giờ trống để đổi lịch trong vòng này.
                </Text>
              ) : expandedL2RescheduleChoices.length === 0 ? (
                <Text className="text-gray-500 py-6 text-center text-sm">
                  Không có khung giờ phù hợp — thử ngày khác hoặc liên hệ chủ sân.
                </Text>
              ) : (
                <>
                  <Text className="text-gray-500 text-xs mb-2">
                    Chọn khung giờ ({expandedL2RescheduleChoices.length} lựa chọn)
                  </Text>
                  <ScrollView className="max-h-[420px]" showsVerticalScrollIndicator>
                    {expandedL2RescheduleChoices.map((slot) => {
                      const key = `${slot.field_id}-${slot.date}-${slot.start_time}-${slot.end_time}`;
                      const sel =
                        !!selectedRescheduleSlot &&
                        selectedRescheduleSlot.field_id === slot.field_id &&
                        selectedRescheduleSlot.date === slot.date &&
                        selectedRescheduleSlot.start_time === slot.start_time &&
                        selectedRescheduleSlot.end_time === slot.end_time;
                      return (
                        <TouchableOpacity
                          key={key}
                          className={`border rounded-xl p-3 mb-2 ${
                            sel ? "border-teal-600 bg-teal-50" : "border-gray-200 bg-white"
                          }`}
                          onPress={() => setSelectedRescheduleSlot(slot)}
                        >
                          <Text className="text-gray-900 font-semibold text-sm">{slot.field_name}</Text>
                          <Text className="text-gray-600 text-xs mt-1">
                            {formatDate(slot.date)} · {formatTime(slot.start_time)} –{" "}
                            {formatTime(slot.end_time)}
                          </Text>
                          <Text className="text-teal-700 text-xs mt-1">
                            Ước tính: {(slot.estimated_price ?? 0).toLocaleString("vi-VN")} đ
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  <TouchableOpacity
                    className={`mt-4 rounded-xl py-3 items-center ${
                      selectedRescheduleSlot && !rescheduleSubmitting ? "bg-teal-600" : "bg-gray-300"
                    }`}
                    disabled={!selectedRescheduleSlot || rescheduleSubmitting}
                    onPress={handleConfirmReschedule}
                  >
                    <Text className="text-white font-semibold">
                      {rescheduleSubmitting ? "Đang cập nhật..." : "Xác nhận đổi lịch"}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>

        <Modal
          visible={!!l1RescheduleBooking}
          transparent
          animationType="slide"
          onRequestClose={closeL1RescheduleModal}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl max-h-[90%] p-4 pb-6">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-gray-900 font-bold text-lg flex-1 pr-2">
                  Đổi lịch (Level 1)
                </Text>
                <TouchableOpacity
                  onPress={closeL1RescheduleModal}
                  className="px-3 py-2 bg-gray-100 rounded-full"
                  disabled={l1RescheduleSubmitting}
                >
                  <Text className="text-gray-700 font-semibold text-sm">Đóng</Text>
                </TouchableOpacity>
              </View>
              {l1RescheduleBooking ? (
                <Text className="text-gray-600 text-xs mb-3">
                  Booking #{l1RescheduleBooking.id} · Hiện tại {formatDate(bookingDateKey(l1RescheduleBooking.booking_date))}{" "}
                  {formatTime(l1RescheduleBooking.start_time)} – {formatTime(l1RescheduleBooking.end_time)}
                </Text>
              ) : null}

              <Text className="text-gray-700 text-sm mb-1">Ngày đặt (YYYY-MM-DD)</Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-3 py-2 text-gray-900 mb-3"
                value={l1RescheduleDate}
                onChangeText={(t) => {
                  setL1RescheduleDate(t);
                  setL1AvailabilityRows([]);
                  setL1SlotsForDate("");
                  setSelectedL1Slot(null);
                }}
                placeholder="2026-05-06"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                editable={!l1RescheduleSubmitting}
              />

              <TouchableOpacity
                className={`rounded-xl py-3 items-center mb-3 ${
                  l1AvailabilityLoading ? "bg-gray-300" : "bg-indigo-600"
                }`}
                onPress={loadL1ClusterAvailability}
                disabled={l1AvailabilityLoading || l1RescheduleSubmitting}
              >
                <Text className="text-white font-semibold">
                  {l1AvailabilityLoading ? "Đang tải..." : "Tải lịch trống theo cụm sân"}
                </Text>
              </TouchableOpacity>

              {!clusterIdForAvailability ? (
                <Text className="text-amber-700 text-xs mb-2">
                  Chưa có mã cụm sân — không gọi được API availability.
                </Text>
              ) : null}

              {l1AvailabilityLoading ? (
                <View className="py-6 items-center">
                  <ActivityIndicator size="large" color="#4f46e5" />
                </View>
              ) : (
                <>
                  {l1SlotsForDate && l1AvailabilityRows.length > 0 && expandedL1RescheduleChoices.length === 0 ? (
                    <Text className="text-amber-800 text-xs mb-2">
                      Không có khung giờ phù hợp trong ngày này — thử ngày khác.
                    </Text>
                  ) : null}
                  <ScrollView className="max-h-[380px]" showsVerticalScrollIndicator>
                    {expandedL1RescheduleChoices.map((slot) => {
                      const key = `${slot.field_id}-${slot.booking_date}-${slot.start_time}-${slot.end_time}`;
                      const hours = slotDurationHours(slot.start_time, slot.end_time);
                      const est = Math.round(hours * slot.price_per_hour);
                      const sel =
                        !!selectedL1Slot &&
                        selectedL1Slot.field_id === slot.field_id &&
                        selectedL1Slot.booking_date === slot.booking_date &&
                        selectedL1Slot.start_time === slot.start_time &&
                        selectedL1Slot.end_time === slot.end_time;
                      return (
                        <TouchableOpacity
                          key={key}
                          className={`border rounded-xl p-3 mb-2 ${
                            sel ? "border-teal-600 bg-teal-50" : "border-gray-200 bg-white"
                          }`}
                          onPress={() => setSelectedL1Slot(slot)}
                        >
                          <Text className="text-gray-900 font-semibold text-sm">{slot.field_label}</Text>
                          <Text className="text-gray-600 text-xs mt-1">
                            {formatDate(slot.booking_date)} · {formatTime(slot.start_time)} –{" "}
                            {formatTime(slot.end_time)}
                          </Text>
                          <Text className="text-teal-700 text-xs mt-1">
                            Ước tính: {est.toLocaleString("vi-VN")} đ ({hours.toFixed(1)} giờ ×{" "}
                            {slot.price_per_hour.toLocaleString("vi-VN")} đ/giờ)
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  <TouchableOpacity
                    className={`mt-3 rounded-xl py-3 items-center ${
                      selectedL1Slot && !l1RescheduleSubmitting ? "bg-teal-600" : "bg-gray-300"
                    }`}
                    disabled={!selectedL1Slot || l1RescheduleSubmitting}
                    onPress={handleConfirmL1Reschedule}
                  >
                    <Text className="text-white font-semibold">
                      {l1RescheduleSubmitting ? "Đang cập nhật..." : "Xác nhận đổi lịch"}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>

        </>
      )}
    </SafeAreaView>
  );
}
