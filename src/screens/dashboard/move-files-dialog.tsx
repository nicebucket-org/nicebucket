import { BucketInfo, Connection, ObjectInfo } from "@/bindings";
import { FileTree } from "@/components/file-tree";
import { FileTreeSkeleton } from "@/components/file-tree-skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCommands } from "@/lib/use-commands";
import { useQuery } from "@tanstack/react-query";
import { Folder } from "lucide-react";
import { useState } from "react";

interface MoveFilesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (destinationPrefix: string) => void;
  objectKeys: string[];
  connection: Connection;
  bucket: BucketInfo;
  currentPrefix: string | null;
}

interface FolderListItem {
  key: string;
  label: string;
  onClick: VoidFunction;
}

export function MoveFilesDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  objectKeys,
  connection,
  bucket,
  currentPrefix,
}: MoveFilesDialogProps) {
  const { commands } = useCommands();
  const objectCount = objectKeys.length;
  const isMultiple = objectCount > 1;

  const [dialogPrefix, setDialogPrefix] = useState<string | null>(
    currentPrefix,
  );

  const title = `Move ${isMultiple ? `${String(objectCount)} files` : "file"}`;

  const {
    data: objects = [],
    isPending,
    isError,
  } = useQuery({
    queryKey: ["move-dialog-objects", connection.id, bucket.name, dialogPrefix],
    queryFn: async () => {
      const result = await commands.listObjects({
        common: {
          connection,
          bucket_region: bucket.region,
        },
        bucket_name: bucket.name,
        prefix: dialogPrefix,
      });

      return result;
    },
    enabled: isOpen,
  });

  const folders: FolderListItem[] = objects
    .filter((object: ObjectInfo) => object.is_folder)
    .map((folder: ObjectInfo) => {
      const { key } = folder;

      // Hide slash suffix for folders
      const labelWithPrefix = key.substring(0, key.length - 1);

      // Only display name relative to prefix instead of fully qualified name
      const label = labelWithPrefix.substring(dialogPrefix?.length ?? 0);

      return {
        key,
        label,
        onClick: () => {
          setDialogPrefix(key);
        },
      };
    });

  const parentPrefix = dialogPrefix?.includes("/")
    ? dialogPrefix.substring(
        0,
        dialogPrefix.lastIndexOf("/", dialogPrefix.length - 2) + 1,
      )
    : null;

  const onParentDirectoryClick = !dialogPrefix
    ? undefined
    : () => {
        setDialogPrefix(parentPrefix);
      };

  const handleMove = () => {
    onConfirm(dialogPrefix ?? "");
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setDialogPrefix(currentPrefix);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Select destination folder. Currently viewing:{" "}
            {dialogPrefix ? `/${dialogPrefix.replace(/\/$/, "")}` : "/"}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[500px] min-h-[400px] overflow-hidden rounded-md border">
          {isPending ? (
            <FileTreeSkeleton />
          ) : isError ? (
            <div className="flex h-full items-center justify-center text-red-500">
              Error loading folders
            </div>
          ) : (
            <FileTree
              items={folders}
              onParentDirectoryClick={onParentDirectoryClick}
            >
              {(item: FolderListItem) => {
                return (
                  <>
                    <span className="flex shrink-0 items-center truncate">
                      <Folder className="size-5 text-yellow-600" />
                      <span className="ml-2">{item.label}</span>
                    </span>
                  </>
                );
              }}
            </FileTree>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>

          <Button onClick={handleMove}>
            Move to{" "}
            {dialogPrefix ? `/${dialogPrefix.replace(/\/$/, "")}` : "root"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
