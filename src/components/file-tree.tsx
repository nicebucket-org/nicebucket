import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useDimensions } from "@/lib/use-dimensions";
import { Folder } from "lucide-react";
import { ReactNode, useState } from "react";

interface FileTreeRow {
  key: string;
  onClick: VoidFunction;
}

interface FileTreeProps<T extends FileTreeRow> {
  items: T[];
  onParentDirectoryClick?: () => void;
  children: (item: T) => ReactNode;
}

export function FileTree<T extends FileTreeRow>({
  items,
  onParentDirectoryClick,
  children,
}: FileTreeProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  const { ref, dimensions } = useDimensions<HTMLDivElement>({
    // Let's see if this is annoying enough to solve it properly.
    onResize: () => {
      setCurrentPage(1);
    },
  });

  const rowHeight = 48;
  const paginationHeightIncludingGapAndPadding = 52 + 16 + 16;
  const maximumNumberOfItemsWithoutPagination = Math.floor(
    dimensions.height / rowHeight,
  );
  const needsPagination = maximumNumberOfItemsWithoutPagination <= items.length;

  const calculatedNumberOfItemsWithPagination = Math.floor(
    (dimensions.height - paginationHeightIncludingGapAndPadding) / rowHeight,
  );
  const minimumNumberOfVisibleRows = 1;
  const maximumNumberOfItemsWithPagination = Math.max(
    minimumNumberOfVisibleRows,
    calculatedNumberOfItemsWithPagination,
  );

  const numberOfPages = needsPagination
    ? Math.ceil(items.length / maximumNumberOfItemsWithPagination)
    : 1;

  const visibleItems = needsPagination
    ? items.slice(
        (currentPage - 1) * maximumNumberOfItemsWithPagination,
        currentPage * maximumNumberOfItemsWithPagination,
      )
    : items;

  return (
    <div className="flex h-full w-full flex-col gap-4" ref={ref}>
      <ul className="flex grow flex-col overflow-y-auto">
        {onParentDirectoryClick && (
          <li key={".."}>
            <Button
              className="h-12 w-full cursor-pointer items-center border-b border-neutral-300 px-6 py-0"
              variant="ghost"
              onClick={() => {
                onParentDirectoryClick();
              }}
            >
              <span className="ml-10 flex items-center gap-2 py-3">
                <Folder className="size-5 text-yellow-600" /> {".."}
              </span>
            </Button>
          </li>
        )}

        {visibleItems.map((item) => {
          return (
            <li key={item.key}>
              <Button
                variant="ghost"
                className="flex h-12 w-full cursor-pointer items-center justify-start gap-6 border-b border-neutral-300 px-6 py-0"
                onClick={() => {
                  item.onClick();
                }}
              >
                {children(item)}
              </Button>
            </li>
          );
        })}
      </ul>

      {needsPagination && (
        <Pagination className="pb-4">
          <PaginationContent>
            {currentPage > 1 && (
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => {
                    setCurrentPage((_currentPage) => _currentPage - 1);
                  }}
                />
              </PaginationItem>
            )}

            {currentPage > 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {new Array(numberOfPages).fill(null).map((_, i) => {
              const page = i + 1;

              const visiblePages = [
                currentPage - 1,
                currentPage,
                currentPage + 1,
              ].filter(
                (pageNumber) => pageNumber >= 0 && pageNumber <= numberOfPages,
              );

              if (!visiblePages.includes(page)) {
                return null;
              }

              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => {
                      setCurrentPage(page);
                    }}
                    isActive={page === currentPage}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              );
            })}

            {currentPage < numberOfPages - 1 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {currentPage < numberOfPages && (
              <PaginationItem>
                <PaginationNext
                  onClick={() => {
                    setCurrentPage((_currentPage) => _currentPage + 1);
                  }}
                />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
