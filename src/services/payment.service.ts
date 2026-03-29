import apiClient from "../utils/api.client";
import API_CONFIG from "../config/api.config";
import {
  CreatePaymentPayload,
  PaymentCreationResult,
  GetPlayerPaymentsParams,
  GetPlayerPaymentsResponse,
  PaymentItem,
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
}

export const paymentService = new PaymentService();
export default paymentService;
