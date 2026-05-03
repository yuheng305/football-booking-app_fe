import apiClient from "../utils/api.client";
import API_CONFIG from "../config/api.config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CreateLevel2TournamentPayload,
  CreateLevel2TournamentResult,
  TournamentDetailData,
  TournamentRoundMatchesData,
  TournamentBracketData,
  TournamentBracketMatch,
  TournamentRoundMatch,
  PatchLevel2MatchExtraPayload,
  UpdateLevel2MatchTeamsPayload,
  UpdateLevel2MatchTeamsResult,
  CreateTournamentPayload,
  Level2AvailableSlotsResult,
  OrganizerTournamentListData,
  OwnerTournamentListData,
  OwnerConfirmTournamentPayload,
  OwnerConfirmTournamentResult,
  ScheduleLevel2RoundPayload,
  ScheduleLevel2RoundResult,
  Level2RescheduleBookingPayload,
  Level2RescheduleBookingResult,
  TournamentCreateResult,
  TournamentOwnerBookingStatus,
} from "../types/tournament.types";

function mapBracketMatchToRoundMatch(m: TournamentBracketMatch): TournamentRoundMatch {
  const booked = m.booking_id != null && Number(m.booking_id) > 0;
  return {
    id: m.id,
    round_number: m.round_number,
    team_a_name: m.team_a_name,
    team_b_name: m.team_b_name,
    booking_id: m.booking_id ?? undefined,
    round_id: m.round_id ?? undefined,
    tournament_id: m.tournament_id,
    booking_date: m.booking_date ?? "",
    start_time: m.start_time ?? "",
    end_time: m.end_time ?? "",
    field_id: m.field_id ?? undefined,
    field_name: null,
    field_description: m.field_description ?? null,
    status: booked ? "scheduled" : "pending",
    extra_data: m.extra_data ?? null,
    created_at: m.created_at,
    updated_at: m.updated_at,
  };
}

/** Lọc client-side từ GET /tournaments/:id/matches (danh sách toàn giải). */
export function mapBracketMatchesForRound(data: TournamentBracketData, roundId: number): TournamentRoundMatch[] {
  const rid = Number(roundId);
  return data.matches.filter((m) => Number(m.round_id) === rid).map(mapBracketMatchToRoundMatch);
}

type ApiEnvelope<T> = {
  data: T;
  api_version: string;
  errors: {
    msg: string[];
    code: null | string;
  };
};

class TournamentService {
  private unwrapData<T>(payload: T | ApiEnvelope<T>): T {
    const candidate = payload as ApiEnvelope<T>;
    if (candidate && typeof candidate === "object" && "data" in candidate) {
      return candidate.data;
    }

    return payload as T;
  }

  async createTournament(payload: CreateTournamentPayload): Promise<TournamentCreateResult> {
    const response = await apiClient.post<
      TournamentCreateResult | ApiEnvelope<TournamentCreateResult>
    >(API_CONFIG.TOURNAMENT_ENDPOINTS.CREATE, payload);

    const data = this.unwrapData<TournamentCreateResult>(response);
    if (!data?.id) {
      throw new Error("Không thể tạo giải đấu");
    }

    return data;
  }

  async getTournamentDetail(tournamentId: number): Promise<TournamentDetailData> {
    const endpoint = API_CONFIG.TOURNAMENT_ENDPOINTS.DETAIL.replace(":id", String(tournamentId));

    const response = await apiClient.get<TournamentDetailData | ApiEnvelope<TournamentDetailData>>(
      endpoint
    );

    const data = this.unwrapData<TournamentDetailData>(response);
    if (!data?.id || !Array.isArray(data?.rounds)) {
      throw new Error("Không tải được chi tiết giải đấu");
    }

    return data;
  }

  async getLevel2RoundMatches(
    tournamentId: number,
    roundId: number
  ): Promise<TournamentRoundMatchesData> {
    const all = await this.getLevel2AllMatches(tournamentId);
    const matches = mapBracketMatchesForRound(all, roundId);
    return {
      round_id: roundId,
      matches,
      total: matches.length,
    };
  }

  async getLevel2AllMatches(tournamentId: number): Promise<TournamentBracketData> {
    const endpoint = API_CONFIG.TOURNAMENT_ENDPOINTS.LEVEL_2_ALL_MATCHES.replace(
      ":id",
      String(tournamentId)
    );

    const response = await apiClient.get<TournamentBracketData | ApiEnvelope<TournamentBracketData>>(
      endpoint
    );

    const data = this.unwrapData<TournamentBracketData>(response);
    if (!data?.tournament_id || !Array.isArray(data?.matches)) {
      throw new Error("Không tải được sơ đồ nhánh đấu");
    }

    return data;
  }

