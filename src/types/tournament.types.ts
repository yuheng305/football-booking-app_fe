export type TournamentSportType =
  | "football"
  | "badminton"
  | "tennis"
  | "pickleball"
  | "basketball";

export type TournamentFrequency = "daily" | "weekly" | "weekdays" | "custom";

export interface TournamentFieldSelection {
  fieldId: number;
  fieldSize?: string;
  pricePerHour?: number;
}

export interface TournamentTimeSlotSelection {
  start_time: string;
  end_time: string;
}

export interface TournamentScheduleItem {
  id: string;
  bookingDate: string;
  clusterId: number;
  clusterName: string;
  selectedFields: TournamentFieldSelection[];
  selectedSlots: TournamentTimeSlotSelection[];
}

export interface TournamentDraft {
  name?: string;
  sportType?: TournamentSportType;
  startDate?: string;
  endDate?: string;
  frequency?: TournamentFrequency;
  selectedWeekdays?: number[];
  clusterId?: number;
  clusterName?: string;
  selectedFields?: TournamentFieldSelection[];
  selectedSlots?: TournamentTimeSlotSelection[];
  scheduleItems?: TournamentScheduleItem[];
}

export interface InternalTournamentPlan {
  id: string;
  backendTournamentId?: number;
  name: string;
  sportType: TournamentSportType;
  startDate: string;
  endDate: string;
  frequency: TournamentFrequency;
  selectedWeekdays: number[];
  clusterId: number;
  clusterName: string;
  selectedFields: TournamentFieldSelection[];
  selectedSlots: TournamentTimeSlotSelection[];
  scheduleItems: TournamentScheduleItem[];
  createdAt: string;
}

export interface TournamentCreateTimeSlot {
  start_time: string;
  end_time: string;
}

export interface TournamentCreateEntry {
  booking_date: string;
  cluster_id: number;
  field_ids: number[];
  time_slots: TournamentCreateTimeSlot[];
}

export interface CreateTournamentPayload {
  name: string;
  sport_type: TournamentSportType;
  timezone: string;
  mode: "repeat" | "single";
  visibility: "internal" | "public";
  entries: TournamentCreateEntry[];
  size: number;
  entry_fee: number;
}

export interface TournamentCreateResult {
  id: number;
  name: string;
  sport_type: TournamentSportType;
  mode: "repeat" | "single";
  size: number;
  entry_fee: number;
  cluster_id: number;
  organizer_id: number;
  created_at: string;
  updated_at: string;
}

export interface OwnerConfirmTournamentPayload {
  confirmed_count: number;
  expires_at: string;
}

export interface OwnerConfirmTournamentResult {
  confirmed_count?: number;
  expires_at?: string;
  status?: string;
}

export type TournamentOwnerBookingStatus =
  | "pending"
  | "confirmed"
  | "payment_required"
  | "approved"
  | "success"
  | "completed"
  | "canceled"
  | "rejected";

export interface OwnerTournamentItem {
  id: number;
  name: string;
  sport_type: TournamentSportType;
  mode: "repeat" | "single";
  size: number;
  entry_fee: number;
  organizer_id: number;
  status?: TournamentOwnerBookingStatus | string;
  pending_bookings_count: number;
  created_at: string;
}

export interface OwnerTournamentListData {
  tournaments: OwnerTournamentItem[];
  total: number;
  offset: number;
  limit: number;
}

export interface OrganizerTournamentItem {
  id: number;
  name: string;
  sport_type: TournamentSportType | string;
  mode: "repeat" | "single" | string;
  size: number | null;
  /** 1 = tiêu chuẩn, 2 = trực tiếp theo vòng */
  level?: number;
  entry_fee: number | null;
  cluster_id: number;
  organizer_id: number;
  payment_status?: "paid" | "pending" | "confirmed" | "no_bookings" | string;
  created_at: string;
  updated_at: string;
}

export interface OrganizerTournamentListData {
  tournaments: OrganizerTournamentItem[];
  total: number;
  offset: number;
  limit: number;
}

export interface TournamentBookingStats {
  total_bookings: number;
  pending_bookings: number;
  confirmed_bookings: number;
}

export interface TournamentDetailRound {
  id: number;
  round_number: number;
  match_count: number;
  status: string;
  cluster_id?: number;
  cluster_name?: string;
  start_date?: string;
  end_date?: string;
  daily_start_time?: string;
  daily_end_time?: string;
}

export interface TournamentDetailData {
  id: number;
  name: string;
  sport_type: TournamentSportType | string;
  size: number;
  level: number;
  mode?: string;
  cluster_id?: number;
  cluster_name?: string;
  payment_status?: "paid" | "pending" | "confirmed" | "no_bookings" | string;
  entry_fee: number;
  organizer_id?: number;
  created_at?: string;
  updated_at?: string;
  total_bookings: number;
  pending_bookings: number;
  confirmed_bookings: number;
  rounds: TournamentDetailRound[];
}

