import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatQuickDateLabel } from "../utils/date";

export interface DateCarouselProps {
  selectedDateOffset: number | null;
  onSelectDateOffset: (offset: number | null) => void;
  onNavigateOffset: (delta: number) => void;
}

export function DateCarousel({
  selectedDateOffset,
  onSelectDateOffset,
  onNavigateOffset,
}: DateCarouselProps) {
  const quickOffsets = [-1, 0, 1];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs">
      <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none touch-pan-x py-0.5 max-w-full">
        {/* Dia Anterior */}
        <button
          type="button"
          onClick={() => onNavigateOffset(-1)}
          className="p-1 sm:p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer shrink-0"
          title="Dia anterior"
          aria-label="Dia anterior"
        >
          <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Pílulas de Atalhos Rápidos */}
        {quickOffsets.map((offset) => {
          const isSelected = selectedDateOffset === offset;
          return (
            <button
              key={offset}
              type="button"
              onClick={() => onSelectDateOffset(offset)}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                isSelected
                  ? "bg-emerald-600 text-white font-bold shadow-xs scale-102"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              {formatQuickDateLabel(offset)}
            </button>
          );
        })}

        {/* Próximo Dia */}
        <button
          type="button"
          onClick={() => onNavigateOffset(1)}
          className="p-1 sm:p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer shrink-0"
          title="Próximo dia"
          aria-label="Próximo dia"
        >
          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Botão de Rodada Atual Ativa */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onSelectDateOffset(null)}
          className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
            selectedDateOffset === null
              ? "bg-slate-900 text-white font-bold shadow-xs"
              : "bg-slate-100 hover:bg-slate-200/80 text-slate-600 border border-slate-200"
          }`}
          title="Exibir partidas da rodada atual ativa de cada liga"
        >
          Rodada Atual Ativa
        </button>
      </div>
    </div>
  );
}
