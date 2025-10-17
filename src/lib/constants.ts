import { BucketProvider } from "@/bindings";

export const PROVIDERS: BucketProvider[] = ["S3", "R2", "Custom"] as const;

interface FileInformation {
  mimeType: string;
}

export const TEXT_FILE_EXTENSIONS = [
  ".txt",
  ".md",
  ".json",
  ".xml",
  ".html",
  ".css",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
] as const;

export const IMAGE_FILE_TYPE_MAP: Record<string, FileInformation> = {
  ".jpg": { mimeType: "image/jpeg" },
  ".jpeg": { mimeType: "image/jpeg" },
  ".png": { mimeType: "image/png" },
  ".gif": { mimeType: "image/gif" },
  ".bmp": { mimeType: "image/bmp" },
  ".webp": { mimeType: "image/webp" },
  ".svg": { mimeType: "image/svg+xml" },
} as const;

export const IMAGE_FILE_EXTENSIONS = Object.keys(IMAGE_FILE_TYPE_MAP);

export const STORAGE_CLASSES: Record<string, string> = {
  REDUCED_REDUNDANCY: "Reduced Redundancy Storage",
  EXPRESS_ONEZONE: "S3 Express One Zone",
  DEEP_ARCHIVE: "S3 Glacier Deep Archive",
  GLACIER: "S3 Glacier Flexible Retrieval",
  GLACIER_IR: "S3 Glacier Instant Retrieval",
  INTELLIGENT_TIERING: "S3 Intelligent-Tiering",
  ONEZONE_IA: "S3 One Zone-IA",
  STANDARD: "S3 Standard",
  STANDARD_IA: "S3 Standard-IA",
};