export type TournamentRoundMatchStatus =
  | "pending"
  | "confirmed"
  | "success"
  | "canceled"
  | string;

/** GET/PATCH …/matches — extra_data.team_win: tên đội thắng (chuỗi); có thể còn "A"/"B" dữ liệu cũ. */
export type TournamentMatchExtraData = {
  team_win?: string;
  [key: string]: unknown;
};

export interface TournamentRoundMatch {
  id: number;
  /** Có khi map từ GET …/matches — dùng suy luận đội thắng vào vòng sau. */
  round_number?: number;
  team_a_name: string | null;
  team_b_name: string | null;
  booking_id?: number;
  round_id?: number;
  tournament_id?: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  field_id?: number;
  field_name?: string | null;
  field_description?: string | null;
  status: TournamentRoundMatchStatus;
  extra_data?: TournamentMatchExtraData | string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TournamentRoundMatchesData {
  round_id: number;
  round_number?: number;
  matches: TournamentRoundMatch[];
  total?: number;
}

export interface TournamentBracketMatch {
  id: number;
  round_number: number;
  team_a_name: string | null;
  team_b_name: string | null;
  score?: string | null;
  notes?: string | null;
  extra_data?: TournamentMatchExtraData | string | null;
  booking_id?: number | null;
  round_id?: number | null;
  tournament_id: number;
  booking_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  field_id?: number | null;
  field_description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TournamentBracketData {
  tournament_id: number;
  matches: TournamentBracketMatch[];
  total: number;
}

export interface PatchLevel2MatchExtraPayload {
  extra_data: { team_win: string };
}

export interface UpdateLevel2MatchTeamsPayload {
  team_a_name?: string;
  team_b_name?: string;
}

export interface UpdateLevel2MatchTeamsResult extends TournamentRoundMatch {}

export interface Level2RoundConfigInput {
  round_number: number;
  cluster_id: number;
  start_date: string;
  end_date: string;
  daily_start_time: string;
  daily_end_time: string;
  match_duration_mins: number;
}

export interface CreateLevel2TournamentPayload {
  name: string;
  sport_type: TournamentSportType;
  size: number;
  /** Độ dài phải bằng size */
  teams: string[];
  entry_fee: number;
  rounds: Level2RoundConfigInput[];
}

/** Dữ liệu bước 1 (thông tin giải + đội), trước khi cấu hình vòng. */
export interface Level2SetupDraft {
  name: string;
  sport_type: TournamentSportType;
  size: number;
  teams: string[];
  entry_fee: number;
}

export type Level2RoundStatus = "pending" | "scheduled";

export interface Level2TournamentRound {
  id: number;
  tournament_id: number;
  round_number: number;
  match_count: number;
  cluster_id: number;
  start_date: string;
  end_date: string;
  daily_start_time: string;
  daily_end_time: string;
  match_duration_mins: number;
  status: Level2RoundStatus;
}

export interface CreateLevel2TournamentResult {
  id: number;
  name: string;
  sport_type: TournamentSportType;
  size: number;
  entry_fee: number;
  level: number;
  organizer_id: number;
  total_rounds: number;
  rounds: Level2TournamentRound[];
  created_at: string;
}

export interface Level2AvailableSlot {
  field_id: number;
  field_name: string;
  date: string;
  start_time: string;
  end_time: string;
  estimated_price: number;
}

export interface Level2AvailableSlotsResult {
  round_id: number;
  round_number: number;
  match_count: number;
  already_scheduled: number;
  slots_needed: number;
  available_slots: Level2AvailableSlot[];
}

export interface Level2ScheduleSlotInput {
  field_id: number;
  date: string;
  start_time: string;
  end_time: string;
}

export interface ScheduleLevel2RoundPayload {
  selected_slots: Level2ScheduleSlotInput[];
}

export interface ScheduleLevel2RoundResult {
  round_id: number;
  round_number: number;
  match_count: number;
  status: Level2RoundStatus;
  bookings_created: number;
}

/** POST /tournaments/:id/bookings/:bookingId/reschedule */
export interface Level2RescheduleBookingPayload {
  booking_date: string;
  start_time: string;
  end_time: string;
  field_id: number;
}

export interface Level2RescheduleBookingResult {
  booking_id: number;
  field_id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_price?: number;
  message?: string;
}

export interface Level2RoundSelection {
  round_id: number;
  selected_slots: Level2ScheduleSlotInput[];
}

export interface Level2FlowDraft {
  tournament_id?: number;
  tournament_name?: string;
  rounds: Level2TournamentRound[];
  selections: Level2RoundSelection[];
  owner_confirmed?: boolean;
}
