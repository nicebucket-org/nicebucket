import { Skeleton } from "./ui/skeleton";

interface FileTreeSkeletonProps {
  numberOfRows?: number;
}

const DEFAULT_NUMBER_OF_ROWS = 4;

export function FileTreeSkeleton(props: FileTreeSkeletonProps) {
  const numberOfRows = props.numberOfRows ?? DEFAULT_NUMBER_OF_ROWS;

  return (
    <ul className="grow">
      {new Array(numberOfRows).fill(null).map((_, i) => {
        return (
          <li key={i}>
            <div className="border-muted flex h-12 w-full cursor-pointer items-center border-b px-6 py-0">
              <Skeleton className="h-5 w-full" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
