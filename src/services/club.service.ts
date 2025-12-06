/**
 * Club Service
 * Xử lý tất cả logic liên quan đến clubs
 */

import apiClient from "../utils/api.client";
import API_CONFIG from "../config/api.config";
import {
  Club,
  ClubMember,
  CreateClubRequest,
  CreateClubResponse,
  GetClubsResponse,
  GetClubMembersResponse,
  JoinClubRequest,
  JoinClubResponse,
} from "../types/club.types";

class ClubService {
  /**
   * Create a new club
   */
  async createClub(data: CreateClubRequest): Promise<Club> {
    try {
      const response = await apiClient.post<CreateClubResponse>(
        API_CONFIG.CLUB_ENDPOINTS.CREATE,
        data
      );

      if (!response.data?.id) {
        throw new Error("Failed to create club");
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get clubs for a specific player
   */
  async getPlayerClubs(playerId: number): Promise<{
    clubs: Club[];
    total: number;
    offset: number;
    limit: number;
  }> {
    try {
      const endpoint = API_CONFIG.CLUB_ENDPOINTS.GET_PLAYER_CLUBS.replace(
        ":playerId",
        String(playerId)
      );

      const response = await apiClient.get<GetClubsResponse>(endpoint);

      console.log("[CLUB SERVICE] Raw API Response:", JSON.stringify(response, null, 2));
      console.log("[CLUB SERVICE] Response data:", response.data);
      console.log("[CLUB SERVICE] Clubs array:", response.data?.clubs);

      return response.data;
    } catch (error) {
      console.error("[CLUB SERVICE] Error fetching player clubs:", error);
      throw error;
    }
  }

  /**
   * Get members of a club
   */
  async getClubMembers(clubId: number): Promise<{
    members: ClubMember[];
    total: number;
  }> {
    try {
      const endpoint = API_CONFIG.CLUB_ENDPOINTS.GET_CLUB_MEMBERS.replace(
        ":clubId",
        String(clubId)
      );

      const response = await apiClient.get<GetClubMembersResponse>(endpoint);

      console.log("[CLUB SERVICE] Get Members Response:", JSON.stringify(response, null, 2));
      console.log("[CLUB SERVICE] Members data:", response.data);
      console.log("[CLUB SERVICE] Members array:", response.data?.members);

      return response.data;
    } catch (error) {
      console.error("[CLUB SERVICE] Error fetching club members:", error);
      throw error;
    }
  }

  /**
   * Join a club
   */
  async joinClub(clubId: number, playerId: number): Promise<string> {
    try {
      const endpoint = API_CONFIG.CLUB_ENDPOINTS.JOIN_CLUB.replace(
        ":clubId",
        String(clubId)
      );

      const response = await apiClient.post<JoinClubResponse>(endpoint, {
        player_id: playerId,
      });

      return response.data?.message || "Joined club successfully";
    } catch (error) {
      throw error;
    }
  }

  /**
   * Leave a club
   */
  async leaveClub(clubId: number, playerId: number): Promise<void> {
    try {
      const endpoint = API_CONFIG.CLUB_ENDPOINTS.LEAVE_CLUB.replace(
        ":clubId",
        String(clubId)
      ).replace(":playerId", String(playerId));

      await apiClient.delete(endpoint);
    } catch (error) {
      throw error;
    }
  }
}

export const clubService = new ClubService();
export default clubService;
