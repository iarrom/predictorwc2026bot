import { Skeleton } from "@/components/ui/skeleton";

function MatchRowSkeleton() {
  return (
    <div className="flex min-h-[7rem] flex-col justify-center border-t border-white/[0.08] px-3 py-2">
      <div className="mb-1.5 grid grid-cols-[1fr_auto_1fr] items-center gap-x-2">
        <Skeleton className="h-4 w-14 rounded-md" />
        <Skeleton className="h-3 w-24 rounded-md" />
        <Skeleton className="ml-auto h-4 w-10 rounded-md" />
      </div>
      <div className="grid w-full grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] items-start gap-x-2">
        <div className="flex flex-col items-center gap-1.5">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-3 w-16 rounded-md" />
        </div>
        <Skeleton className="mx-auto h-5 w-12 self-center rounded-md" />
        <div className="flex flex-col items-center gap-1.5">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-3 w-16 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function MatchesPanelSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="sports-panel corner-squircle sports-panel-max-h flex flex-col">
        <div className="flex shrink-0 border-b border-white/[0.08] px-3 pt-3 pb-2.5">
          <Skeleton className="mx-1 h-4 flex-1 rounded-md" />
          <Skeleton className="mx-1 h-4 flex-1 rounded-md" />
          <Skeleton className="mx-1 h-4 flex-1 rounded-md" />
        </div>

        <div className="overflow-hidden">
          <div className="flex items-center justify-center border-b border-white/[0.08] px-3 py-2.5">
            <Skeleton className="h-4 w-28 rounded-md" />
          </div>
          {Array.from({ length: 5 }).map((_, index) => (
            <MatchRowSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
