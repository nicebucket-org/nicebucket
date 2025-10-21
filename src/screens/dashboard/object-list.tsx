import { BucketInfo, Connection, ObjectInfo } from "@/bindings";
import { FileTree } from "@/components/file-tree";
import { FileTreeSkeleton } from "@/components/file-tree-skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { copyObjectUrl } from "@/lib/actions";
import { useCommands } from "@/lib/use-commands";
import { formatFileSize, relativeTimeSince } from "@/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { basename, extname, join } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { exists, writeFile } from "@tauri-apps/plugin-fs";
import { EllipsisVertical, File, Folder } from "lucide-react";
import { ReactNode, useState } from "react";
import { toast } from "sonner";
import { CreateFolderButton } from "./create-folder-button";
import { DeleteObjectsDialog } from "./delete-objects-dialog";
import { MoveFilesDialog } from "./move-files-dialog";
import { ObjectPreview } from "./object-preview";
import { useDashboardContext } from "./use-dashboard-context";

export type FileType = "folder" | "file";

interface ObjectListItem {
  key: string;
  label: string;
  type: FileType;
  size: number | null;
  lastModifiedAt: string | null;
  content?: ReactNode;
  onClick: () => void;
}

interface BucketViewProps {
  connection: Connection;
  bucket: BucketInfo;
}

