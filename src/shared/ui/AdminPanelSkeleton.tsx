import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton() {
  return (
    <div className="corner-squircle rounded-2xl border border-white/10 bg-white/5 p-4">
      <Skeleton className="h-5 w-36 rounded-md" />
      <Skeleton className="mt-2 h-3 w-full max-w-sm rounded-md" />
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-[80%] rounded-md" />
        <Skeleton className="h-4 w-[60%] rounded-md" />
      </div>
    </div>
  );
}

export function AdminPanelSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Skeleton className="h-6 w-24 rounded-md" />
        <Skeleton className="mt-2 h-4 w-full max-w-xs rounded-md" />
      </div>
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
