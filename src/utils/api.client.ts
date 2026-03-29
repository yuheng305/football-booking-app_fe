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

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
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
      const response = await fetch(url, requestOptions);
      console.log(`[API] Response status: ${response.status}`);

      // Handle response
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[API] Error response:`, errorData);
        const message =
          errorData?.errors?.msg?.[0] ||
          errorData?.detail ||
          errorData?.message ||
          `API Error: ${response.status} ${response.statusText}`;
        throw new Error(
          message
        );
      }

      const data: T = await response.json();
      return data;
    } catch (error) {
      console.error(`[API] Request failed for ${url}:`, error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error("An unknown error occurred");
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
