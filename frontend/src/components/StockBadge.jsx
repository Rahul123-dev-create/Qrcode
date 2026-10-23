/**
 * Stock Status Badge Component
 * Displays product stock status or lifecycle state
 */

export function StockBadge({ quantity, qty, threshold = 10, status = "active" }) {
  const currentQty = quantity !== undefined ? quantity : qty !== undefined ? qty : 0;

  if (status === "deleted" || status === "archived") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-700/50">
        Archived / Deleted
      </span>
    );
  }

  if (currentQty === 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
        Out of Stock
      </span>
    );
  }

  if (currentQty <= threshold) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
        Low Stock
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
      In Stock
    </span>
  );
}

export default StockBadge;
