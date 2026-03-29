export type PaymentStatus =
  | "pending"
  | "confirmed"
  | "success"
  | "completed"
  | "expired"
  | "failed"
  | "canceled";
export type PaymentType = "deposit" | "remaining";

export interface PaymentItem {
  id: number;
  amount: number;
  status: PaymentStatus | string;
  payment_type: PaymentType | string;
  expires_at: string | null;
  booking_id: number;
  created_at: string;
  updated_at: string;
}

export interface GetPlayerPaymentsResponse {
  data: {
    payments: PaymentItem[];
    total: number;
    offset: number;
    limit: number;
  };
  api_version: string;
  errors: {
    msg: string[];
    code: null | string;
  };
}

export interface GetPlayerPaymentsParams {
  playerId: number;
  offset?: number;
  limit?: number;
}

export interface CreatePaymentPayload {
  bookingId: number;
  paymentMethod: string;
  amount: number;
  note?: string;
}

export interface PaymentCreationResult {
  id?: number;
  booking_id?: number;
  amount?: number;
  status?: string;
  payment_method?: string;
  order_url?: string | null;
  [key: string]: any;
}

export interface ZaloPayOrderData {
  app_trans_id: string;
  order_url: string;
  qr_code: string | null;
  amount: number;
  description: string;
}
