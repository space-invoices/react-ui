import { Skeleton } from "@/ui/components/ui/skeleton";

/** A4-shaped skeleton that mimics a document layout */
export function DocumentPreviewSkeleton() {
  return (
    <div className="rounded-lg border bg-neutral-100 p-4">
      <div className="mx-auto bg-white p-8" style={{ maxWidth: 794, aspectRatio: "210 / 297" }}>
        {/* Header: logo + company info */}
        <div className="flex justify-between">
          <Skeleton className="h-10 w-32 bg-neutral-200" />
          <div className="flex flex-col items-end gap-1.5">
            <Skeleton className="h-3 w-40 bg-neutral-200" />
            <Skeleton className="h-3 w-32 bg-neutral-200" />
            <Skeleton className="h-3 w-28 bg-neutral-200" />
          </div>
        </div>

        {/* Title */}
        <Skeleton className="mt-8 h-5 w-28 bg-neutral-200" />

        {/* Recipient + details row */}
        <div className="mt-6 flex justify-between">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-36 bg-neutral-200" />
            <Skeleton className="h-3 w-28 bg-neutral-200" />
            <Skeleton className="h-3 w-24 bg-neutral-200" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Skeleton className="h-3 w-24 bg-neutral-200" />
            <Skeleton className="h-3 w-20 bg-neutral-200" />
            <Skeleton className="h-3 w-24 bg-neutral-200" />
          </div>
        </div>

        {/* Table header */}
        <div className="mt-8 flex gap-4 border-b pb-2">
          <Skeleton className="h-3 w-8 bg-neutral-200" />
          <Skeleton className="h-3 flex-1 bg-neutral-200" />
          <Skeleton className="h-3 w-12 bg-neutral-200" />
          <Skeleton className="h-3 w-16 bg-neutral-200" />
          <Skeleton className="h-3 w-16 bg-neutral-200" />
        </div>
        {/* Table rows */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 border-b py-2.5">
            <Skeleton className="h-3 w-8 bg-neutral-200" />
            <Skeleton className="h-3 flex-1 bg-neutral-200" />
            <Skeleton className="h-3 w-12 bg-neutral-200" />
            <Skeleton className="h-3 w-16 bg-neutral-200" />
            <Skeleton className="h-3 w-16 bg-neutral-200" />
          </div>
        ))}

        {/* Totals */}
        <div className="mt-4 flex flex-col items-end gap-1.5">
          <Skeleton className="h-3 w-32 bg-neutral-200" />
          <Skeleton className="h-3 w-28 bg-neutral-200" />
          <Skeleton className="h-4 w-36 bg-neutral-200" />
        </div>
      </div>
    </div>
  );
}
