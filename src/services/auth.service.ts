/**
 * Authentication Service
 * Xử lý tất cả các logic liên quan đến authentication
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../utils/api.client";
import API_CONFIG from "../config/api.config";
import { 
  LoginRequest, 
  LoginResponse, 
  SignupRequest, 
  SignupResponse, 
  ChangePasswordRequest,
  ChangePasswordResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResendVerificationEmailRequest,
  ResendVerificationEmailResponse,
  User,
  UserProfile,
  GetMeResponse
} from "../types/auth.types";

const STORAGE_KEYS = {
  AUTH_TOKEN: "authToken",
  REFRESH_TOKEN: "refreshToken",
  USER_DATA: "userData",
};

class AuthService {
  private unwrapData<T>(payload: T | { data: T }): T {
    const candidate = payload as { data?: T };
    if (candidate && typeof candidate === "object" && "data" in candidate && candidate.data) {
      return candidate.data;
    }

    return payload as T;
  }

  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<{ user: User; tokens: { access_token: string; refresh_token: string } }> {
    try {
      const response = await apiClient.post<LoginResponse>(
        API_CONFIG.AUTH_ENDPOINTS.LOGIN,
        credentials
      );

      if (!response.data?.access_token) {
        throw new Error("No access token received from server");
      }

      // Extract user data
      const user: User = {
        user_id: response.data.user_id,
        email: response.data.email,
        role: response.data.role,
        player_id: response.data.player_id,
      };

      // Save tokens and user data
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.access_token),
        AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.refresh_token),
        AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user)),
        response.data.player_id ? AsyncStorage.setItem("playerId", response.data.player_id.toString()) : Promise.resolve(),
      ]);

      // Set token for future requests
      apiClient.setAuthToken(response.data.access_token);

      return {
        user,
        tokens: {
          access_token: response.data.access_token,
          refresh_token: response.data.refresh_token,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sign up new user
   */
  async signup(data: SignupRequest): Promise<{ user: SignupResponse["data"] }> {
    try {
      console.log("[AUTH][SIGNUP] Request start", {
        email: data?.email,
        role: data?.role,
      });

      const response = await apiClient.post<SignupResponse | SignupResponse["data"]>(
        API_CONFIG.AUTH_ENDPOINTS.SIGNUP,
        data
      );

      const signupData = this.unwrapData<SignupResponse["data"]>(response);

      if (!signupData?.email) {
        throw new Error("Invalid signup response");
      }

      console.log("[AUTH][SIGNUP] Request success", {
        email: signupData.email,
      });

      return {
        user: signupData,
      };
    } catch (error) {
      console.error("[AUTH][SIGNUP] Request failed", {
        email: data?.email,
        error,
      });
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      // Call logout endpoint if needed
      // await apiClient.post(API_CONFIG.AUTH_ENDPOINTS.LOGOUT);

      // Clear local storage
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA),
        AsyncStorage.removeItem("userProfile"),
        AsyncStorage.removeItem("userRole"),
        AsyncStorage.removeItem("playerId"),
      ]);

      // Clear auth token from client
      apiClient.clearAuthToken();
    } catch (error) {
      // Even if logout fails, clear local data
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA),
        AsyncStorage.removeItem("userProfile"),
        AsyncStorage.removeItem("userRole"),
        AsyncStorage.removeItem("playerId"),
      ]);
      apiClient.clearAuthToken();
      throw error;
    }
  }

  /**
   * Get stored user data
   */
  async getStoredUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error("Error getting stored user:", error);
      return null;
    }
  }

  /**
   * Get stored token
   */
  async getStoredToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    } catch (error) {
      console.error("Error getting stored token:", error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getStoredToken();
    return !!token;
  }

  /**
   * Restore session (useful when app starts)
   */
  async restoreSession(): Promise<{ user: User | null; token: string | null }> {
    try {
      const [token, user] = await Promise.all([
        this.getStoredToken(),
        this.getStoredUser(),
      ]);

      if (token) {
        apiClient.setAuthToken(token);
      }

      return { token, user };
    } catch (error) {
      console.error("Error restoring session:", error);
      return { token: null, user: null };
    }
  }

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordRequest): Promise<boolean> {
    try {
      const response = await apiClient.patch<ChangePasswordResponse>(
        API_CONFIG.AUTH_ENDPOINTS.UPDATE_PASSWORD,
        data
      );

      if (!response.data) {
        throw new Error("Failed to change password");
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Forgot password - send reset email
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<string> {
    try {
      console.log("[AUTH][FORGOT_PASSWORD] Request start", {
        email: data?.email,
      });

      const response = await apiClient.post<ForgotPasswordResponse>(
        API_CONFIG.AUTH_ENDPOINTS.FORGOT_PASSWORD,
        data
      );

      const payload = response.data?.data;
      let message = "";

      if (payload === true) {
        message =
          "Email dat lai mat khau da duoc gui. Vui long kiem tra hop thu den va ca thu muc spam.";
      } else if (typeof payload === "object" && payload?.message) {
        message = payload.message;
      }

      if (!message) {
        throw new Error("Khong the gui email dat lai mat khau");
      }

      console.log("[AUTH][FORGOT_PASSWORD] Request success", {
        email: data?.email,
        message,
      });

      return message;
    } catch (error) {
      console.error("[AUTH][FORGOT_PASSWORD] Request failed", {
        email: data?.email,
        error,
      });
      throw error;
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(
    data: ResendVerificationEmailRequest
  ): Promise<string> {
    try {
      const response = await apiClient.post<ResendVerificationEmailResponse>(
        API_CONFIG.AUTH_ENDPOINTS.RESEND_VERIFICATION_EMAIL,
        data
      );

      if (!response.data?.message) {
        throw new Error("Failed to resend verification email");
      }

      return response.data.message;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current user profile
   */
  async getMe(): Promise<UserProfile> {
    try {
      const response = await apiClient.get<GetMeResponse>(
        API_CONFIG.AUTH_ENDPOINTS.ME
      );

      if (!response.data) {
        throw new Error("Failed to get user profile");
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export const authService = new AuthService();
export default authService;
