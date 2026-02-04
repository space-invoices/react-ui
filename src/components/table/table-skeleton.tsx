import { Skeleton } from "@/ui/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/components/ui/table";

type TableSkeletonProps = {
  columns?: number;
  rows?: number;
};

/**
 * Loading skeleton for table component
 */
export function TableSkeleton({ columns = 5, rows = 10 }: TableSkeletonProps) {
  return (
    <div className="space-y-4">
      {/* Search input skeleton */}
      <Skeleton className="h-8 w-[250px]" />

      {/* Table skeleton */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: columns }, (_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                <TableHead key={`header-${i}`}>
                  <Skeleton data-testid="skeleton-cell" className="my-2 h-4 w-[100px]" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }, (_, rowIndex) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
              <TableRow key={`row-${rowIndex}`}>
                {Array.from({ length: columns }, (_, colIndex) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                  <TableCell key={`cell-${rowIndex}-${colIndex}`}>
                    <Skeleton data-testid="skeleton-cell" className="my-2 h-4 w-[100px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination skeleton */}
      <div className="flex justify-end gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  );
}
