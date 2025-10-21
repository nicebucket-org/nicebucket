import {
  Connection,
  ConnectionConfig,
  CreateFolderOptions,
  DeleteFolderOptions,
  DeleteObjectsOptions,
  DownloadFolderOptions,
  DownloadObjectOptions,
  DownloadObjectsOptions,
  ListObjectsOptions,
  MoveObjectsOptions,
  Result,
  UploadObjectsOptions,
  commands as tauriCommands,
} from "@/bindings";
import { mockCommands } from "@/mocks/mock-commands";
import { isTauri } from "./utils";

/**
 * This maps each command to a new function returning just the data
 * of its result type. We wrap the functions here so we can have
 * unified error handling via react-query.
 */
type Command = keyof typeof tauriCommands;

type ExtractedResultData<R> = R extends { status: "ok"; data: infer T }
  ? T
  : never;

export type CommandMap = {
  [K in Command]: (
    ...args: Parameters<(typeof tauriCommands)[K]>
  ) => Promise<
    ExtractedResultData<Awaited<ReturnType<(typeof tauriCommands)[K]>>>
  >;
};

export function useCommands(): { commands: CommandMap } {
  async function unwrap<T>(resultPromise: Promise<Result<T, unknown>>) {
    const result = await resultPromise;

    if (result.status === "error") {
      console.error(result.error);
      throw new Error("Unwrapping failed");
    }

    return result.data;
  }

  async function connectToS3(opts: ConnectionConfig) {
    const result = tauriCommands.connectToS3(opts);
    return unwrap(result);
  }

  async function listBuckets(connection: Connection) {
    const result = tauriCommands.listBuckets(connection);
    return unwrap(result);
  }

  async function listObjects(opts: ListObjectsOptions) {
    const result = tauriCommands.listObjects(opts);
    return unwrap(result);
  }

  async function downloadObject(opts: DownloadObjectOptions) {
    const result = tauriCommands.downloadObject(opts);
    return unwrap(result);
  }

  async function downloadObjects(opts: DownloadObjectsOptions) {
    const result = tauriCommands.downloadObjects(opts);
    return unwrap(result);
  }

  async function deleteObjects(opts: DeleteObjectsOptions) {
    const result = tauriCommands.deleteObjects(opts);
    return unwrap(result);
  }

  async function downloadFolder(opts: DownloadFolderOptions) {
    const result = tauriCommands.downloadFolder(opts);
    return unwrap(result);
  }

  async function uploadObjects(opts: UploadObjectsOptions) {
    const result = tauriCommands.uploadObjects(opts);
    return unwrap(result);
  }

  async function createFolder(opts: CreateFolderOptions) {
    const result = tauriCommands.createFolder(opts);
    return unwrap(result);
  }

  async function deleteFolder(opts: DeleteFolderOptions) {
    const result = tauriCommands.deleteFolder(opts);
    return unwrap(result);
  }

  async function moveObjects(opts: MoveObjectsOptions) {
    const result = tauriCommands.moveObjects(opts);
    return unwrap(result);
  }

  async function saveConnection(config: ConnectionConfig) {
    const result = tauriCommands.saveConnection(config);
    return unwrap(result);
  }

  async function loadSavedConnections() {
    const result = tauriCommands.loadSavedConnections();
    return unwrap(result);
  }

  async function deleteSavedConnection(uuid: string) {
    const result = tauriCommands.deleteSavedConnection(uuid);
    return unwrap(result);
  }

  async function isConnectionSaved(uuid: string) {
    const result = tauriCommands.isConnectionSaved(uuid);
    return unwrap(result);
  }

  async function isConnectionDuplicate(config: ConnectionConfig) {
    const result = tauriCommands.isConnectionDuplicate(config);
    return unwrap(result);
  }

  const commands: CommandMap = {
    connectToS3,
    listBuckets,
    listObjects,
    downloadObject,
    downloadObjects,
    deleteObjects,
    downloadFolder,
    deleteFolder,
    uploadObjects,
    createFolder,
    moveObjects,
    saveConnection,
    loadSavedConnections,
    deleteSavedConnection,
    isConnectionSaved,
    isConnectionDuplicate,
  };

  return {
    commands: isTauri ? commands : mockCommands,
  };
}
