/**
 * Cluster (Stadium) Types
 */

export interface Cluster {
  id: number;
  name: string;
  sport_types?: {
    id: number;
    name: string;
    created_at?: string;
  }[];
  street: string;
  district: string;
  city: string;
  status: "active" | "inactive";
  open_time: string; // HH:MM:SS
  close_time: string; // HH:MM:SS
  owner_id: number;
  is_accepted: boolean;
  accepted_by: number | null;
  approval_token?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateClusterRequest {
  name: string;
  sport_type_ids: number[];
  street: string;
  district: string;
  city: string;
  open_time: string;
  close_time: string;
}

export interface UpdateClusterRequest {
  name?: string;
  sport_type_ids?: number[];
  street?: string;
  district?: string;
  city?: string;
  open_time?: string;
  close_time?: string;
  status?: "active" | "inactive";
}

export interface CreateClusterResponse {
  data: Cluster;
  api_version: string;
  errors: {
    msg: string[];
    code: null | string;
  };
}

export interface GetClustersResponse {
  data: {
    clusters: Cluster[];
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

export interface ClusterListPayload {
  clusters: Cluster[];
  total: number;
  offset: number;
  limit: number;
}

export interface GetClustersQuery {
  is_accepted?: "not_handled" | "true" | "false" | boolean;
  offset?: number;
  limit?: number;
}

export interface SearchClustersQuery {
  search?: string;
  sport_type_id?: number;
  offset?: number;
  limit?: number;
}
