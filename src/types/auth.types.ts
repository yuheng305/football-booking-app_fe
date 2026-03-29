/**
 * Authentication Types
 */

export type UserRole = "admin" | "player" | "owner";

export interface User {
  user_id: number;
  email: string;
  role: UserRole;
  player_id?: number;
}

export interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  verified_token: string;
  is_verified: boolean;
  phone_number: string;
  refresh_token: string;
  refresh_token_expires_at: string;
  reset_password_token: string | null;
  reset_password_token_expires_at: string;
  role: UserRole;
  age: number;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface GetMeResponse {
  data: UserProfile;
  api_version: string;
  errors: {
    msg: string[];
    code: null | string;
  };
}

export interface LoginRequest {
  user_email: string;
  password: string;
}

export interface LoginResponse {
  data: {
    access_token: string;
    refresh_token: string;
    user_id: number;
    email: string;
    role: UserRole;
    player_id?: number;
  };
  api_version: string;
  errors: {
    msg: string[];
    code: null | string;
  };
}

export interface SignupRequest {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role: UserRole;
  phone_number: string;
  age: number;
  status: "active" | "inactive";
}

export interface SignupResponse {
  data: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    role: UserRole;
    age: number;
    status: "active" | "inactive";
    is_verified: boolean;
    created_at: string;
    updated_at: string;
  };
  api_version: string;
  errors: {
    msg: string[];
    code: null | string;
  };
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
  confirmation_password: string;
}

export interface ChangePasswordResponse {
  data: boolean;
  api_version: string;
  errors: {
    msg: string[];
    code: null | string;
  };
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  data: {
    message: string;
  };
  api_version: string;
  errors: {
    msg: string[];
    code: null | string;
  };
}

export interface ResendVerificationEmailRequest {
  email: string;
}

export interface ResendVerificationEmailResponse {
  data: {
    message: string;
  };
  api_version: string;
  errors: {
    msg: string[];
    code: null | string;
  };
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
