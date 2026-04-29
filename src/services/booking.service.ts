/**
 * Booking Service
 * Xử lý tất cả các logic liên quan đến bookings
 */

import apiClient from "../utils/api.client";
import API_CONFIG from "../config/api.config";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/users/${userId}`, {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json().catch(() => ({}))) as any;
      const data = payload?.data || payload;
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
    action: "owner-confirm" | "owner-cancel",
    reason: string
  ): Promise<OwnerBookingActionResponse> {
    const token = await AsyncStorage.getItem("authToken");

    if (!token) {
      throw new Error("Not authenticated");
    }

    const endpoint = API_CONFIG.BOOKING_ENDPOINTS.UPDATE_BOOKING.replace(
      ":id",
      String(bookingId)
    );
    const url = `${API_CONFIG.BASE_URL}${endpoint}?action=${action}`;

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message =
        errorData?.errors?.msg?.[0] ||
        errorData?.detail ||
        errorData?.message ||
        `API Error: ${response.status} ${response.statusText}`;
      throw new Error(message);
    }

    return (await response.json()) as OwnerBookingActionResponse;
  }

  /**
   * Get player bookings with pagination
   */
  async getPlayerBookings(
    params: GetPlayerBookingsParams
  ): Promise<{ bookings: Booking[]; total: number; offset: number; limit: number }> {
    try {
      const { playerId, offset = 0, limit = 30 } = params;
      
      const response = await apiClient.get<GetPlayerBookingsResponse>(
        `${API_CONFIG.BOOKING_ENDPOINTS.GET_PLAYER_BOOKINGS.replace(":playerId", playerId.toString())}?offset=${offset}&limit=${limit}`
      );

      if (!response.data) {
        throw new Error("Failed to get player bookings");
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
        console.log("[BOOKING SERVICE] GET booking detail", { bookingId, attempt });
        const response = await apiClient.get<{ data: Booking }>(endpoint);

        if (!response.data) {
          throw new Error("Failed to get booking");
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

    throw new Error("Failed to get booking");
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
      const { clusterId, offset = 0, limit = 30 } = params;
      const token = await AsyncStorage.getItem("authToken");

      if (!token) {
        throw new Error("Not authenticated");
      }

      const query = new URLSearchParams({
        cluster_id: String(clusterId),
        offset: String(offset),
        limit: String(limit),
      }).toString();

      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.BOOKING_ENDPOINTS.GET_OWNER_BOOKINGS}?${query}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message =
          errorData?.errors?.msg?.[0] ||
          errorData?.detail ||
          errorData?.message ||
          `API Error: ${response.status} ${response.statusText}`;
        throw new Error(message);
      }

      const result = (await response.json()) as GetOwnerBookingsResponse;
      if (!result.data) {
        throw new Error("Failed to get owner bookings");
      }

      return result.data;
    } catch (error) {
      console.error("Error getting owner bookings:", error);
      throw error;
    }
  }

  async ownerConfirmBooking(
    bookingId: number,
    reason: string = "Owner approved"
  ): Promise<OwnerBookingActionResponse> {
    return this.ownerBookingAction(bookingId, "owner-confirm", reason);
  }

  async ownerCancelBooking(
    bookingId: number,
    reason: string = "Owner canceled"
  ): Promise<OwnerBookingActionResponse> {
    return this.ownerBookingAction(bookingId, "owner-cancel", reason);
  }

  async getZaloPayOrderUrl(bookingId: number): Promise<string> {
    const token = await AsyncStorage.getItem("authToken");

    if (!token) {
      throw new Error("Not authenticated");
    }

    const url = `${API_CONFIG.BASE_URL}/payments/zalopay/${bookingId}`;
    console.log("[BOOKING SERVICE] GET ZaloPay order, bookingId:", bookingId);
    console.log("[BOOKING SERVICE] ZaloPay URL:", url);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message =
        errorData?.errors?.msg?.[0] ||
        errorData?.detail ||
        errorData?.message ||
        `API Error: ${response.status} ${response.statusText}`;
      throw new Error(message);
    }

    const result = (await response.json()) as ZaloPayPaymentResponse;
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
