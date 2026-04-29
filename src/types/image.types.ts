export type ImageType = "avatar" | "qr_code" | "field" | "cluster";

export interface ImageItem {
  id: number | null;
  entity_id: number;
  type: ImageType;
  url: string;
  key: string | null;
  created_at: string | null;
}

export interface GetImagesResponse {
  data: {
    images: ImageItem[];
    total: number;
  };
  api_version: string;
  errors: {
    msg: string[];
    code: string | null;
  };
}

export interface UploadImageResponse {
  data: ImageItem;
  api_version: string;
  errors: {
    msg: string[];
    code: string | null;
  };
}

export interface DeleteImageResponse {
  data: null;
  api_version: string;
  errors: {
    msg: string[];
    code?: string | null;
  };
}
