import apiClient from "../utils/api.client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_CONFIG from "../config/api.config";
import {
  ImageItem,
  ImageType,
  GetImagesResponse,
  UploadImageResponse,
  DeleteImageResponse,
} from "../types/image.types";

const IMAGE_RULES: Record<
  ImageType,
  {
    maxSizeBytes: number;
    allowedMimeTypes: string[];
    requiresEntityId: boolean;
  }
> = {
  avatar: {
    maxSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    requiresEntityId: false,
  },
  qr_code: {
    maxSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    requiresEntityId: false,
  },
  field: {
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    requiresEntityId: true,
  },
  cluster: {
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    requiresEntityId: true,
  },
};

class ImageService {
  async getImagesByContext(type: ImageType, entityId: number): Promise<ImageItem[]> {
    const response = await apiClient.get<GetImagesResponse>("/images", {
      params: {
        type,
        entity_id: entityId,
      },
    });

    return response.data?.images ?? [];
  }

  async getFirstImageUrl(type: ImageType, entityId: number): Promise<string | null> {
    const images = await this.getImagesByContext(type, entityId);
    return images[0]?.url ?? null;
  }

  async getAvatarUrl(userId: number): Promise<string | null> {
    return this.getFirstImageUrl("avatar", userId);
  }

  async getQrCodeUrl(userId: number): Promise<string | null> {
    return this.getFirstImageUrl("qr_code", userId);
  }

  async getFieldImages(fieldId: number): Promise<ImageItem[]> {
    return this.getImagesByContext("field", fieldId);
  }

  async getClusterImages(clusterId: number): Promise<ImageItem[]> {
    return this.getImagesByContext("cluster", clusterId);
  }

  async uploadImage(
    type: ImageType,
    fileUri: string,
    fileName?: string,
    mimeType?: string,
    entityId?: number,
    fileSizeBytes?: number
  ): Promise<ImageItem> {
    const token = await AsyncStorage.getItem("authToken");
    if (!token) {
      throw new Error("Vui lòng đăng nhập lại để tải ảnh lên");
    }

    const rules = IMAGE_RULES[type];
    const normalizedMimeType = (mimeType || "image/jpeg").toLowerCase();

    if (!rules.allowedMimeTypes.includes(normalizedMimeType)) {
      throw new Error(
        `Định dạng ảnh không hợp lệ cho ${type}. Hỗ trợ: ${rules.allowedMimeTypes
          .map((value) => value.replace("image/", ""))
          .join(", ")}`
      );
    }

    if (typeof fileSizeBytes === "number" && fileSizeBytes > rules.maxSizeBytes) {
      throw new Error(
        `Kích thước ảnh vượt quá giới hạn ${Math.round(rules.maxSizeBytes / (1024 * 1024))}MB`
      );
    }

    if (rules.requiresEntityId && (!Number.isFinite(entityId) || (entityId as number) <= 0)) {
      throw new Error(`Thiếu mã đối tượng (entity_id) hợp lệ cho loại tải ảnh: ${type}`);
    }

    const formData = new FormData();
    formData.append("file", {
      uri: fileUri,
      name: fileName || `upload-${Date.now()}.jpg`,
      type: normalizedMimeType,
    } as any);

    const params = new URLSearchParams({
      type,
    });

    if (rules.requiresEntityId && typeof entityId === "number") {
      params.append("entity_id", String(entityId));
    }

    const response = await fetch(
      `${API_CONFIG.BASE_URL}/images?${params.toString()}`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    const payload = (await response.json().catch(() => ({}))) as Partial<UploadImageResponse>;
    if (!response.ok || !payload?.data?.url) {
      const message =
        payload?.errors?.msg?.[0] ||
        `Upload image failed: ${response.status} ${response.statusText}`;
      throw new Error(message);
    }

    return payload.data;
  }

  async deleteImage(type: "field" | "cluster", imageId: number, entityId: number): Promise<void> {
    if (!Number.isFinite(imageId) || imageId <= 0) {
      throw new Error("Mã ảnh không hợp lệ");
    }

    if (!Number.isFinite(entityId) || entityId <= 0) {
      throw new Error("Mã đối tượng không hợp lệ");
    }

    await apiClient.delete<DeleteImageResponse>(`/images/${imageId}`, {
      params: {
        type,
        entity_id: entityId,
      },
    });
  }
}

export const imageService = new ImageService();
export default imageService;
