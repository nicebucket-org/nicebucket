import { BucketInfo, ObjectInfo } from "@/bindings";
import { Skeleton } from "@/components/ui/skeleton";
import { IMAGE_FILE_TYPE_MAP } from "@/lib/constants";
import { useCommands } from "@/lib/use-commands";
import {
  formatFileSize,
  formatStorageClass,
  isImageFile,
  isTextFile,
  relativeTimeSince,
} from "@/lib/utils";
import { skipToken, useQuery } from "@tanstack/react-query";
import { useDashboardContext } from "./use-dashboard-context";

type ObjectPreview =
  | { type: "image"; url: string }
  | { type: "text"; content: string }
  | { type: "generic" };

interface ObjectPreviewProps {
  bucket: BucketInfo;
  object: ObjectInfo;
}

export function ObjectPreview({ bucket, object }: ObjectPreviewProps) {
  const { connection } = useDashboardContext();
  const { commands } = useCommands();

  function generatePreview(bytes: number[]): ObjectPreview {
    const bytesUint8 = new Uint8Array(bytes);

    const lastDotInObjectKeyIndex = object.key.lastIndexOf(".");
    const extension =
      lastDotInObjectKeyIndex > 0
        ? object.key.substring(lastDotInObjectKeyIndex)
        : object.key;

    if (isImageFile(object.key)) {
      const mimeType = IMAGE_FILE_TYPE_MAP[extension]?.mimeType ?? "image/*";
      const blob = new Blob([bytesUint8], {
        type: mimeType,
      });
      const url = URL.createObjectURL(blob);

      return { type: "image", url };
    }

    if (isTextFile(object.key)) {
      const PREVIEW_CHAR_LIMIT = 10000;
      const NUM_LINES_TO_SHOW = 8;

      const bytesToDecode = bytesUint8.slice(0, PREVIEW_CHAR_LIMIT * 4);

      const decoder = new TextDecoder("utf-8");
      let content = decoder.decode(bytesToDecode);

      if (content.length > PREVIEW_CHAR_LIMIT) {
        content = content.substring(0, PREVIEW_CHAR_LIMIT);
      }

      const lines = content.split("\n");
      let preview = lines.slice(0, NUM_LINES_TO_SHOW).join("\n");

      if (
        bytesUint8.length > PREVIEW_CHAR_LIMIT * 4 ||
        lines.length > NUM_LINES_TO_SHOW
      ) {
        preview += "\n...\n(File truncated)";
      }

      return { type: "text", content: preview };
    }

    return { type: "generic" };
  }

  const {
    data: preview,
    isError,
    isPending,
  } = useQuery({
    queryKey: ["object", bucket, object.key],
    queryFn: connection
      ? async () => {
          const bytes = await commands.downloadObject({
            bucket_name: bucket.name,
            common: {
              connection,
              bucket_region: bucket.region,
            },
            key: object.key,
          });

          return generatePreview(bytes);
        }
      : skipToken,
  });

  if (isError) {
    return <div>ERROR</div>;
  }

  if (isPending) {
    return (
      <div className="rounded-lg border-l border-neutral-300 p-4">
        <Skeleton className="size-56 p-4" />
      </div>
    );
  }

  const storageClass = object.storage_class
    ? formatStorageClass(object.storage_class)
    : null;

  return (
    <div className="flex w-64 shrink-0 flex-col gap-6 rounded-lg border-l border-neutral-300 p-4">
      <div>
        <div className="text-muted-foreground">Key</div>
        <div className="truncate">{object.key}</div>
      </div>

      {["image", "text"].includes(preview.type) && (
        <div className="w-56">
          <div className="text-muted-foreground pb-0">Preview</div>
          {preview.type === "image" && <img src={preview.url} />}
          {preview.type === "text" && (
            <pre className="bg-accent overflow-x-hidden rounded-sm p-4">
              {preview.content}
            </pre>
          )}
        </div>
      )}

      {!!object.last_modified && (
        <div>
          <div className="text-muted-foreground">Last Modified</div>
          <div>{relativeTimeSince(object.last_modified)}</div>
        </div>
      )}

      {!!object.size && (
        <div>
          <div className="text-muted-foreground">Size</div>
          <div>{formatFileSize({ bytes: object.size })}</div>
        </div>
      )}

      {!!storageClass && (
        <div>
          <div className="text-muted-foreground">Storage Class</div>
          <div>{storageClass}</div>
        </div>
      )}
    </div>
  );
}