  /**
   * PATCH /tournaments/:id/matches/:matchId — extra_data.team_win = tên đội thắng (chuỗi).
   * BE trả về object trận (cùng dạng phần tử trong GET …/matches).
   */
  async patchLevel2Match(
    tournamentId: number,
    matchId: number,
    payload: PatchLevel2MatchExtraPayload
  ): Promise<TournamentBracketMatch> {
    const endpoint = API_CONFIG.TOURNAMENT_ENDPOINTS.LEVEL_2_PATCH_MATCH.replace(
      ":id",
      String(tournamentId)
    ).replace(":matchId", String(matchId));

    const response = await apiClient.patch<
      TournamentBracketMatch | ApiEnvelope<TournamentBracketMatch>
    >(endpoint, payload);

    const data = this.unwrapData<TournamentBracketMatch>(response);
    if (!data?.id) {
      throw new Error("Không thể cập nhật kết quả trận đấu");
    }

    return data;
  }

  async updateLevel2MatchTeams(
    tournamentId: number,
    roundId: number,
    matchId: number,
    payload: UpdateLevel2MatchTeamsPayload
  ): Promise<UpdateLevel2MatchTeamsResult> {
    const endpoint = API_CONFIG.TOURNAMENT_ENDPOINTS.LEVEL_2_UPDATE_MATCH.replace(
      ":id",
      String(tournamentId)
    )
      .replace(":roundId", String(roundId))
      .replace(":matchId", String(matchId));

    const response = await apiClient.patch<
      UpdateLevel2MatchTeamsResult | ApiEnvelope<UpdateLevel2MatchTeamsResult>
    >(endpoint, payload);

    const data = this.unwrapData<UpdateLevel2MatchTeamsResult>(response);
    if (!data?.id) {
      throw new Error("Không thể cập nhật tên đội cho trận đấu");
    }

    return data;
  }

  async createTournamentLevel2(
    payload: CreateLevel2TournamentPayload
  ): Promise<CreateLevel2TournamentResult> {
    console.log("[TOURNAMENT][L2][CREATE] request", payload);
    const response = await apiClient.post<
      CreateLevel2TournamentResult | ApiEnvelope<CreateLevel2TournamentResult>
    >(API_CONFIG.TOURNAMENT_ENDPOINTS.CREATE_LEVEL_2, payload);

    const data = this.unwrapData<CreateLevel2TournamentResult>(response);
    console.log("[TOURNAMENT][L2][CREATE] response", data);
    if (!data?.id || !Array.isArray(data?.rounds)) {
      throw new Error("Không thể tạo giải đấu level 2");
    }

    return data;
  }

  async getLevel2AvailableSlots(
    tournamentId: number,
    roundId: number
  ): Promise<Level2AvailableSlotsResult> {
    const endpoint = API_CONFIG.TOURNAMENT_ENDPOINTS.LEVEL_2_AVAILABLE_SLOTS.replace(
      ":id",
      String(tournamentId)
    ).replace(":roundId", String(roundId));

    console.log("[TOURNAMENT][L2][AVAILABLE_SLOTS] request", {
      tournamentId,
      roundId,
      endpoint,
    });

    const response = await apiClient.get<
      Level2AvailableSlotsResult | ApiEnvelope<Level2AvailableSlotsResult>
    >(endpoint);

    const data = this.unwrapData<Level2AvailableSlotsResult>(response);
    console.log("[TOURNAMENT][L2][AVAILABLE_SLOTS] response", {
      round_id: data?.round_id,
      slots_needed: data?.slots_needed,
      available_count: data?.available_slots?.length || 0,
      data,
    });
    if (!Array.isArray(data?.available_slots)) {
      throw new Error("Không tải được danh sách slot trống");
    }

    return data;
  }

  async scheduleLevel2Round(
    tournamentId: number,
    roundId: number,
    payload: ScheduleLevel2RoundPayload
  ): Promise<ScheduleLevel2RoundResult> {
    const endpoint = API_CONFIG.TOURNAMENT_ENDPOINTS.LEVEL_2_SCHEDULE_ROUND.replace(
      ":id",
      String(tournamentId)
    ).replace(":roundId", String(roundId));

    console.log("[TOURNAMENT][L2][SCHEDULE_ROUND] request", {
      tournamentId,
      roundId,
      endpoint,
      selected_slots_count: payload?.selected_slots?.length || 0,
      payload,
    });

    const response = await apiClient.post<
      ScheduleLevel2RoundResult | ApiEnvelope<ScheduleLevel2RoundResult>
    >(endpoint, payload);

    const data = this.unwrapData<ScheduleLevel2RoundResult>(response);
    console.log("[TOURNAMENT][L2][SCHEDULE_ROUND] response", data);
    if (!data?.round_id || data?.status !== "scheduled") {
      throw new Error("Không thể xác nhận lịch cho vòng đấu");
    }

    return data;
  }

