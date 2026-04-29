import apiClient from "../utils/api.client";
import API_CONFIG from "../config/api.config";
import {
  CreatePaymentPayload,
  PaymentCreationResult,
  GetPlayerPaymentsParams,
  GetPlayerPaymentsResponse,
  GetOwnerPaymentsResponse,
  PaymentItem,
  RevenuePeriod,
  OwnerRevenueData,
  ZaloPayOrderData,
} from "../types/payment.types";

type ApiEnvelope<T> = {
  data: T;
  api_version: string;
  errors: {
    msg: string[];
    code: null | string;
  };
};

class PaymentService {
  private unwrapData<T>(payload: T | ApiEnvelope<T>): T {
    const candidate = payload as ApiEnvelope<T>;
    if (candidate && typeof candidate === "object" && "data" in candidate) {
      return candidate.data;
    }

    return payload as T;
  }

  async getPlayerPayments(
    params: GetPlayerPaymentsParams
  ): Promise<{ payments: PaymentItem[]; total: number; offset: number; limit: number }> {
    const { playerId, offset = 0, limit = 30 } = params;

    const endpoint = API_CONFIG.PAYMENT_ENDPOINTS.GET_PLAYER_PAYMENTS.replace(
      ":playerId",
      String(playerId)
    );

    const response = await apiClient.get<GetPlayerPaymentsResponse | ApiEnvelope<GetPlayerPaymentsResponse["data"]>>(endpoint, {
      params: { offset, limit },
    });

    const data = this.unwrapData<GetPlayerPaymentsResponse["data"] | undefined>(response as any);

    if (!data) {
      throw new Error("Không thể lấy danh sách thanh toán");
    }

    if ("payments" in data) {
      return data;
    }

    if ((response as GetPlayerPaymentsResponse).data) {
      return (response as GetPlayerPaymentsResponse).data;
    }

    throw new Error("Không thể lấy danh sách thanh toán");
  }

  async getOrganizerPayments(params: {
    organizerId: number;
    offset?: number;
    limit?: number;
  }): Promise<{ payments: PaymentItem[]; total: number; offset: number; limit: number }> {
    const { organizerId, offset = 0, limit = 30 } = params;
    // Backend currently serves organizer payment list through the player payments endpoint.
    const fallbackEndpoint = API_CONFIG.PAYMENT_ENDPOINTS.GET_PLAYER_PAYMENTS.replace(
      ":playerId",
      String(organizerId)
    );

    const fallbackResponse = await apiClient.get<
      GetPlayerPaymentsResponse | ApiEnvelope<GetPlayerPaymentsResponse["data"]>
    >(fallbackEndpoint, {
      params: { offset, limit },
    });

    const fallbackData = this.unwrapData<GetPlayerPaymentsResponse["data"] | undefined>(
      fallbackResponse as any
    );

    if (fallbackData && "payments" in fallbackData) {
      return fallbackData;
    }

    throw new Error("Không thể lấy danh sách thanh toán của organizer");
  }

  async getOwnerPayments(params?: {
    offset?: number;
    limit?: number;
  }): Promise<{ payments: PaymentItem[]; total: number; offset: number; limit: number }> {
    const offset = params?.offset ?? 0;
    const limit = params?.limit ?? 30;

    const response = await apiClient.get<
      GetOwnerPaymentsResponse | ApiEnvelope<GetOwnerPaymentsResponse["data"]>
    >(API_CONFIG.PAYMENT_ENDPOINTS.GET_OWNER_PAYMENTS, {
      params: { offset, limit },
    });

    const data = this.unwrapData<GetOwnerPaymentsResponse["data"] | undefined>(response as any);

    if (!data || !("payments" in data)) {
      throw new Error("Không thể lấy danh sách thanh toán của chủ sân");
    }

    return data;
  }

  async createPayment(payload: CreatePaymentPayload): Promise<PaymentCreationResult> {
    const response = await apiClient.post<
      PaymentCreationResult | ApiEnvelope<PaymentCreationResult>
    >(API_CONFIG.PAYMENT_ENDPOINTS.CREATE_PAYMENT, payload);

    const data = this.unwrapData<PaymentCreationResult>(response);
    if (!data) {
      throw new Error("Không thể tạo thanh toán");
    }

    return data;
  }

  async getZaloPayOrderUrl(bookingId: number): Promise<string> {
    const endpoint = API_CONFIG.PAYMENT_ENDPOINTS.CREATE_ZALOPAY_ORDER.replace(
      ":bookingId",
      String(bookingId)
    );

    const response = await apiClient.get<
      ZaloPayOrderData | ApiEnvelope<ZaloPayOrderData>
    >(endpoint);

    const data = this.unwrapData<ZaloPayOrderData>(response);

    if (!data?.order_url) {
      throw new Error("Không lấy được link thanh toán ZaloPay");
    }

    return data.order_url;
  }

  async getTournamentZaloPayOrder(tournamentId: number): Promise<ZaloPayOrderData> {
    const endpoint = API_CONFIG.PAYMENT_ENDPOINTS.CREATE_TOURNAMENT_ZALOPAY_ORDER.replace(
      ":tournamentId",
      String(tournamentId)
    );

    const response = await apiClient.get<
      ZaloPayOrderData | ApiEnvelope<ZaloPayOrderData>
    >(endpoint);

    const data = this.unwrapData<ZaloPayOrderData>(response);

    if (!data?.order_url) {
      throw new Error("Không lấy được link thanh toán giải đấu qua ZaloPay");
    }

    return data;
  }

  async getOwnerRevenue(period: RevenuePeriod = "month"): Promise<OwnerRevenueData> {
    const response = await apiClient.get<OwnerRevenueData | ApiEnvelope<OwnerRevenueData>>(
      API_CONFIG.PAYMENT_ENDPOINTS.GET_OWNER_REVENUE,
      {
        params: { period },
      }
    );

    const data = this.unwrapData<OwnerRevenueData>(response);
    if (!data) {
      throw new Error("Không lấy được doanh thu của chủ sân");
    }

    return data;
  }
}

export const paymentService = new PaymentService();
export default paymentService;
