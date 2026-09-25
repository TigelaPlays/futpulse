import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { StandingsTable } from "./StandingsTable";
import { NationsLeagueStandings } from "./NationsLeagueStandings";
import { RoundMatchesList } from "./RoundMatchesList";
import { ChevronLeft, ChevronRight, Trophy, Calendar } from "lucide-react";

interface LeagueViewProps {
  leagueId: Id<"leagues">;
  league: {
    _id?: Id<"leagues">;
    name: string;
    code?: string;
    country?: string;
    logoUrl?: string;
    season?: number;
    priority?: number;
  };
  onNavigateToMatches?: () => void;
  onSelectMatch?: (matchId: Id<"matches">) => void;
}

export function LeagueView({
  leagueId,
  league,
  onNavigateToMatches,
  onSelectMatch,
}: LeagueViewProps) {
  const isLibertadores = league.name.toLowerCase().includes("libertadores");
  const isNationsLeague =
    league.name.toLowerCase().includes("nations league") ||
    league.name.toLowerCase().includes("nations-league") ||
    league.code === "UNL";
  const isCup = isLibertadores || isNationsLeague || league.name.toLowerCase().includes("copa");

  const latestFinishedRound = useQuery(api.leagues.getLatestFinishedRound, {
    leagueId,
  });

  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [prevLeagueId, setPrevLeagueId] = useState(leagueId);

  // Se trocar de campeonato, reseta a escolha manual para abrir na rodada padrão
  if (prevLeagueId !== leagueId) {
    setPrevLeagueId(leagueId);
    setSelectedRound(null);
  }

  // A rodada ativa é a selecionada pelo usuário ou, por padrão, a última finalizada
  const currentRound = selectedRound ?? latestFinishedRound ?? 1;

  const [mobileTab, setMobileTab] = useState<"standings" | "matches">("standings");

  const minRound = 1;
  const maxRound = isLibertadores ? 6 : isNationsLeague ? 6 : isCup ? 8 : 38;

  const stageSubtitle = isNationsLeague
    ? "Fase de Grupos • Divisões A, B, C e D"
    : isLibertadores
    ? "Fase de Grupos (6 Rodadas) • Mata-Mata"
    : isCup
    ? "Torneio de Copa"
    : `${maxRound} Rodadas`;

  const roundDisplay = isNationsLeague
    ? `Fase de Grupos • Rodada ${currentRound}`
    : isLibertadores
    ? `Fase de Grupos • Rodada ${currentRound}`
    : `Rodada ${currentRound}`;

  const handlePrevRound = () => {
    if (currentRound !== undefined) {
      setSelectedRound(Math.max(minRound, currentRound - 1));
    }
  };

  const handleNextRound = () => {
    if (currentRound !== undefined) {
      setSelectedRound(Math.min(maxRound, currentRound + 1));
    }
  };

  if (currentRound === undefined) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-16 flex flex-col items-center justify-center gap-3 text-slate-500 shadow-xs animate-fade-in">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium">Carregando rodada mais recente...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Topo da Liga com Navegador de Rodadas Sofascore */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        {/* Identificação do Campeonato */}
        <div className="flex items-center gap-3 min-w-0">
          {league.logoUrl ? (
            <div className="w-10 h-10 rounded-xl bg-slate-50 p-1 flex items-center justify-center shrink-0 shadow-2xs border border-slate-200">
              <img
                src={league.logoUrl}
                alt={league.name}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
              <Trophy className="w-5 h-5" />
            </div>
          )}

          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 truncate">
              <span className="truncate">{league.name}</span>
              {league.country && (
                <span className="text-xs font-normal text-slate-500 hidden sm:inline shrink-0">
                  • {league.country}
                </span>
              )}
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 truncate">
              Temporada {league.season ?? 2026} • {stageSubtitle}
            </p>
          </div>
        </div>

        {/* Seletor Sofascore: [ < ] Rodada X [ > ] */}
        <div className="flex items-center justify-between sm:justify-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 shadow-inner w-full sm:w-auto">
          <button
            onClick={handlePrevRound}
            disabled={currentRound <= minRound}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              currentRound <= minRound
                ? "text-slate-300 cursor-not-allowed"
                : "text-slate-600 hover:text-slate-900 hover:bg-white active:scale-95 shadow-2xs"
            }`}
            title="Rodada anterior"
            aria-label="Rodada anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="px-2 text-center min-w-[100px] sm:min-w-[140px]">
            <span className="text-xs font-bold text-slate-900 tracking-wide uppercase">
              {roundDisplay}
            </span>
          </div>

          <button
            onClick={handleNextRound}
            disabled={currentRound >= maxRound}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              currentRound >= maxRound
                ? "text-slate-300 cursor-not-allowed"
                : "text-slate-600 hover:text-slate-900 hover:bg-white active:scale-95 shadow-2xs"
            }`}
            title="Próxima rodada"
            aria-label="Próxima rodada"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alternador Mobile e Tablet (< lg): [ Classificação ] [ Jogos da Rodada ] */}
      <div className="lg:hidden flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 gap-1">
        <button
          onClick={() => setMobileTab("standings")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            mobileTab === "standings"
              ? "bg-white text-slate-950 font-bold shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-emerald-600" />
          <span>Classificação</span>
        </button>
        <button
          onClick={() => setMobileTab("matches")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            mobileTab === "matches"
              ? "bg-white text-slate-950 font-bold shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          <span>Jogos da Rodada ({currentRound})</span>
        </button>
      </div>

      {/* Grid Split Lado a Lado (Desktop) - Perfeitamente Simétrico */}
      <div
        className={
          isNationsLeague
            ? "grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5 xl:gap-6 items-start"
            : "grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 lg:gap-6 items-stretch"
        }
      >
        {/* Coluna Principal: Tabela de Classificação */}
        <div
          className={`h-full min-w-0 ${
            mobileTab === "standings" ? "block" : "hidden lg:block"
          }`}
        >
          {isNationsLeague ? (
            <NationsLeagueStandings />
          ) : (
            <StandingsTable
              leagueId={leagueId}
              leagueName={league.name}
              currentRound={currentRound}
            />
          )}
        </div>

        {/* Coluna Lateral: Jogos da Rodada */}
        <div
          className={`h-full min-w-0 ${
            mobileTab === "matches" ? "block" : "hidden lg:block"
          }`}
        >
          <RoundMatchesList
            leagueId={leagueId}
            round={`Rodada ${currentRound}`}
            onNavigateToMatches={onNavigateToMatches}
            onSelectMatch={onSelectMatch}
          />
        </div>
      </div>
    </div>
  );
}

