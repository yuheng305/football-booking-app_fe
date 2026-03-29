import API_CONFIG from "../config/api.config";

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

class LegacyApiService {
  private baseURL = API_CONFIG.LEGACY_BASE_URL;

  constructor() {
    console.log("[LEGACY API] Initialized baseURL:", this.baseURL);
  }

  private async request<T>(
    endpoint: string,
    method: RequestMethod,
    token?: string,
    body?: Record<string, any>
  ): Promise<T> {
    const requestUrl = `${this.baseURL}${endpoint}`;
    console.log("[LEGACY API] Request", {
      method,
      url: requestUrl,
      hasToken: !!token,
    });
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log("[LEGACY API] Response status", {
      method,
      url: requestUrl,
      status: response.status,
      ok: response.ok,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message =
        errorData?.message ||
        errorData?.errors?.msg?.[0] ||
        `API Error: ${response.status} ${response.statusText}`;
      console.error("[LEGACY API] Error payload", {
        method,
        url: requestUrl,
        status: response.status,
        errorData,
        message,
      });
      throw new Error(message);
    }

    if (response.status === 204) {
      console.log("[LEGACY API] No content response", {
        method,
        url: requestUrl,
      });
      return {} as T;
    }

    const jsonData = (await response.json()) as T;
    console.log("[LEGACY API] Response body received", {
      method,
      url: requestUrl,
    });
    return jsonData;
  }

  getBookingById<T = any>(bookingId: string | number, token: string) {
    return this.request<T>(`/bookings/${bookingId}`, "GET", token);
  }

  completeBookingPayment<T = any>(bookingId: string | number, token: string) {
    return this.request<T>(`/bookings/${bookingId}/payment`, "PATCH", token, {
      status: "completed",
    });
  }

  createPayment<T = any>(
    payload: {
      bookingId: string;
      paymentMethod: string;
      amount: number;
      note?: string;
    },
    token: string
  ) {
    return this.request<T>("/payments", "POST", token, payload);
  }

  getFieldsByClusterAndTime<T = any>(
    clusterId: string,
    bookingDate: string,
    hourNumber: number,
    token: string
  ) {
    return this.request<T>(
      `/fields/${clusterId}?date=${bookingDate}&hour=${hourNumber}`,
      "GET",
      token
    );
  }

  getClusterStaticServices<T = any>(clusterId: string, token: string) {
    return this.request<T>(`/clusters/${clusterId}/static-services`, "GET", token);
  }

  getClusterDynamicServices<T = any>(clusterId: string, token: string) {
    return this.request<T>(`/clusters/${clusterId}/dynamic-services`, "GET", token);
  }

  updateFieldMaintainStatus<T = any>(fieldId: string, isMaintain: boolean, token: string) {
    return this.request<T>(`/fields/${fieldId}/status`, "PATCH", token, {
      isMaintain,
    });
  }

  deleteField<T = any>(fieldId: string, token: string) {
    return this.request<T>(`/fields/${fieldId}`, "DELETE", token);
  }

  createField<T = any>(
    payload: {
      name: string;
      openHour: number;
      closeHour: number;
      isMaintain: boolean;
      clusterId: string;
    },
    token: string
  ) {
    return this.request<T>("/fields", "POST", token, payload);
  }

  updateUserProfile<T = any>(
    userId: string,
    payload: Record<string, any>,
    token: string
  ) {
    return this.request<T>(`/users/${userId}`, "PUT", token, payload);
  }

  updateOwnerProfile<T = any>(
    ownerId: string,
    payload: Record<string, any>,
    token: string
  ) {
    return this.request<T>(`/owners/${ownerId}`, "PUT", token, payload);
  }

  changeOwnerPassword<T = any>(
    ownerId: string,
    payload: {
      oldPassword: string;
      newPassword: string;
      confirmNewPassword: string;
    },
    token: string
  ) {
    return this.request<T>(`/owners/${ownerId}/password`, "PATCH", token, payload);
  }
}

export const legacyApiService = new LegacyApiService();
export default legacyApiService;
