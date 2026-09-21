import { useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { StandingsTable } from "./StandingsTable";
import { RoundMatchesList } from "./RoundMatchesList";
import { ChevronLeft, ChevronRight, Trophy, Calendar } from "lucide-react";

interface LeagueViewProps {
  leagueId: Id<"leagues">;
  league: {
    _id?: Id<"leagues">;
    name: string;
    country?: string;
    logoUrl?: string;
    season?: number;
    priority?: number;
  };
}

export function LeagueView({ leagueId, league }: LeagueViewProps) {
  // Padrão Rodada 29 (onde estão os dados reais do print Sofascore)
  const [currentRound, setCurrentRound] = useState<number>(29);
  const [mobileTab, setMobileTab] = useState<"standings" | "matches">("standings");

  const minRound = 1;
  const maxRound = 38;

  const handlePrevRound = () => {
    setCurrentRound((prev) => Math.max(minRound, prev - 1));
  };

  const handleNextRound = () => {
    setCurrentRound((prev) => Math.min(maxRound, prev + 1));
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Topo da Liga com Navegador de Rodadas Sofascore */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
        {/* Identificação do Campeonato */}
        <div className="flex items-center gap-3">
          {league.logoUrl ? (
            <div className="w-10 h-10 rounded-xl bg-white/95 p-1 flex items-center justify-center shrink-0 shadow-md">
              <img
                src={league.logoUrl}
                alt={league.name}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
          )}

          <div>
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              {league.name}
              {league.country && (
                <span className="text-xs font-normal text-slate-400 hidden sm:inline">
                  • {league.country}
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400">
              Temporada {league.season ?? 2026} • {maxRound} Rodadas
            </p>
          </div>
        </div>

        {/* Seletor Sofascore: [ < ] Rodada X [ > ] */}
        <div className="flex items-center gap-2 bg-[#0d1117] px-3 py-1.5 rounded-xl border border-[#30363d] shadow-inner">
          <button
            onClick={handlePrevRound}
            disabled={currentRound <= minRound}
            className={`p-1 rounded-lg transition-all cursor-pointer ${
              currentRound <= minRound
                ? "text-slate-600 cursor-not-allowed"
                : "text-slate-300 hover:text-white hover:bg-[#21262d] active:scale-95"
            }`}
            title="Rodada anterior"
            aria-label="Rodada anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="px-2 text-center min-w-[90px]">
            <span className="text-xs font-bold text-slate-100 tracking-wide uppercase">
              Rodada {currentRound}
            </span>
          </div>

          <button
            onClick={handleNextRound}
            disabled={currentRound >= maxRound}
            className={`p-1 rounded-lg transition-all cursor-pointer ${
              currentRound >= maxRound
                ? "text-slate-600 cursor-not-allowed"
                : "text-slate-300 hover:text-white hover:bg-[#21262d] active:scale-95"
            }`}
            title="Próxima rodada"
            aria-label="Próxima rodada"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alternador Mobile (Classificação vs Rodada) */}
      <div className="lg:hidden flex items-center p-1 rounded-xl bg-[#161b22] border border-[#30363d]">
        <button
          onClick={() => setMobileTab("standings")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            mobileTab === "standings"
              ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Classificação</span>
        </button>
        <button
          onClick={() => setMobileTab("matches")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            mobileTab === "matches"
              ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Jogos (Rodada {currentRound})</span>
        </button>
      </div>

      {/* Grid Split Lado a Lado (Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Principal: Tabela de Classificação (8 colunas) */}
        <div
          className={`lg:col-span-8 ${
            mobileTab === "standings" ? "block" : "hidden lg:block"
          }`}
        >
          <StandingsTable leagueId={leagueId} leagueName={league.name} />
        </div>

        {/* Coluna Lateral: Jogos da Rodada (4 colunas) */}
        <div
          className={`lg:col-span-4 sticky top-4 ${
            mobileTab === "matches" ? "block" : "hidden lg:block"
          }`}
        >
          <RoundMatchesList
            leagueId={leagueId}
            round={`Rodada ${currentRound}`}
          />
        </div>
      </div>
    </div>
  );
}

