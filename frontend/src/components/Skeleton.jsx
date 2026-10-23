/**
 * Loading Skeleton Component
 * Shows placeholder content while loading
 */

export function Skeleton({ className = "" }) {
  return (
    <div className={`bg-slate-800/50 animate-pulse rounded ${className}`} />
  );
}

export function TableRowSkeleton() {
  return (
    <tr className="border-b border-slate-800/50">
      <td className="px-5 py-3.5">
        <Skeleton className="h-4 w-20" />
      </td>
      <td className="px-5 py-3.5">
        <Skeleton className="h-4 w-40" />
      </td>
      <td className="px-5 py-3.5">
        <Skeleton className="h-4 w-32" />
      </td>
      <td className="px-5 py-3.5 text-right">
        <Skeleton className="h-4 w-12 ml-auto" />
      </td>
      <td className="px-5 py-3.5 text-right">
        <Skeleton className="h-4 w-20 ml-auto" />
      </td>
    </tr>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}
