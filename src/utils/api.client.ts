/**
 * API Client - Xử lý tất cả các HTTP requests
 */

import API_CONFIG from "../config/api.config";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ERROR_CODE_MAP: Record<string, string> = {
  EMAIL_NOT_VERIFIED: "Email chưa được xác thực. Vui lòng kiểm tra hộp thư và xác thực tài khoản!",
  INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng!",
  USER_NOT_FOUND: "Không tìm thấy người dùng!",
  EMAIL_ALREADY_EXISTS: "Email đã được sử dụng!",
  USERNAME_ALREADY_EXISTS: "Tên đăng nhập đã được sử dụng!",
  TOKEN_EXPIRED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!",
  INVALID_TOKEN: "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại!",
  UNAUTHORIZED: "Bạn không có quyền thực hiện thao tác này!",
  FORBIDDEN: "Bạn không có quyền truy cập!",
  NOT_FOUND: "Không tìm thấy dữ liệu!",
  VALIDATION_ERROR: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại!",
  BOOKING_NOT_AVAILABLE: "Khung giờ này đã được đặt hoặc không khả dụng!",
  PAYMENT_FAILED: "Thanh toán thất bại. Vui lòng thử lại!",
  INTERNAL_SERVER_ERROR: "Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau!",
  RATE_LIMIT_EXCEEDED: "Bạn thực hiện quá nhiều yêu cầu. Vui lòng thử lại sau!",
};

const ERROR_MSG_MAP: Array<[string, string]> = [
  ["email is not verified", "Email chưa được xác thực. Vui lòng kiểm tra hộp thư và xác thực tài khoản!"],
  ["invalid credentials", "Email hoặc mật khẩu không đúng!"],
  ["invalid email or password", "Email hoặc mật khẩu không đúng!"],
  ["user not found", "Không tìm thấy người dùng!"],
  ["email already exists", "Email đã được sử dụng!"],
  ["email already taken", "Email đã được sử dụng!"],
  ["username already exists", "Tên đăng nhập đã được sử dụng!"],
  ["token has expired", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!"],
  ["token expired", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!"],
  ["invalid token", "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại!"],
  ["unauthorized", "Bạn không có quyền thực hiện thao tác này!"],
  ["forbidden", "Bạn không có quyền truy cập!"],
  ["not found", "Không tìm thấy dữ liệu!"],
  ["validation error", "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại!"],
  ["internal server error", "Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau!"],
  ["network request failed", "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng!"],
];

function translateApiError(code?: string, msg?: string): string | null {
  if (code && ERROR_CODE_MAP[code]) {
    return ERROR_CODE_MAP[code];
  }
  if (msg) {
    const lower = msg.toLowerCase();
    for (const [pattern, translation] of ERROR_MSG_MAP) {
      if (lower.includes(pattern)) return translation;
    }
  }
  return null;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number>;
}

class ApiClient {
  private baseURL: string;
  private fallbackBaseURLs: string[];
  private defaultHeaders: Record<string, string>;
  private refreshTokenPromise: Promise<string | null> | null;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.fallbackBaseURLs = API_CONFIG.FALLBACK_BASE_URLS || [];
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

  private async tryRefreshAccessToken(baseURL = this.baseURL): Promise<string | null> {
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    this.refreshTokenPromise = (async () => {
      const refreshToken = await AsyncStorage.getItem("refreshToken");
      if (!refreshToken) {
        return null;
      }

      const refreshUrl = this.buildURL(API_CONFIG.AUTH_ENDPOINTS.REFRESH, undefined, baseURL);
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
  private buildURL(
    endpoint: string,
    params?: Record<string, string | number>,
    baseURL = this.baseURL
  ): string {
    let url = `${baseURL.replace(/\/+$/, "")}${endpoint}`;
    if (params) {
      const queryString = new URLSearchParams(
        Object.entries(params).map(([key, value]) => [key, String(value)])
      ).toString();
      url += `?${queryString}`;
    }
    return url;
  }

  private shouldTryNextBaseUrl(response: Response): boolean {
    return response.status === 408 || response.status === 429 || response.status >= 500;
  }

  /**
   * Generic request method
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const baseURLs = [this.baseURL, ...this.fallbackBaseURLs];
    const method = options.method || "GET";
    console.log(`[API] ${method} ${endpoint}`);

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

    let lastError: unknown = null;

    for (let index = 0; index < baseURLs.length; index++) {
      const baseURL = baseURLs[index];
      const url = this.buildURL(endpoint, options.params, baseURL);

      try {
        console.log(`[API] ${method} ${url}`);
        let response = await fetch(url, requestOptions);
        console.log(`[API] Response status: ${response.status}`);

        // 401: chuẩn hết hạn token; một số BE trả 403 cho JWT không hợp lệ / hết hạn
        const authLooksStale =
          (response.status === 401 || response.status === 403) &&
          !this.shouldSkipRefresh(endpoint);

        if (authLooksStale) {
          const refreshedAccessToken = await this.tryRefreshAccessToken(baseURL);

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
          if (this.shouldTryNextBaseUrl(response) && index < baseURLs.length - 1) {
            console.warn(
              `[API] ${response.status} from ${baseURL}, trying fallback ${baseURLs[index + 1]}`
            );
            lastError = new Error(`API Error: ${response.status} ${response.statusText}`);
            continue;
          }

          const errorData = await this.parseJson(response);
          console.error(`[API] Error response:`, errorData);
          const rawCode: string | undefined = errorData?.errors?.code;
          const rawMsg: string | undefined =
            errorData?.errors?.msg?.[0] ||
            errorData?.detail ||
            errorData?.message;
          const message =
            translateApiError(rawCode, rawMsg) ||
            rawMsg ||
            `Lỗi ${response.status}. Vui lòng thử lại!`;
          const terminalError = new Error(message) as Error & { skipFallback?: boolean };
          terminalError.skipFallback = true;
          throw terminalError;
        }

        const data: T = await response.json();
        return data;
      } catch (error) {
        console.error(`[API] Request failed for ${url}:`, error);
        if (error instanceof Error && (error as Error & { skipFallback?: boolean }).skipFallback) {
          throw new Error(error.message);
        }

        lastError = error;

        if (index < baseURLs.length - 1) {
          console.warn(`[API] Trying fallback ${baseURLs[index + 1]}`);
          continue;
        }
      }
    }

    if (lastError instanceof Error) {
      throw new Error(lastError.message);
    }
    throw new Error("Đã xảy ra lỗi không xác định");
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
