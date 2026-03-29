/**
 * Club Types
 */

export interface Club {
  id: number;
  name: string;
  address: string;
  score: number;
  status: "active" | "inactive";
  player_id: number;
  created_at: string;
  updated_at: string;
}

export interface ClubMember {
  id: number;
  club_id: number;
  player_id: number;
  role: "captain" | "member";
  preferred_position?: string;
  player?: {
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    age?: number;
  };
  club?: {
    id: number;
    name: string;
    address: string;
    score: number;
    status: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface CreateClubRequest {
  name: string;
  address: string;
}

export interface CreateClubResponse {
  data: Club;
  api_version: string;
  errors: {
    msg: string[];
    code: null | string;
  };
}

export interface GetClubsResponse {
  data: {
    clubs: Club[];
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

export interface GetClubMembersResponse {
  data: {
    members: ClubMember[];
    total: number;
  };
  api_version: string;
  errors: {
    msg: string[];
    code: null | string;
  };
}

export interface JoinClubRequest {
  player_id: number;
}

export interface JoinClubResponse {
  data: {
    message: string;
  };
  api_version: string;
  errors: {
    msg: string[];
    code: null | string;
  };
}

export interface UpdateClubRequest {
  name?: string;
  address?: string;
  status?: "active" | "inactive";
  score?: number;
}

export interface UpdateClubResponse {
  data: Club;
  api_version: string;
  errors: {
    msg: string[];
    code: null | string;
  };
}
