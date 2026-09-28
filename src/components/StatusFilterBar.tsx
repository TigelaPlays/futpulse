export type FilterType = "ALL" | "LIVE" | "FINISHED" | "SCHEDULED";

export interface MatchCounts {
  ALL: number;
  LIVE: number;
  FINISHED: number;
  SCHEDULED: number;
}

export interface StatusFilterBarProps {
  activeFilter: FilterType;
  onSelectFilter: (filter: FilterType) => void;
  counts: MatchCounts;
}

export function StatusFilterBar({
  activeFilter,
  onSelectFilter,
  counts,
}: StatusFilterBarProps) {
  const filterItems = [
    { id: "ALL" as const, label: "Todos", count: counts.ALL },
    { id: "LIVE" as const, label: "Ao Vivo", count: counts.LIVE },
    { id: "FINISHED" as const, label: "Fim", count: counts.FINISHED },
    { id: "SCHEDULED" as const, label: "Grade", count: counts.SCHEDULED },
  ];

  return (
    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold shadow-inner">
      {filterItems.map((item) => {
        const isActive = activeFilter === item.id;
        const hasLiveCount = item.id === "LIVE" && item.count > 0;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectFilter(item.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              isActive
                ? "bg-emerald-600 text-white font-bold shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
            }`}
          >
            {hasLiveCount && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
              </span>
            )}
            <span>{item.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums font-mono ${
                isActive
                  ? "bg-white/25 text-white font-bold"
                  : hasLiveCount
                  ? "bg-emerald-100 text-emerald-800 font-bold"
                  : "bg-slate-200/80 text-slate-600"
              }`}
            >
              {item.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