  async rescheduleLevel2Booking(
    tournamentId: number,
    bookingId: number,
    payload: Level2RescheduleBookingPayload
  ): Promise<Level2RescheduleBookingResult> {
    const endpoint = API_CONFIG.TOURNAMENT_ENDPOINTS.LEVEL_2_BOOKING_RESCHEDULE.replace(
      ":id",
      String(tournamentId)
    ).replace(":bookingId", String(bookingId));

    const response = await apiClient.post<
      Level2RescheduleBookingResult | ApiEnvelope<Level2RescheduleBookingResult>
    >(endpoint, payload);

    const data = this.unwrapData<Level2RescheduleBookingResult>(response);
    if (!data?.booking_id) {
      throw new Error(data?.message || "Không đổi được lịch booking");
    }

    return data;
  }

  async ownerConfirmTournament(
    tournamentId: number,
    payload?: OwnerConfirmTournamentPayload
  ): Promise<OwnerConfirmTournamentResult> {
    const endpoint = API_CONFIG.TOURNAMENT_ENDPOINTS.OWNER_CONFIRM.replace(
      ":id",
      String(tournamentId)
    );

    const response = await apiClient.patch<
      OwnerConfirmTournamentResult | ApiEnvelope<OwnerConfirmTournamentResult>
    >(endpoint, payload);

    const data = this.unwrapData<OwnerConfirmTournamentResult>(response);
    if (!data) {
      throw new Error("Duyệt giải thất bại");
    }

    return data;
  }

  async ownerRejectTournament(
    tournamentId: number,
    payload?: { reason?: string }
  ): Promise<{ status?: string } | null> {
    const endpoint = API_CONFIG.TOURNAMENT_ENDPOINTS.OWNER_REJECT.replace(
      ":id",
      String(tournamentId)
    );

    const response = await apiClient.patch<{ status?: string } | ApiEnvelope<{ status?: string }>>(
      endpoint,
      payload
    );

    return this.unwrapData<{ status?: string }>(response);
  }

  async listOwnerTournaments(params?: {
    bookingStatus?: TournamentOwnerBookingStatus;
    offset?: number;
    limit?: number;
  }): Promise<OwnerTournamentListData> {
    const bookingStatus = params?.bookingStatus || "confirmed";
    const offset = params?.offset ?? 0;
    const limit = params?.limit ?? 20;

    const localUrl =
      process.env.EXPO_PUBLIC_OWNER_TOURNAMENT_LIST_URL?.trim() ||
      "http://localhost:8030/api/v1/tournaments/owner";

    if (__DEV__) {
      try {
        const token = await AsyncStorage.getItem("authToken");
        const query = new URLSearchParams({
          booking_status: bookingStatus,
          offset: String(offset),
          limit: String(limit),
        }).toString();

        const response = await fetch(`${localUrl}?${query}`, {
          method: "GET",
          headers: {
            accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (response.ok) {
          const payload = await response.json();
          const data = this.unwrapData<OwnerTournamentListData>(payload);
          if (Array.isArray(data?.tournaments)) {
            return data;
          }
        }
      } catch (error) {
        console.log("[TOURNAMENT] local owner list failed, fallback to deployed API", error);
      }
    }

    const response = await apiClient.get<
      OwnerTournamentListData | ApiEnvelope<OwnerTournamentListData>
    >(API_CONFIG.TOURNAMENT_ENDPOINTS.OWNER_LIST, {
      params: {
        booking_status: bookingStatus,
        offset,
        limit,
      },
    });

    const data = this.unwrapData<OwnerTournamentListData>(response);
    if (!Array.isArray(data?.tournaments)) {
      throw new Error("Không lấy được danh sách giải đấu của chủ sân");
    }

    return data;
  }

  async listOrganizerTournaments(params: {
    organizerId: number;
    offset?: number;
    limit?: number;
  }): Promise<OrganizerTournamentListData> {
    const { organizerId, offset = 0, limit = 20 } = params;

    const endpoint = API_CONFIG.TOURNAMENT_ENDPOINTS.ORGANIZER_LIST.replace(
      ":organizerId",
      String(organizerId)
    );

    const response = await apiClient.get<
      OrganizerTournamentListData | ApiEnvelope<OrganizerTournamentListData>
    >(endpoint, {
      params: {
        offset,
        limit,
      },
    });

    const data = this.unwrapData<OrganizerTournamentListData>(response);
    if (!Array.isArray(data?.tournaments)) {
      throw new Error("Không lấy được danh sách giải đấu của organizer");
    }

    return data;
  }
}

export const tournamentService = new TournamentService();
export default tournamentService;
