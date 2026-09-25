import { useState } from "react";
import { Award, ChevronDown, ChevronUp, Flame } from "lucide-react";
import { MOCK_TOP_SCORERS } from "../data/mockData";

interface TopScorersWidgetProps {
  leagueId?: string | null;
}

export function TopScorersWidget({ leagueId: _leagueId }: TopScorersWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const topScorers = MOCK_TOP_SCORERS;

  if (!topScorers || topScorers.length === 0) {
    return null;
  }

  const displayedScorers = isExpanded ? topScorers : topScorers.slice(0, 5);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs animate-fade-in mb-6">
      {/* Cabeçalho */}
      <div className="bg-gradient-to-r from-slate-50 via-emerald-50/30 to-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-xs">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 tracking-wide">
                Artilharia do Campeonato
              </h3>
              <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                Fonte: GE
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Ranking oficial de artilheiros do Brasileirão Série B 2026
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
        >
          <span>{isExpanded ? "Ver Menos" : `Ver Top ${topScorers.length}`}</span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Grid de Artilheiros */}
      <div className="p-3 sm:p-4">
        {/* Pódio dos Líderes (Top 3) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          {topScorers.slice(0, 3).map((scorer, idx) => {
            const isFirst = idx === 0;
            const isSecond = idx === 1;

            const badgeBg = isFirst
              ? "bg-amber-100 text-amber-900 border-amber-300"
              : isSecond
              ? "bg-slate-200 text-slate-800 border-slate-300"
              : "bg-amber-50 text-amber-800 border-amber-200";

            const medalEmoji = isFirst ? "🥇" : isSecond ? "🥈" : "🥉";

            return (
              <div
                key={scorer._id}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                  isFirst
                    ? "bg-amber-50/50 border-amber-200/90 shadow-xs"
                    : "bg-slate-50/70 border-slate-200/90"
                }`}
              >
                {/* Posição com Medalha */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border ${badgeBg}`}
                >
                  <span>{medalEmoji}</span>
                </div>

                {/* Escudo do Clube */}
                {scorer.teamLogoUrl ? (
                  <div className="w-9 h-9 rounded-full bg-white p-1 flex items-center justify-center shrink-0 border border-slate-200 shadow-2xs">
                    <img
                      src={scorer.teamLogoUrl}
                      alt={scorer.teamName}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0">
                    {scorer.teamCode || scorer.teamName.slice(0, 2)}
                  </div>
                )}

                {/* Detalhes do Jogador */}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-slate-950 truncate">
                    {scorer.playerName}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                    <span>{scorer.teamName}</span>
                    {scorer.matches && (
                      <span className="text-[10px] text-slate-400">
                        • {scorer.matches} jogos
                      </span>
                    )}
                  </div>
                </div>

                {/* Gols */}
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-0.5 justify-end font-extrabold text-emerald-700 text-base tabular-nums">
                    <Flame className="w-3.5 h-3.5 text-emerald-600 inline" />
                    <span>{scorer.goals}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    gols
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Demais Artilheiros em Tabela Compacta */}
        {displayedScorers.length > 3 && (
          <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white divide-y divide-slate-100">
            <div className="bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500 grid grid-cols-[36px_1fr_60px] sm:grid-cols-[40px_1fr_90px_80px] items-center">
              <span className="text-center">#</span>
              <span>Jogador / Clube</span>
              <span className="text-center hidden sm:inline">Jogos</span>
              <span className="text-right pr-1">Gols</span>
            </div>

            {displayedScorers.slice(3).map((scorer) => (
              <div
                key={scorer._id}
                className="px-3 py-2 text-xs grid grid-cols-[36px_1fr_60px] sm:grid-cols-[40px_1fr_90px_80px] items-center hover:bg-slate-50/80 transition-colors"
              >
                <span className="text-center font-bold text-slate-500 text-xs">
                  {scorer.rank}º
                </span>

                <div className="flex items-center gap-2 min-w-0 pr-2">
                  {scorer.teamLogoUrl ? (
                    <img
                      src={scorer.teamLogoUrl}
                      alt=""
                      className="w-5 h-5 object-contain shrink-0"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-slate-100 text-[9px] font-bold text-slate-600 flex items-center justify-center shrink-0">
                      {scorer.teamCode?.slice(0, 1) || "T"}
                    </div>
                  )}
                  <span className="font-semibold text-slate-900 truncate">
                    {scorer.playerName}
                  </span>
                  <span className="text-slate-400 font-normal truncate hidden sm:inline">
                    • {scorer.teamName}
                  </span>
                </div>

                <span className="text-center text-slate-500 text-[11px] hidden sm:inline tabular-nums">
                  {scorer.matches ?? "-"}
                </span>

                <div className="text-right pr-1 font-bold text-slate-900 tabular-nums">
                  <span className="text-emerald-700">{scorer.goals}</span>
                  <span className="text-[10px] text-slate-400 font-normal ml-0.5">
                    gols
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
