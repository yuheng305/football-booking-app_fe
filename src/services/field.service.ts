/**
 * Field Service
 * Handles field-related API calls
 */

import { apiClient } from "../utils/api.client";
import { API_CONFIG } from "../config/api.config";
import {
  GetFieldAvailabilityResponse,
  GetFieldAvailabilityParams,
  GetFieldAvailabilityByFieldParams,
  GetFieldAvailabilityByFieldResponse,
  FieldWithAvailability,
  GetOwnerFieldsResponse,
  FieldBasic,
} from "../types/booking.types";

class FieldService {
  /**
   * Get all fields in a cluster (temporary flow)
   */
  async getFieldsByCluster(
    clusterId: number,
    options?: { sportTypeId?: number }
  ): Promise<{ fields: FieldBasic[]; total: number }> {
    try {
      const endpoint = API_CONFIG.FIELD_ENDPOINTS.GET_BY_CLUSTER.replace(
        ":clusterId",
        clusterId.toString()
      );

      const response = await apiClient.get<GetOwnerFieldsResponse>(endpoint, {
        params: options?.sportTypeId ? { sport_type_id: options.sportTypeId } : undefined,
      });

      return response.data;
    } catch (error) {
      console.error("[FIELD SERVICE] Error fetching fields by cluster:", error);
      throw error;
    }
  }

  /**
   * Get field availability for a specific cluster and date
   * @param params - Cluster ID and booking date
   * @returns Array of fields with their availability and booked slots
   */
  async getFieldAvailability(
    params: GetFieldAvailabilityParams
  ): Promise<FieldWithAvailability[]> {
    try {
      const endpoint = API_CONFIG.FIELD_ENDPOINTS.GET_AVAILABILITY.replace(
        ":clusterId",
        params.clusterId.toString()
      );

      const response = await apiClient.get<GetFieldAvailabilityResponse>(
        endpoint,
        {
          params: {
            booking_date: params.bookingDate,
          },
        }
      );

      return response.data.fields;
    } catch (error) {
      console.error("[FIELD SERVICE] Error fetching availability:", error);
      throw error;
    }
  }

  async getFieldAvailabilityByFieldId(
    params: GetFieldAvailabilityByFieldParams
  ): Promise<FieldWithAvailability> {
    try {
      const endpoint = API_CONFIG.FIELD_ENDPOINTS.GET_FIELD_AVAILABILITY_BY_ID.replace(
        ":fieldId",
        params.fieldId.toString()
      );

      const response = await apiClient.get<GetFieldAvailabilityByFieldResponse>(
        endpoint,
        {
          params: {
            booking_date: params.bookingDate,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("[FIELD SERVICE] Error fetching field-by-id availability:", error);
      throw error;
    }
  }

  /**
   * Get all fields owned by an owner
   * @param ownerId - Owner user ID
   * @returns Array of fields owned by the owner
   */
  async getOwnerFields(ownerId: number): Promise<{ fields: FieldBasic[]; total: number }> {
    try {
      const endpoint = API_CONFIG.FIELD_ENDPOINTS.GET_OWNER_FIELDS.replace(
        ":ownerId",
        ownerId.toString()
      );

      const response = await apiClient.get<GetOwnerFieldsResponse>(endpoint);

      return response.data;
    } catch (error) {
      console.error("[FIELD SERVICE] Error fetching owner fields:", error);
      throw error;
    }
  }
}

export const fieldService = new FieldService();
