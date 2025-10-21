import {
  BucketInfo,
  Connection,
  ObjectInfo,
  SavedConnectionConfig,
} from "@/bindings";
import { CommandMap } from "@/lib/use-commands";

export const mockCommands: CommandMap = {
  async connectToS3(): Promise<Connection> {
    return Promise.resolve({
      id: "123abc",
      label: "AWS Production",
      provider: "S3",
    });
  },

  async listBuckets(): Promise<BucketInfo[]> {
    return Promise.resolve([
      {
        provider: "S3",
        name: "mock-bucket-1",
        creation_date: "2023-01-01T00:00:00Z",
        region: "eu-central-1",
        endpoint_url: "https://s3.eu-central-1.amazonaws.com",
      },
      {
        provider: "R2",
        name: "mock-bucket-2",
        creation_date: "2023-02-01T00:00:00Z",
        region: "us-east-1",
        endpoint_url:
          "https://<ACCOUNT_ID>.r2.cloudflarestorage.com/mock-bucket-2",
      },
      {
        provider: "R2",
        name: "mock-bucket-3",
        creation_date: "2023-02-01T00:00:00Z",
        region: "us-east-1",
        endpoint_url:
          "https://<ACCOUNT_ID>.r2.cloudflarestorage.com/mock-bucket-3",
      },
      {
        provider: "R2",
        name: "mock-bucket-4",
        creation_date: "2023-02-01T00:00:00Z",
        region: "us-east-1",
        endpoint_url:
          "https://<ACCOUNT_ID>.r2.cloudflarestorage.com/mock-bucket-4",
      },
      {
        provider: "R2",
        name: "mock-bucket-5",
        creation_date: "2023-02-01T00:00:00Z",
        region: "us-east-1",
        endpoint_url:
          "https://<ACCOUNT_ID>.r2.cloudflarestorage.com/mock-bucket-5",
      },
      {
        provider: "R2",
        name: "mock-bucket-6",
        creation_date: "2023-02-01T00:00:00Z",
        region: "us-east-1",
        endpoint_url:
          "https://<ACCOUNT_ID>.r2.cloudflarestorage.com/mock-bucket-6",
      },
      {
        provider: "R2",
        name: "mock-bucket-7",
        creation_date: "2023-02-01T00:00:00Z",
        region: "us-east-1",
        endpoint_url:
          "https://<ACCOUNT_ID>.r2.cloudflarestorage.com/mock-bucket-7",
      },
      {
        provider: "R2",
        name: "mock-bucket-8",
        creation_date: "2023-02-01T00:00:00Z",
        region: "us-east-1",
        endpoint_url:
          "https://<ACCOUNT_ID>.r2.cloudflarestorage.com/mock-bucket-8",
      },
      {
        provider: "R2",
        name: "mock-bucket-9",
        creation_date: "2023-02-01T00:00:00Z",
        region: "us-east-1",
        endpoint_url:
          "https://<ACCOUNT_ID>.r2.cloudflarestorage.com/mock-bucket-9",
      },
    ]);
  },

  async listObjects(): Promise<ObjectInfo[]> {
    return Promise.resolve([
      {
        key: "documents/",
        size: null,
        last_modified: null,
        storage_class: null,
        is_folder: true,
        url: "https://mock-bucket.s3.amazonaws.com/documents/",
      },
      {
        key: "images/",
        size: null,
        last_modified: null,
        storage_class: null,
        is_folder: true,
        url: "https://mock-bucket.s3.amazonaws.com/images/",
      },
      {
        key: "README.txt",
        size: 4096,
        last_modified: "2024-08-27T12:00:00Z",
        storage_class: "STANDARD",
        is_folder: false,
        url: "https://mock-bucket.s3.amazonaws.com/README.txt",
      },
      {
        key: "test.jpg",
        size: 8192 * 1024,
        last_modified: "2025-06-27T12:00:00Z",
        storage_class: "STANDARD_IA",
        is_folder: false,
        url: "https://mock-bucket.s3.amazonaws.com/test.jpg",
      },
      {
        key: "form.pdf",
        size: 2048 * 1024 * 1024,
        last_modified: "2025-08-27T12:00:00Z",
        storage_class: "GLACIER",
        is_folder: false,
        url: "https://mock-bucket.s3.amazonaws.com/form.pdf",
      },
    ]);
  },

  async downloadObject(): Promise<number[]> {
    const myString = "Hello, World!";
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(myString);

    return Promise.resolve(Array.from(uint8Array));
  },

  async downloadObjects(): Promise<[string, number[]][]> {
    const myString = "Hello, World!";
    const encoder = new TextEncoder();
    const bytes = Array.from(encoder.encode(myString));

    return Promise.resolve([
      ["mock1.txt", bytes],
      ["mock2.txt", bytes],
    ]);
  },

  async deleteObjects(): Promise<null> {
    return Promise.resolve(null);
  },

  async downloadFolder(): Promise<number[]> {
    const myString = "Hello, World!";
    const encoder = new TextEncoder();
    const bytes = Array.from(encoder.encode(myString));

    return Promise.resolve(bytes);
  },

  async uploadObjects(): Promise<null> {
    return Promise.resolve(null);
  },

  async createFolder(): Promise<null> {
    return Promise.resolve(null);
  },

  async deleteFolder(): Promise<null> {
    return Promise.resolve(null);
  },

  async moveObjects(): Promise<null> {
    return Promise.resolve(null);
  },

  async saveConnection(): Promise<string> {
    return Promise.resolve("mock-uuid-123");
  },

  async loadSavedConnections(): Promise<SavedConnectionConfig[]> {
    return Promise.resolve([]);
  },

  async deleteSavedConnection(): Promise<null> {
    return Promise.resolve(null);
  },

  async isConnectionSaved(): Promise<boolean> {
    return Promise.resolve(false);
  },

  async isConnectionDuplicate(): Promise<boolean> {
    return Promise.resolve(false);
  },
};
