/**
 * API Client - Xử lý tất cả các HTTP requests
 */

import API_CONFIG from "../config/api.config";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number>;
}

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private refreshTokenPromise: Promise<string | null> | null;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
    this.refreshTokenPromise = null;
  }

  /**
   * Set Authorization token
   */
  setAuthToken(token: string) {
    this.defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  /**
   * Clear Authorization token
   */
  clearAuthToken() {
    delete this.defaultHeaders["Authorization"];
  }

  private async parseJson(response: Response) {
    return response.json().catch(() => ({}));
  }

  private async clearStoredTokens() {
    await Promise.all([
      AsyncStorage.removeItem("authToken"),
      AsyncStorage.removeItem("refreshToken"),
    ]);
    this.clearAuthToken();
  }

  private shouldSkipRefresh(endpoint: string): boolean {
    return (
      endpoint === API_CONFIG.AUTH_ENDPOINTS.LOGIN ||
      endpoint === API_CONFIG.AUTH_ENDPOINTS.REFRESH ||
      endpoint === API_CONFIG.AUTH_ENDPOINTS.SIGNUP ||
      endpoint === API_CONFIG.AUTH_ENDPOINTS.FORGOT_PASSWORD ||
      endpoint === API_CONFIG.AUTH_ENDPOINTS.RESEND_VERIFICATION_EMAIL
    );
  }

  private async tryRefreshAccessToken(): Promise<string | null> {
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    this.refreshTokenPromise = (async () => {
      const refreshToken = await AsyncStorage.getItem("refreshToken");
      if (!refreshToken) {
        return null;
      }

      const refreshUrl = this.buildURL(API_CONFIG.AUTH_ENDPOINTS.REFRESH);
      const refreshResponse = await fetch(refreshUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!refreshResponse.ok) {
        await this.clearStoredTokens();
        return null;
      }

      const refreshPayload = (await this.parseJson(refreshResponse)) as any;
      const refreshData = refreshPayload?.data || refreshPayload;
      const nextAccessToken = refreshData?.access_token;
      const nextRefreshToken = refreshData?.refresh_token || refreshToken;

      if (!nextAccessToken) {
        await this.clearStoredTokens();
        return null;
      }

      await Promise.all([
        AsyncStorage.setItem("authToken", nextAccessToken),
        AsyncStorage.setItem("refreshToken", nextRefreshToken),
      ]);

      this.setAuthToken(nextAccessToken);
      return nextAccessToken;
    })()
      .catch(async (error) => {
        console.error("[API] Refresh token failed:", error);
        await this.clearStoredTokens();
        return null;
      })
      .finally(() => {
        this.refreshTokenPromise = null;
      });

    return this.refreshTokenPromise;
  }

  /**
   * Build full URL with query parameters
   */
  private buildURL(endpoint: string, params?: Record<string, string | number>): string {
    let url = `${this.baseURL}${endpoint}`;
    if (params) {
      const queryString = new URLSearchParams(
        Object.entries(params).map(([key, value]) => [key, String(value)])
      ).toString();
      url += `?${queryString}`;
    }
    return url;
  }

  /**
   * Generic request method
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = this.buildURL(endpoint, options.params);
    console.log(`[API] ${options.method || 'GET'} ${url}`);

    const optionHeaders = (options.headers ?? {}) as Record<string, string>;
    const hasAuthorizationHeader =
      !!this.defaultHeaders["Authorization"] ||
      !!optionHeaders["Authorization"] ||
      !!optionHeaders["authorization"];

    if (!hasAuthorizationHeader) {
      const storedToken = await AsyncStorage.getItem("authToken");
      if (storedToken) {
        this.setAuthToken(storedToken);
      }
    }

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...optionHeaders,
      },
    };

    try {
      let response = await fetch(url, requestOptions);
      console.log(`[API] Response status: ${response.status}`);

      // 401: chuẩn hết hạn token; một số BE trả 403 cho JWT không hợp lệ / hết hạn
      const authLooksStale =
        (response.status === 401 || response.status === 403) &&
        !this.shouldSkipRefresh(endpoint);

      if (authLooksStale) {
        const refreshedAccessToken = await this.tryRefreshAccessToken();

        if (refreshedAccessToken) {
          const retryHeaders = {
            ...(requestOptions.headers as Record<string, string>),
            Authorization: `Bearer ${refreshedAccessToken}`,
          };

          response = await fetch(url, {
            ...requestOptions,
            headers: retryHeaders,
          });
          console.log(`[API] Retry response status: ${response.status}`);
        }
      }

      // Handle response
      if (!response.ok) {
        const errorData = await this.parseJson(response);
        console.error(`[API] Error response:`, errorData);
        const message =
          errorData?.errors?.msg?.[0] ||
          errorData?.detail ||
          errorData?.message ||
          `API Error: ${response.status} ${response.statusText}`;
        throw new Error(message);
      }

      const data: T = await response.json();
      return data;
    } catch (error) {
      console.error(`[API] Request failed for ${url}:`, error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error("Đã xảy ra lỗi không xác định");
    }
  }

  /**
   * GET request
   */
  get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "GET",
    });
  }

  /**
   * POST request
   */
  post<T>(
    endpoint: string,
    body?: Record<string, any>,
    options: RequestOptions = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  put<T>(
    endpoint: string,
    body?: Record<string, any>,
    options: RequestOptions = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PATCH request
   */
  patch<T>(
    endpoint: string,
    body?: Record<string, any>,
    options: RequestOptions = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  delete<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "DELETE",
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
