/**
 * Booking Service
 * Xử lý tất cả các logic liên quan đến bookings
 */

import apiClient from "../utils/api.client";
import API_CONFIG from "../config/api.config";
import {
  GetPlayerBookingsResponse,
  GetPlayerBookingsParams,
  GetOwnerBookingsResponse,
  GetOwnerBookingsParams,
  BookingType,
  Booking,
} from "../types/booking.types";

type CreateBookingPayload = {
  type: BookingType;
  booking_date: string;
  start_time: string;
  end_time: string;
  field_id: number;
};

type CreateBookingResponse = {
  data: Booking;
  api_version: string;
  errors: {
    msg: string[];
    code: null | string;
  };
};

type OwnerBookingActionResponse = {
  data: any;
  api_version: string;
  errors: {
    msg: string[];
    code: null | string;
  };
};

type ZaloPayPaymentResponse = {
  data: {
    app_trans_id: string;
    order_url: string;
    qr_code: string | null;
    amount: number;
    description: string;
  };
  api_version: string;
  errors: {
    msg: string[];
    code: null | string;
  };
};

class BookingService {
  async getUserBasicProfile(userId: number): Promise<{
    id: number;
    fullName: string;
    email: string;
    phone: string;
    role?: string;
  } | null> {
    try {
      const payload = (await apiClient.get<any>(`/users/${userId}`).catch(() => null)) as any;
      if (!payload) return null;
      const data = payload?.data ?? payload;
      if (!data || !data.id) {
        return null;
      }

      const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();

      return {
        id: Number(data.id),
        fullName: fullName || `User #${data.id}`,
        email: data.email || "",
        phone: data.phone_number || data.phone || "",
        role: data.role,
      };
    } catch {
      return null;
    }
  }

  private async ownerBookingAction(
    bookingId: number,
    action: "owner-confirm" | "owner-cancel" | "owner-reject",
    reason: string
  ): Promise<OwnerBookingActionResponse> {
    const endpoint = API_CONFIG.BOOKING_ENDPOINTS.UPDATE_BOOKING.replace(
      ":id",
      String(bookingId)
    );

    return apiClient.patch<OwnerBookingActionResponse>(endpoint, { reason }, {
      params: { action },
    });
  }

  /**
   * Get player bookings with pagination
   */
  async getPlayerBookings(
    params: GetPlayerBookingsParams
  ): Promise<{ bookings: Booking[]; total: number; offset: number; limit: number }> {
    try {
      const { playerId, tournamentId, offset = 0, limit = 30 } = params;

      const queryParams: Record<string, string> = {
        offset: String(offset),
        limit: String(limit),
      };
      if (tournamentId != null && Number.isFinite(Number(tournamentId))) {
        queryParams.tournament_id = String(tournamentId);
      }

      const query = new URLSearchParams(queryParams).toString();
      const path = API_CONFIG.BOOKING_ENDPOINTS.GET_PLAYER_BOOKINGS.replace(
        ":playerId",
        playerId.toString()
      );

      const response = await apiClient.get<GetPlayerBookingsResponse>(`${path}?${query}`);

      if (!response.data) {
        throw new Error("Không tải được danh sách đặt sân của bạn");
      }

      return response.data;
    } catch (error) {
      console.error("Error getting player bookings:", error);
      throw error;
    }
  }

  /**
   * Get booking by ID
   */
  async getBookingById(bookingId: number): Promise<Booking> {
    const endpoint = API_CONFIG.BOOKING_ENDPOINTS.GET_BOOKING.replace(":id", bookingId.toString());

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await apiClient.get<{ data: Booking }>(endpoint);

        if (!response.data) {
          throw new Error("Không tải được chi tiết đặt sân");
        }

        console.log("[BOOKING SERVICE] Booking detail success:", {
          id: response.data.id,
          status: response.data.status,
          total_price: response.data.total_price,
          attempt,
        });

        return response.data;
      } catch (error: any) {
        const message = error?.message || "";
        const is503 = message.includes("503") || message.includes("Service Unavailable");

        console.error("Error getting booking:", { bookingId, attempt, message });

        if (!is503 || attempt === 2) {
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, 700));
      }
    }

    throw new Error("Không tải được chi tiết đặt sân");
  }

  /**
   * Create booking
   */
  async createBooking(payload: CreateBookingPayload): Promise<Booking> {
    try {
      const response = await apiClient.post<CreateBookingResponse>(
        API_CONFIG.BOOKING_ENDPOINTS.CREATE_BOOKING,
        payload
      );

      if (response.errors?.code) {
        const message = Array.isArray(response.errors.msg)
          ? response.errors.msg.join(", ")
          : "Đặt sân thất bại";
        throw new Error(message);
      }

      if (!response.data) {
        throw new Error("Đặt sân thất bại");
      }

      return response.data;
    } catch (error) {
      console.error("Error creating booking:", error);
      throw error;
    }
  }

  /**
   * Get owner bookings with pagination
   */
  async getOwnerBookings(
    params: GetOwnerBookingsParams
  ): Promise<{ bookings: Booking[]; total: number; offset: number; limit: number }> {
    try {
      const { clusterId, fieldId, status, offset = 0, limit = 30 } = params as any;

      const queryParams: Record<string, string | number> = {
        offset,
        limit,
      };

      if (clusterId && Number.isFinite(Number(clusterId))) {
        queryParams.cluster_id = clusterId;
      }

      if (fieldId && Number.isFinite(Number(fieldId))) {
        queryParams.field_id = fieldId;
      }
      if (status) {
        queryParams.status = status;
      }

      const result = await apiClient.get<GetOwnerBookingsResponse>(
        API_CONFIG.BOOKING_ENDPOINTS.GET_OWNER_BOOKINGS,
        { params: queryParams }
      );
      if (!result.data) {
        throw new Error("Không tải được danh sách đặt sân của chủ sân");
      }

      return result.data;
    } catch (error) {
      console.error("Error getting owner bookings:", error);
      throw error;
    }
  }

  async ownerConfirmBooking(
    bookingId: number,
    reason: string = "Chủ sân đã xác nhận đặt sân"
  ): Promise<OwnerBookingActionResponse> {
    return this.ownerBookingAction(bookingId, "owner-confirm", reason);
  }

  async ownerCancelBooking(
    bookingId: number,
    reason: string = "Chủ sân đã hủy đặt sân"
  ): Promise<OwnerBookingActionResponse> {
    return this.ownerBookingAction(bookingId, "owner-cancel", reason);
  }

  async ownerRejectBooking(
    bookingId: number,
    reason: string = "Chủ sân đã từ chối đặt sân"
  ): Promise<OwnerBookingActionResponse> {
    return this.ownerBookingAction(bookingId, "owner-reject", reason);
  }

  async getZaloPayOrderUrl(bookingId: number): Promise<string> {
    const endpoint = API_CONFIG.PAYMENT_ENDPOINTS.CREATE_ZALOPAY_ORDER.replace(
      ":bookingId",
      String(bookingId)
    );
    console.log("[BOOKING SERVICE] GET ZaloPay order, bookingId:", bookingId);
    const result = await apiClient.get<ZaloPayPaymentResponse>(endpoint);
    if (!result.data?.order_url) {
      throw new Error("Không lấy được link thanh toán ZaloPay");
    }

    console.log("[BOOKING SERVICE] ZaloPay order success:", {
      app_trans_id: result.data.app_trans_id,
      amount: result.data.amount,
      has_order_url: !!result.data.order_url,
    });

    return result.data.order_url;
  }
}

export const bookingService = new BookingService();
export default bookingService;
