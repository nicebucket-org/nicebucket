import { clsx, type ClassValue } from "clsx";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { twMerge } from "tailwind-merge";
import {
  IMAGE_FILE_EXTENSIONS,
  STORAGE_CLASSES,
  TEXT_FILE_EXTENSIONS,
} from "./constants";
dayjs.extend(relativeTime);

export const isTauri = !!window.__TAURI_INTERNALS__;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize({ bytes }: { bytes: number }) {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "kB", "MB", "GB", "TB", "PB"];
  const base = 1024;

  const exponent = Math.floor(Math.log(bytes) / Math.log(base));
  const unitIndex = Math.min(exponent, units.length - 1);
  const formattedValue = bytes / base ** unitIndex;
  const unit = units[unitIndex];

  // S3 and R2 both allow files up to 5 TB, so we should be safe using numbers
  // here, since Number.MAX_SAFE_INTEGER ~ 8PB. However, we might run into
  // issues when aggregating or when using custom S3 compatible storages.
  if (!unit) {
    console.error("File size too big, potential number overflow");
    return `${String(bytes)} B`;
  }

  return `${formattedValue.toFixed(2)} ${unit}`;
}

export function relativeTimeSince(date: string) {
  return dayjs().to(date);
}

export function isImageFile(fileName: string) {
  return IMAGE_FILE_EXTENSIONS.some((extension) =>
    fileName.toLowerCase().endsWith(extension),
  );
}

export function isTextFile(fileName: string) {
  return TEXT_FILE_EXTENSIONS.some((extension) =>
    fileName.toLowerCase().endsWith(extension),
  );
}

export function formatStorageClass(storageClass: string) {
  return STORAGE_CLASSES[storageClass] ?? null;
}
