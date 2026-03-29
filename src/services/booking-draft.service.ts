import AsyncStorage from "@react-native-async-storage/async-storage";

const BOOKING_DRAFT_KEY = "bookingDraft";

export type BookingDraft = {
  clusterId?: number;
  clusterName?: string;
  selectedDate?: string;
  fieldId?: number;
  fieldSize?: string;
  fieldPrice?: number;
  fieldDescription?: string;
  availableSlots?: Array<{ start_time: string; end_time: string }>;
  bookedSlots?: Array<{ start_time: string; end_time: string; booking_type?: string }>;
  selectedStartTime?: string;
  selectedEndTime?: string;
  selectedDuration?: number;
};

class BookingDraftService {
  async getDraft(): Promise<BookingDraft> {
    const draftStr = await AsyncStorage.getItem(BOOKING_DRAFT_KEY);
    if (!draftStr) {
      return {};
    }

    try {
      return JSON.parse(draftStr) as BookingDraft;
    } catch {
      return {};
    }
  }

  async setDraft(draft: BookingDraft): Promise<void> {
    await AsyncStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(draft));
  }

  async patchDraft(partial: Partial<BookingDraft>): Promise<BookingDraft> {
    const current = await this.getDraft();
    const next = { ...current, ...partial };
    await this.setDraft(next);
    return next;
  }

  async clearFieldsAfterCluster(): Promise<BookingDraft> {
    const current = await this.getDraft();
    const next: BookingDraft = {
      clusterId: current.clusterId,
      clusterName: current.clusterName,
    };
    await this.setDraft(next);
    return next;
  }

  async clearFieldsAfterDate(): Promise<BookingDraft> {
    const current = await this.getDraft();
    const next: BookingDraft = {
      clusterId: current.clusterId,
      clusterName: current.clusterName,
      selectedDate: current.selectedDate,
    };
    await this.setDraft(next);
    return next;
  }

  async resetDraft(): Promise<void> {
    await AsyncStorage.removeItem(BOOKING_DRAFT_KEY);
  }
}

export const bookingDraftService = new BookingDraftService();
export default bookingDraftService;
