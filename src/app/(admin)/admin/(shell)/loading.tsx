import { Skeleton } from "@/components/ui/skeleton"

/** Shown inside the shell while a page reads its data. */
export default function Loading() {
  return (
    <div data-slot="admin-loading" role="status" aria-label="Loading" className="space-y-6">
      <Skeleton className="h-9 w-56" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((n) => (
          <Skeleton key={n} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  )
}
