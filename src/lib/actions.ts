import { BucketInfo } from "@/bindings";

export function copyToClipboard(text: string) {
  void navigator.clipboard.writeText(text);
}

export function copyBucketUrl(bucket: BucketInfo) {
  copyToClipboard(bucket.endpoint_url);
}

export function copyObjectUrl(url: string) {
  copyToClipboard(url);
}