export function ObjectList({ connection, bucket }: BucketViewProps) {
  const { commands } = useCommands();
  const {
    prefix,
    setPrefix,
    setSelectedBucket,
    previewedObject,
    setPreviewedObject,
    searchPhrase,
  } = useDashboardContext();

  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const hasActiveSelection = !!selectedObjects.length;

  // It was intended to just have selectedObjects, but the checkbox would be checked when
  // the `delete` action was triggered on an individual item. This can be quite confusing,
  // so an additional, technically unnecessary, state was introduced. Maybe we'll find
  // a better solution in the future.
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [visibleConfirmationDialog, setVisibleConfirmationDialog] = useState<
    null | "deleteObjects" | "deleteFolder" | "moveObjects"
  >(null);

  // Displays the current folder as "bucketname / folder / nested"
  const segments = prefix ? prefix.split("/").filter(Boolean) : [];
  const parentSegments = segments.slice(0, segments.length - 1);
  const parentPrefix =
    parentSegments.length > 0 ? `${parentSegments.join("/")}/` : null;

  const {
    data: objects,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["buckets", connection.id, bucket.region, bucket.name, prefix],

    queryFn: async () => {
      return await commands.listObjects({
        common: {
          connection,
          bucket_region: bucket.region,
        },
        bucket_name: bucket.name,
        prefix,
      });
    },

    select: (objects: ObjectInfo[]): ObjectListItem[] => {
      return objects
        .filter((object) => {
          return (
            !searchPhrase ||
            object.key.toLowerCase().includes(searchPhrase.toLowerCase())
          );
        })
        .map((file) => {
          const { key, size, last_modified, is_folder } = file;

          // Hide slash suffix for folders
          const labelWithPrefix = is_folder
            ? key.substring(0, key.length - 1)
            : key;

          // Only display name relative to prefix instead of fully qualified name
          const label = labelWithPrefix.substring(prefix?.length ?? 0);

          function onClick() {
            if (is_folder) {
              setPrefix(key);
              setPreviewedObject(null);
              return;
            }

            // Hide preview if currently previewed item is selected again
            const newSelection = key === previewedObject?.key ? null : file;
            setPreviewedObject(newSelection);
          }

          return {
            key,
            label,
            type: is_folder ? "folder" : "file",
            size,
            lastModifiedAt: last_modified,
            onClick,
          };
        });
    },
  });

  const { mutate: downloadObjects } = useMutation({
    mutationFn: async (keys: string[]) => {
      if (keys.length === 0) {
        return;
      }

      const folder = await open({
        directory: true,
        multiple: false,
      });

      if (!folder) {
        throw new Error("Download failed due to path selection");
      }

      const response = await commands.downloadObjects({
        common: {
          connection,
          bucket_region: bucket.region,
        },
        bucket_name: bucket.name,
        keys,
      });

      for (const [key, bytes] of response) {
        const name = await basename(key);
        const extension = await extname(name);
        const nameWithoutExtension = name.substring(
          0,
          name.length - extension.length - 1,
        );

        let counter = 1;
        let filePath = await join(folder, key);

        // Retry `filename(n).ext` until there exists an `n`, for which the file does not exist yet
        while (await exists(filePath)) {
          const newFilename = `${nameWithoutExtension}(${String(counter)}).${extension}`;
          filePath = await join(folder, newFilename);
          counter++;
        }

        await writeFile(filePath, new Uint8Array(bytes));
      }

      return keys;
    },
    onSuccess: () => {
      toast.success("Download successful!");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Download failed.");
    },
  });

  const { mutate: downloadFolder } = useMutation({
    mutationFn: async (prefix: string) => {
      const folder = await open({
        directory: true,
        multiple: false,
      });

      if (!folder) {
        throw new Error("Download failed due to path selection");
      }

      const bytes = await commands.downloadFolder({
        common: {
          connection,
          bucket_region: bucket.region,
        },
        bucket_name: bucket.name,
        prefix,
      });

      const nameWithoutExtension = prefix.substring(0, prefix.length - 1);
      const extension = "zip";

      let counter = 1;
      let filePath = await join(folder, `${nameWithoutExtension}.zip`);

      // Retry `filename(n).ext` until there exists an `n`, for which the file does not exist yet
      while (await exists(filePath)) {
        const newFilename = `${nameWithoutExtension}(${String(counter)}).${extension}`;
        filePath = await join(folder, newFilename);
        counter++;
      }

      await writeFile(filePath, new Uint8Array(bytes));
    },
    onSuccess: () => {
      toast.success("Download successful.");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Download failed.");
    },
  });

  const { mutate: uploadObjects } = useMutation({
    mutationFn: async () => {
      const files = await open({
        multiple: true,
      });

      if (!files) {
        throw new Error("Upload failed due to path selection");
      }

      await commands.uploadObjects({
        common: {
          connection,
          bucket_region: bucket.region,
        },
        bucket_name: bucket.name,
        prefix,
        file_paths: files,
      });
    },
    onSuccess: async () => {
      await refetch();
      toast.success("Upload successful.");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to upload files.");
    },
  });

  const { mutate: deleteObjects } = useMutation({
    mutationFn: async (keys: string[]) => {
      await commands.deleteObjects({
        common: {
          connection,
          bucket_region: bucket.region,
        },
        bucket_name: bucket.name,
        keys,
      });
    },
    onSuccess: async () => {
      await refetch();
      setSelectedObjects([]);
      toast.success("Objects deleted successfully.");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to delete objects.");
    },
  });

  const { mutate: createFolder } = useMutation({
    mutationFn: async (folderName: string) => {
      const folderKey = prefix ? `${prefix}${folderName}/` : `${folderName}/`;

      await commands.createFolder({
        common: {
          connection,
          bucket_region: bucket.region,
        },
        bucket_name: bucket.name,
        folder_key: folderKey,
      });
    },
    onSuccess: async () => {
      await refetch();
      toast.success("Folder created successfully.");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to create folder.");
    },
  });

  const { mutate: deleteFolder } = useMutation({
    mutationFn: async (prefix: string) => {
      await commands.deleteFolder({
        common: {
          connection,
          bucket_region: bucket.region,
        },
        bucket_name: bucket.name,
        prefix,
      });
    },
    onSuccess: async () => {
      await refetch();
      toast.success("Folder deleted successfully.");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to delete folder.");
    },
  });

  const { mutate: moveObjects } = useMutation({
    mutationFn: async (destinationPrefix: string) => {
      await commands.moveObjects({
        common: {
          connection,
          bucket_region: bucket.region,
        },
        bucket_name: bucket.name,
        keys: selectedObjects,
        destination_prefix: destinationPrefix,
      });
    },
    onSuccess: async () => {
      await refetch();
      setSelectedObjects([]);
      toast.success("Files moved successfully.");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to move files.");
    },
  });

  const { mutate: getObjectUrl } = useMutation({
    mutationFn: async (key: string) => {
      const url = await commands.getObjectUrl({
        common: {
          connection,
          bucket_region: bucket.region,
        },
        bucket_name: bucket.name,
        key,
      });
      copyObjectUrl(url);
    },
    onSuccess: () => {
      toast.success("URL copied to clipboard!");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to get object URL.");
    },
  });

  if (isPending) {
    return <FileTreeSkeleton />;
  }

  if (isError) {
    return <div>ERROR</div>;
  }

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      <div className="flex-1 overflow-auto">
        <FileTree
          items={objects}
          onParentDirectoryClick={() => {
            if (!prefix) {
              setSelectedBucket(null);
              return;
            }

            setPrefix(parentPrefix);
            setPreviewedObject(null);
            return;
          }}
        >
          {(item: ObjectListItem) => {
            const iconMap: Record<FileType, ReactNode> = {
              folder: <Folder className="size-5 text-yellow-600" />,
              file: <File className="size-5 text-neutral-700" />,
            };

            const icon = iconMap[item.type];

            return (
              <>
                <span className="flex shrink-0 items-center truncate">
                  <Checkbox
                    onClick={(e) => {
                      e.stopPropagation();

                      // Toggle selection of item
                      setSelectedObjects((initial) => {
                        return initial.includes(item.key)
                          ? initial.filter((k) => k !== item.key)
                          : [...initial, item.key];
                      });
                    }}
                    checked={selectedObjects.includes(item.key)}
                    disabled={item.type === "folder"}
                  />
                </span>

                <span className="flex grow items-center gap-2 truncate">
                  {icon} {item.label}
                </span>

                <span className="min-w-20 text-center">
                  {item.size ? formatFileSize({ bytes: item.size }) : ""}
                </span>

                <div className="min-w-40 truncate">
                  {item.lastModifiedAt &&
                    relativeTimeSince(item.lastModifiedAt)}
                </div>

                <div className="flex min-w-12 items-center justify-center truncate">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div
                        className="flex h-6 w-12 cursor-pointer items-center justify-center"
                        tabIndex={-1}
                      >
                        <EllipsisVertical aria-label="Open Bucket Actions Menu" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {item.type === "folder" && (
                        <>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();

                              downloadFolder(item.key);
                            }}
                          >
                            Download
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();

                              setFolderToDelete(item.key);
                              setVisibleConfirmationDialog("deleteFolder");
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}

                      {item.type === "file" && (
                        <>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();

                              downloadObjects([item.key]);
                            }}
                          >
                            Download
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();

                              getObjectUrl(item.key);
                            }}
                          >
                            Copy URL
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();

                              setItemToDelete(item.key);
                              setVisibleConfirmationDialog("deleteObjects");
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            );
          }}
        </FileTree>
      </div>

      {previewedObject && (
        <ObjectPreview bucket={bucket} object={previewedObject} />
      )}

      <div className="absolute bottom-4 left-4 flex rounded-md border border-neutral-300">
        {hasActiveSelection ? (
          <>
            <span className="flex items-center px-4 select-none hover:bg-transparent">
              {`${String(selectedObjects.length)} item${selectedObjects.length > 1 ? "s" : ""}`}{" "}
              selected
            </span>

            <Button
              variant="ghost"
              onClick={() => {
                downloadObjects(selectedObjects);
              }}
            >
              Download
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                setVisibleConfirmationDialog("moveObjects");
              }}
            >
              Move
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                setVisibleConfirmationDialog("deleteObjects");
              }}
            >
              Delete
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              onClick={() => {
                uploadObjects();
              }}
            >
              Upload
            </Button>

            <CreateFolderButton
              objects={objects}
              onSubmit={(folderName) => {
                createFolder(folderName);
              }}
            />
          </>
        )}
      </div>

      <DeleteObjectsDialog
        isOpen={visibleConfirmationDialog === "deleteObjects"}
        onOpenChange={(open) => {
          setVisibleConfirmationDialog(open ? "deleteObjects" : null);
          if (!open) {
            setItemToDelete(null);
          }
        }}
        onConfirm={() => {
          deleteObjects(itemToDelete ? [itemToDelete] : selectedObjects);
        }}
        objectKeys={itemToDelete ? [itemToDelete] : selectedObjects}
      />

      <DeleteObjectsDialog
        isOpen={visibleConfirmationDialog === "deleteFolder"}
        onOpenChange={(open) => {
          setVisibleConfirmationDialog(open ? "deleteFolder" : null);
          if (!open) {
            setFolderToDelete(null);
          }
        }}
        onConfirm={() => {
          if (folderToDelete) {
            deleteFolder(folderToDelete);
          }
        }}
        objectKeys={folderToDelete ? [folderToDelete] : []}
        type="folder"
      />

      <MoveFilesDialog
        isOpen={visibleConfirmationDialog === "moveObjects"}
        onOpenChange={(open) => {
          setVisibleConfirmationDialog(open ? "moveObjects" : null);
        }}
        onConfirm={(destinationPrefix) => {
          moveObjects(destinationPrefix);
        }}
        objectKeys={selectedObjects}
        connection={connection}
        bucket={bucket}
        currentPrefix={prefix}
      />
    </div>
  );
}
