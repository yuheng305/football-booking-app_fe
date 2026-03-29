/**
 * Cluster Service
 * Xử lý tất cả các logic liên quan đến clusters (sân bóng)
 */

import apiClient from "../utils/api.client";
import API_CONFIG from "../config/api.config";
import {
  Cluster,
  CreateClusterRequest,
  CreateClusterResponse,
  GetClustersResponse,
  GetClustersQuery,
  SearchClustersQuery,
} from "../types/cluster.types";

class ClusterService {
  /**
   * Search clusters with pagination
   */
  async searchClusters(query: SearchClustersQuery = {}): Promise<{
    clusters: Cluster[];
    total: number;
    offset: number;
    limit: number;
  }> {
    try {
      const params: Record<string, string | number> = {
        offset: query.offset ?? 0,
        limit: query.limit ?? 30,
      };

      if (query.search) {
        params.search = query.search;
      }

      if (query.sport_type_id !== undefined) {
        params.sport_type_id = query.sport_type_id;
      }

      const response = await apiClient.get<GetClustersResponse>(
        API_CONFIG.CLUSTER_ENDPOINTS.SEARCH,
        { params }
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get list of clusters based on role and filters
   */
  async getClusters(query: GetClustersQuery = {}): Promise<{
    clusters: Cluster[];
    total: number;
    offset: number;
    limit: number;
  }> {
    try {
      const params: Record<string, string | number> = {};

      if (query.is_accepted !== undefined) {
        params.is_accepted = query.is_accepted === "true" ? "true" : query.is_accepted === "false" ? "false" : "not_handled";
      }
      if (query.offset !== undefined) {
        params.offset = query.offset;
      }
      if (query.limit !== undefined) {
        params.limit = query.limit;
      }

      const response = await apiClient.get<GetClustersResponse>(
        API_CONFIG.CLUSTER_ENDPOINTS.LIST,
        { params }
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get clusters that need approval (for admin)
   */
  async getNotHandledClusters(offset: number = 0, limit: number = 30): Promise<{
    clusters: Cluster[];
    total: number;
    offset: number;
    limit: number;
  }> {
    try {
      return await this.getClusters({
        is_accepted: "not_handled",
        offset,
        limit,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get accepted clusters
   */
  async getAcceptedClusters(offset: number = 0, limit: number = 30): Promise<{
    clusters: Cluster[];
    total: number;
    offset: number;
    limit: number;
  }> {
    try {
      return await this.getClusters({
        is_accepted: "true",
        offset,
        limit,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get rejected clusters
   */
  async getRejectedClusters(offset: number = 0, limit: number = 30): Promise<{
    clusters: Cluster[];
    total: number;
    offset: number;
    limit: number;
  }> {
    try {
      return await this.getClusters({
        is_accepted: "false",
        offset,
        limit,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new cluster (stadium)
   */
  async createCluster(data: CreateClusterRequest): Promise<Cluster> {
    try {
      const response = await apiClient.post<CreateClusterResponse>(
        API_CONFIG.CLUSTER_ENDPOINTS.CREATE,
        data
      );

      if (!response.data?.id) {
        throw new Error("Failed to create cluster");
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get single cluster by ID
   */
  async getCluster(clusterId: number): Promise<Cluster> {
    try {
      const endpoint = API_CONFIG.CLUSTER_ENDPOINTS.GET.replace(
        ":id",
        String(clusterId)
      );

      const response = await apiClient.get<CreateClusterResponse>(endpoint);

      if (!response.data?.id) {
        throw new Error("Cluster not found");
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update cluster
   */
  async updateCluster(
    clusterId: number,
    data: Partial<CreateClusterRequest>
  ): Promise<Cluster> {
    try {
      const endpoint = API_CONFIG.CLUSTER_ENDPOINTS.UPDATE.replace(
        ":id",
        String(clusterId)
      );

      const response = await apiClient.put<CreateClusterResponse>(
        endpoint,
        data
      );

      if (!response.data?.id) {
        throw new Error("Failed to update cluster");
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete cluster
   */
  async deleteCluster(clusterId: number): Promise<void> {
    try {
      const endpoint = API_CONFIG.CLUSTER_ENDPOINTS.DELETE.replace(
        ":id",
        String(clusterId)
      );

      await apiClient.delete(endpoint);
    } catch (error) {
      throw error;
    }
  }
}

export const clusterService = new ClusterService();
export default clusterService;
