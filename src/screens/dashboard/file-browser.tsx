import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BucketList } from "./bucket-list";
import { ObjectList } from "./object-list";
import { useDashboardContext } from "./use-dashboard-context";

export function FileBrowser() {
  const {
    connection,
    selectedBucket,
    setSelectedBucket,
    prefix,
    setPrefix,
    setPreviewedObject,
    setSearchPhrase,
  } = useDashboardContext();

  // Displays the current folder as "bucketname / folder / nested"
  const segments = prefix ? prefix.split("/").filter(Boolean) : [];

  const breadcrumbs = segments.map((segment, i) => {
    const prefix = `${segments.slice(0, i + 1).join("/")}/`;

    return {
      label: segment,
      prefix,
    };
  });

  return (
    <Card className="m-4 grow overflow-x-hidden p-0">
      <Card className="flex flex-row items-center border-0 border-b shadow-none">
        <h2 className="grow">
          <span
            className="cursor-pointer"
            onClick={() => {
              setSelectedBucket(null);
            }}
          >
            Connection Name
          </span>
          {selectedBucket && (
            <span
              className="text-muted-foreground cursor-pointer"
              onClick={() => {
                setPrefix(null);
                setPreviewedObject(null);
              }}
            >
              {` / ${selectedBucket.name}`}
            </span>
          )}

          {breadcrumbs.map(({ label, prefix }) => {
            return (
              <span
                key={prefix}
                className="text-muted-foreground cursor-pointer"
                onClick={() => {
                  setPrefix(prefix);
                  setPreviewedObject(null);
                }}
              >{` / ${label}`}</span>
            );
          })}
        </h2>

        <Input
          placeholder="Search..."
          className="w-fit"
          onChange={(e) => {
            setSearchPhrase(e.target.value);
          }}
        />
      </Card>

      {connection &&
        (selectedBucket ? (
          <ObjectList connection={connection} bucket={selectedBucket} />
        ) : (
          <BucketList />
        ))}
    </Card>
  );
}
