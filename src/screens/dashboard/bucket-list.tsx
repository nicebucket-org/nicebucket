import { BucketInfo } from "@/bindings";
import { FileTree } from "@/components/file-tree";
import { FileTreeSkeleton } from "@/components/file-tree-skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { copyToClipboard } from "@/lib/actions";
import { useCommands } from "@/lib/use-commands";
import { skipToken, useQuery } from "@tanstack/react-query";
import { EllipsisVertical, Folder } from "lucide-react";
import { toast } from "sonner";
import { useDashboardContext } from "./use-dashboard-context";

export function BucketList() {
  const { commands } = useCommands();
  const { connection, setSelectedBucket, searchPhrase } = useDashboardContext();

  const { data, isPending, isError } = useQuery({
    queryKey: ["listBuckets", connection?.id],

    queryFn: connection
      ? () => {
          return commands.listBuckets(connection);
        }
      : skipToken,

    select: (buckets: BucketInfo[]) => {
      return buckets
        .filter((bucket) => {
          return (
            !searchPhrase ||
            bucket.name.toLowerCase().includes(searchPhrase.toLowerCase())
          );
        })
        .map((bucket) => {
          const onClick = () => {
            setSelectedBucket(bucket);
          };

          return {
            ...bucket,
            key: bucket.name,
            onClick,
          };
        });
    },
  });

  if (isPending) {
    return <FileTreeSkeleton />;
  }

  if (isError) {
    return <div>ERROR</div>;
  }

  return (
    <div className="flex h-full overflow-y-hidden" data-testid="bucket-list">
      <FileTree items={data}>
        {(bucket) => {
          const icon = <Folder className="size-5 text-yellow-600" />;

          return (
            <>
              <span className="flex grow items-center gap-2 truncate py-3">
                {icon} {bucket.name}
              </span>

              <div className="min-w-40 truncate">{bucket.region}</div>

              <div className="flex items-center justify-center truncate">
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
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();

                        copyToClipboard(bucket.endpoint_url);

                        toast.success("Bucket URL copied successfully.");
                      }}
                    >
                      Copy Bucket Url
                      <DropdownMenuShortcut>c</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          );
        }}
      </FileTree>
    </div>
  );
}
