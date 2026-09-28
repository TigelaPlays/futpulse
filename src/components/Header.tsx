import type { RefObject } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Activity,
  RefreshCw,
  CalendarDays,
  Upload,
  FlaskConical,
  Volume2,
  VolumeX,
  Search,
} from "lucide-react";
import { StatusFilterBar, type FilterType, type MatchCounts } from "./StatusFilterBar";

export interface HeaderProps {
  // Sincronização
  isSyncing: boolean;
  syncFeedback: string | null;
  onManualSync: () => void;

  // Grade de Hoje / Reset
  isTodayActive: boolean;
  onResetToToday: () => void;

  // Ações / Modais
  onOpenAssetModal: () => void;
  onOpenSimulator: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;

  // Filtros de Status
  activeFilter: FilterType;
  onSelectFilter: (filter: FilterType) => void;
  matchCounts: MatchCounts;

  // Barra de Pesquisa Rápida
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;

  // Navegação de Ligas
  leagues: any[];
  selectedLeagueId: Id<"leagues"> | null;
  onSelectLeague: (leagueId: Id<"leagues"> | null) => void;
}

export function Header({
  isSyncing,
  syncFeedback,
  onManualSync,
  isTodayActive,
  onResetToToday,
  onOpenAssetModal,
  onOpenSimulator,
  soundEnabled,
  onToggleSound,
  activeFilter,
  onSelectFilter,
  matchCounts,
  searchQuery,
  onSearchChange,
  searchInputRef,
  leagues,
  selectedLeagueId,
  onSelectLeague,
}: HeaderProps) {
  return (
    <header className="border-b border-slate-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-40 px-4 py-3 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Marca / Logotipo */}
        <div className="flex items-center gap-2.5">
          <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600 border border-emerald-200 shadow-2xs">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
              FutPulse
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
            </h1>
            <p className="text-[11px] text-slate-500 tracking-wide font-medium">
              Live Score & Match Center
            </p>
          </div>
        </div>

        {/* Barra de Ações e Filtros de Status */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {syncFeedback && (
            <span className="text-xs font-semibold text-emerald-700 animate-fade-in hidden sm:inline px-2.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 shadow-2xs">
              {syncFeedback}
            </span>
          )}

          {/* Sincronização Manual */}
          <button
            type="button"
            onClick={onManualSync}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
              isSyncing
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 active:scale-95 shadow-2xs"
            }`}
            title="Sincronizar jogos ao vivo agora"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "..." : "Sincronizar"}</span>
          </button>

          {/* Atalho Grade de Hoje */}
          <button
            type="button"
            onClick={onResetToToday}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
              isTodayActive
                ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-bold shadow-2xs"
                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 active:scale-95 shadow-2xs"
            }`}
            title="Exibir os jogos de hoje e sincronizar grade"
          >
            <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Grade de Hoje</span>
          </button>

          {/* Upload de Ativos / Escudos */}
          <button
            type="button"
            onClick={onOpenAssetModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer bg-white hover:bg-slate-50 text-slate-700 border-slate-200 active:scale-95 shadow-2xs"
            title="Gerenciador de Ativos e Escudos"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Escudos</span>
          </button>

          {/* Simulador / Painel Dev */}
          <button
            type="button"
            onClick={onOpenSimulator}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer bg-white hover:bg-slate-50 text-slate-700 border-slate-200 active:scale-95 shadow-2xs"
            title="Simulação / Painel Dev"
          >
            <FlaskConical className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Simulador</span>
          </button>

          {/* Botão de Som */}
          <button
            type="button"
            onClick={onToggleSound}
            className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer shadow-2xs ${
              soundEnabled
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-white text-slate-400 border-slate-200"
            }`}
            title={soundEnabled ? "Som ativado" : "Som mutado"}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Filtros de Status Modularizados */}
          <StatusFilterBar
            activeFilter={activeFilter}
            onSelectFilter={onSelectFilter}
            counts={matchCounts}
          />
        </div>
      </div>

      {/* Barra de Pesquisa Rápida com Atalho Ctrl+K */}
      <div className="max-w-7xl mx-auto mt-2.5">
        <div className="relative group">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por time ou campeonato..."
            className="w-full bg-white border border-slate-200/90 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-9 pr-16 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all shadow-2xs"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded">
              Ctrl K
            </kbd>
          </div>
        </div>
      </div>

      {/* Pílulas de Navegação Rápida por Campeonato */}
      {leagues && leagues.length > 0 && (
        <div className="max-w-7xl mx-auto mt-3 pt-2.5 border-t border-slate-200/80 flex items-center gap-2 overflow-x-auto scrollbar-none touch-pan-x pb-1">
          <button
            type="button"
            onClick={() => onSelectLeague(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
              selectedLeagueId === null
                ? "bg-emerald-600 text-white font-bold shadow-xs"
                : "bg-white text-slate-700 hover:text-slate-900 border border-slate-200 shadow-2xs"
            }`}
          >
            Todas as Ligas
          </button>

          {/* Ligas Principais (Prioridade <= 10) */}
          {leagues
            .filter((lg) => (lg.priority ?? 99) <= 10)
            .map((lg) => {
              const isSelected = selectedLeagueId === lg._id;
              return (
                <button
                  key={lg._id}
                  type="button"
                  onClick={() => onSelectLeague(isSelected ? null : lg._id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-emerald-600 text-white font-bold shadow-xs scale-105"
                      : "bg-white text-slate-700 hover:text-slate-900 border border-slate-200 shadow-2xs"
                  }`}
                >
                  {lg.logoUrl && (
                    <div className="w-4 h-4 rounded-full bg-slate-50 p-0.5 flex items-center justify-center shrink-0 border border-slate-100">
                      <img src={lg.logoUrl} alt="" className="w-full h-full object-contain" />
                    </div>
                  )}
                  <span>{lg.name}</span>
                </button>
              );
            })}

          {/* Separador se houver outras ligas */}
          {leagues.some((lg) => (lg.priority ?? 99) > 10) && (
            <span className="text-slate-400 text-xs px-1">|</span>
          )}

          {/* Ligas Secundárias */}
          {leagues
            .filter((lg) => (lg.priority ?? 99) > 10)
            .map((lg) => {
              const isSelected = selectedLeagueId === lg._id;
              return (
                <button
                  key={lg._id}
                  type="button"
                  onClick={() => onSelectLeague(isSelected ? null : lg._id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-teal-600 text-white font-bold shadow-xs"
                      : "bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200"
                  }`}
                >
                  {lg.logoUrl && (
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-50 p-0.5 flex items-center justify-center shrink-0 border border-slate-100">
                      <img src={lg.logoUrl} alt="" className="w-full h-full object-contain" />
                    </div>
                  )}
                  <span>{lg.name}</span>
                </button>
              );
            })}
        </div>
      )}
    </header>
  );
}
