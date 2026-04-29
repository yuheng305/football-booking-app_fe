import AsyncStorage from "@react-native-async-storage/async-storage";
import { Level2FlowDraft, Level2RoundSelection, Level2TournamentRound } from "../types/tournament.types";

const TOURNAMENT_LEVEL_2_DRAFT_KEY = "tournamentLevel2FlowDraft";

const emptyDraft: Level2FlowDraft = {
  rounds: [],
  selections: [],
  owner_confirmed: false,
};

class TournamentLevel2DraftService {
  async getDraft(): Promise<Level2FlowDraft> {
    const raw = await AsyncStorage.getItem(TOURNAMENT_LEVEL_2_DRAFT_KEY);
    if (!raw) {
      return emptyDraft;
    }

    try {
      const parsed = JSON.parse(raw) as Level2FlowDraft;
      return {
        ...emptyDraft,
        ...parsed,
        rounds: parsed.rounds || [],
        selections: parsed.selections || [],
      };
    } catch {
      return emptyDraft;
    }
  }

  async setDraft(draft: Level2FlowDraft): Promise<void> {
    await AsyncStorage.setItem(TOURNAMENT_LEVEL_2_DRAFT_KEY, JSON.stringify(draft));
  }

  async resetDraft(): Promise<void> {
    await AsyncStorage.removeItem(TOURNAMENT_LEVEL_2_DRAFT_KEY);
  }

  async setCreatedTournament(payload: {
    tournament_id: number;
    tournament_name: string;
    rounds: Level2TournamentRound[];
  }): Promise<Level2FlowDraft> {
    const next: Level2FlowDraft = {
      tournament_id: payload.tournament_id,
      tournament_name: payload.tournament_name,
      rounds: payload.rounds,
      selections: [],
      owner_confirmed: false,
    };

    await this.setDraft(next);
    return next;
  }

  async markRoundScheduled(roundId: number): Promise<Level2FlowDraft> {
    const draft = await this.getDraft();
    const updatedRounds = draft.rounds.map((round) =>
      round.id === roundId ? { ...round, status: "scheduled" as const } : round
    );
    const next = { ...draft, rounds: updatedRounds };
    await this.setDraft(next);
    return next;
  }

  async setRoundSelection(
    roundId: number,
    selectedSlots: Level2RoundSelection["selected_slots"]
  ): Promise<Level2FlowDraft> {
    const draft = await this.getDraft();
    const existing = draft.selections.filter((item) => item.round_id !== roundId);
    const nextSelections: Level2RoundSelection[] = [
      ...existing,
      {
        round_id: roundId,
        selected_slots: selectedSlots,
      },
    ];

    const next = {
      ...draft,
      selections: nextSelections,
    };

    await this.setDraft(next);
    return next;
  }

  async setOwnerConfirmed(confirmed: boolean): Promise<Level2FlowDraft> {
    const draft = await this.getDraft();
    const next = {
      ...draft,
      owner_confirmed: confirmed,
    };

    await this.setDraft(next);
    return next;
  }
}

export const tournamentLevel2DraftService = new TournamentLevel2DraftService();
export default tournamentLevel2DraftService;
