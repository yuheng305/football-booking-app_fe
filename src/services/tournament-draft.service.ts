import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CreateTournamentPayload,
  InternalTournamentPlan,
  TournamentDraft,
  TournamentFrequency,
} from "../types/tournament.types";
import tournamentService from "./tournament.service";

const TOURNAMENT_DRAFT_KEY = "internalTournamentDraft";
const TOURNAMENT_PLAN_LIST_KEY = "internalTournamentPlans";

const defaultWeekdaysByFrequency = (frequency: TournamentFrequency): number[] => {
  if (frequency === "weekdays") {
    return [1, 2, 3, 4, 5];
  }

  if (frequency === "daily") {
    return [0, 1, 2, 3, 4, 5, 6];
  }

  return [];
};

class TournamentDraftService {
  async getDraft(): Promise<TournamentDraft> {
    const draftStr = await AsyncStorage.getItem(TOURNAMENT_DRAFT_KEY);
    if (!draftStr) {
      return {};
    }

    try {
      return JSON.parse(draftStr) as TournamentDraft;
    } catch {
      return {};
    }
  }

  async setDraft(draft: TournamentDraft): Promise<void> {
    await AsyncStorage.setItem(TOURNAMENT_DRAFT_KEY, JSON.stringify(draft));
  }

  async patchDraft(partial: Partial<TournamentDraft>): Promise<TournamentDraft> {
    const current = await this.getDraft();
    const next: TournamentDraft = { ...current, ...partial };

    if (partial.frequency) {
      if (partial.frequency === "daily") {
        next.selectedWeekdays = defaultWeekdaysByFrequency("daily");
      } else if (partial.frequency === "weekdays") {
        next.selectedWeekdays = defaultWeekdaysByFrequency("weekdays");
      } else if (!next.selectedWeekdays || next.selectedWeekdays.length === 0) {
        next.selectedWeekdays = [];
      }
    }

    await this.setDraft(next);
    return next;
  }

  async resetDraft(): Promise<void> {
    await AsyncStorage.removeItem(TOURNAMENT_DRAFT_KEY);
  }

  async listPlans(): Promise<InternalTournamentPlan[]> {
    const raw = await AsyncStorage.getItem(TOURNAMENT_PLAN_LIST_KEY);
    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as InternalTournamentPlan[];
    } catch {
      return [];
    }
  }

  async savePlanFromDraft(): Promise<InternalTournamentPlan> {
    const draft = await this.getDraft();
    const scheduleItems = draft.scheduleItems || [];

    const summaryFieldMap = new Map<number, { fieldId: number; fieldSize?: string; pricePerHour?: number }>();
    const summarySlotMap = new Map<string, { start_time: string; end_time: string }>();

    scheduleItems.forEach((item) => {
      item.selectedFields.forEach((field) => {
        summaryFieldMap.set(field.fieldId, field);
      });
      item.selectedSlots.forEach((slot) => {
        summarySlotMap.set(`${slot.start_time}-${slot.end_time}`, slot);
      });
    });

    const summaryFields = Array.from(summaryFieldMap.values());
    const summarySlots = Array.from(summarySlotMap.values());

    const firstItem = scheduleItems[0];

    if (!draft.name || !draft.sportType || scheduleItems.length === 0) {
      throw new Error("Thiếu thông tin tạo giải đấu nội bộ");
    }

    const hasInvalidMapping = scheduleItems.some(
      (item) => item.selectedFields.length === 0 || item.selectedSlots.length === 0
    );
    if (hasInvalidMapping) {
      throw new Error("Mỗi lịch phải có ít nhất 1 sân và 1 khung giờ");
    }

    const payload: CreateTournamentPayload = {
      name: draft.name,
      sport_type: draft.sportType,
      timezone: "Asia/Ho_Chi_Minh",
      mode: draft.frequency && draft.frequency !== "custom" ? "repeat" : "single",
      visibility: "internal",
      entries: scheduleItems.map((item) => ({
        booking_date: item.bookingDate,
        cluster_id: item.clusterId,
        field_ids: item.selectedFields.map((field) => field.fieldId),
        time_slots: item.selectedSlots.map((slot) => ({
          start_time: slot.start_time,
          end_time: slot.end_time,
        })),
      })),
      size: 0,
      // Internal tournament flow does not collect entry fee from UI.
      entry_fee: 0,
    };

    const createdTournament = await tournamentService.createTournament(payload);

    const sortedDates = [...scheduleItems]
      .map((item) => item.bookingDate)
      .sort((a, b) => a.localeCompare(b));
    const derivedStartDate = sortedDates[0];
    const derivedEndDate = sortedDates[sortedDates.length - 1];
    const derivedFrequency: TournamentFrequency = draft.frequency || "custom";

    const selectedWeekdays =
      draft.selectedWeekdays && draft.selectedWeekdays.length > 0
        ? draft.selectedWeekdays
        : defaultWeekdaysByFrequency(derivedFrequency);

    const plan: InternalTournamentPlan = {
      id: `it-${Date.now()}`,
      backendTournamentId: createdTournament.id,
      name: draft.name,
      sportType: draft.sportType,
      startDate: derivedStartDate,
      endDate: derivedEndDate,
      frequency: derivedFrequency,
      selectedWeekdays,
      clusterId: draft.clusterId || firstItem.clusterId,
      clusterName: draft.clusterName || firstItem.clusterName,
      selectedFields: summaryFields,
      selectedSlots: summarySlots,
      scheduleItems,
      createdAt: createdTournament.created_at || new Date().toISOString(),
    };

    const currentPlans = await this.listPlans();
    const nextPlans = [plan, ...currentPlans];
    await AsyncStorage.setItem(TOURNAMENT_PLAN_LIST_KEY, JSON.stringify(nextPlans));

    await this.resetDraft();
    return plan;
  }
}

export const tournamentDraftService = new TournamentDraftService();
export default tournamentDraftService;
