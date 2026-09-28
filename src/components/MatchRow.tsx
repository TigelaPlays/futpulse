import type { Id } from "../../convex/_generated/dataModel";
import { Star, Clock } from "lucide-react";
import { LiveMatchClock } from "./LiveMatchClock";
import { getNationFlagUrl } from "../utils/flagsNationsAssets";

export interface MatchRowProps {
  match: any;
  isFavorite: boolean;
  isFavoriteBlock?: boolean;
  onToggleFavorite: (e: React.MouseEvent, matchId: string) => void;
  onSelectMatch: (matchId: Id<"matches">) => void;
}

export function MatchRow({
  match,
  isFavorite,
  isFavoriteBlock = false,
  onToggleFavorite,
  onSelectMatch,
}: MatchRowProps) {
  const isLive = [
    "IN_PLAY",
    "LIVE",
    "HALFTIME",
    "PAUSED",
    "EXTRA_TIME",
    "PENALTY_SHOOTOUT",
  ].includes(match.status);
  const isFinished = match.status === "FINISHED";
  const homeWon = isFinished && match.homeScore > match.awayScore;
  const awayWon = isFinished && match.awayScore > match.homeScore;

  const homeEvents = match.events?.filter((e: any) => e.teamId === match.homeTeamId) || [];
  const awayEvents = match.events?.filter((e: any) => e.teamId === match.awayTeamId) || [];
  const hasEvents = homeEvents.length > 0 || awayEvents.length > 0;

  const homeLogo = match.homeTeam?.name
    ? getNationFlagUrl(match.homeTeam.name, match.homeTeam.logoUrl)
    : match.homeTeam?.logoUrl;
  const awayLogo = match.awayTeam?.name
    ? getNationFlagUrl(match.awayTeam.name, match.awayTeam.logoUrl)
    : match.awayTeam?.logoUrl;

  return (
    <div
      onClick={() => onSelectMatch(match._id)}
      className="p-3 sm:p-3.5 hover:bg-slate-50/90 transition-colors border-b border-slate-100 last:border-b-0 cursor-pointer"
    >
      {/* Layout Desktop / Tablet (md e acima): 3 Zonas Estritamente Simétricas [140px | 1fr | 140px] */}
      <div className="hidden md:grid grid-cols-[140px_1fr_140px] items-center gap-3">
        {/* Asa Esquerda (140px): Favorito + Relógio/Status */}
        <div className="flex items-center gap-2 min-w-0 justify-start">
          <button
            type="button"
            onClick={(e) => onToggleFavorite(e, match._id)}
            className="p-1 text-slate-400 hover:text-amber-500 transition-colors cursor-pointer shrink-0"
            title={isFavorite ? "Remover dos favoritos" : "Favoritar partida"}
          >
            <Star
              className={`w-4 h-4 ${
                isFavorite
                  ? "fill-amber-400 text-amber-500"
                  : "text-slate-300 hover:text-slate-500"
              }`}
            />
          </button>

          {isLive ? (
            <LiveMatchClock
              initialMinute={match.minute}
              status={match.status}
              statusShort={match.statusShort}
              updatedAt={match.elapsedSecondsUpdatedAt ?? match._creationTime}
            />
          ) : match.status === "POSTPONED" ? (
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md shadow-2xs">
              Adiado
            </span>
          ) : isFinished ? (
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md shadow-2xs">
              Fim
            </span>
          ) : (
            <div className="flex items-center gap-1 text-xs text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {new Date(match.startTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>

        {/* Zona Central (1fr): Confronto 100% Centralizado matematicamente */}
        <div className="flex items-center justify-center w-full max-w-xl mx-auto min-w-0 px-2">
          {/* Mandante (50% do espaço, alinhado à direita) */}
          <div className="flex-1 flex items-center justify-end gap-2.5 min-w-0 text-right">
            <span
              className={`text-sm truncate transition-colors ${
                homeWon
                  ? "font-bold text-slate-950"
                  : isFinished
                  ? "font-normal text-slate-500"
                  : "font-semibold text-slate-800"
              }`}
              title={match.homeTeam?.name}
            >
              {match.homeTeam?.name}
            </span>
            {homeLogo ? (
              <img
                src={homeLogo}
                alt={match.homeTeam?.name ?? "Mandante"}
                className="w-6 h-6 object-contain shrink-0"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                {match.homeTeam?.name?.charAt(0) ?? "M"}
              </div>
            )}
          </div>

          {/* Placar Central (Largura Fixa de 80px para ancorar a simetria de todas as linhas) */}
          <div className="w-20 shrink-0 flex justify-center items-center px-1">
            {match.status === "SCHEDULED" ? (
              <span className="text-[11px] text-slate-500 font-bold tracking-widest px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                VS
              </span>
            ) : (
              <div
                className={`w-16 py-0.5 rounded-lg font-mono tabular-nums font-bold text-sm flex items-center justify-center gap-1 shadow-2xs border transition-all ${
                  isLive
                    ? "bg-emerald-600 border-emerald-700 text-white shadow-xs"
                    : "bg-slate-100 border-slate-200 text-slate-900"
                }`}
              >
                <span>{match.homeScore}</span>
                <span className={`${isLive ? "text-emerald-200" : "text-slate-400"} font-sans text-xs`}>-</span>
                <span>{match.awayScore}</span>
              </div>
            )}
          </div>

          {/* Visitante (50% do espaço, alinhado à esquerda) */}
          <div className="flex-1 flex items-center justify-start gap-2.5 min-w-0 text-left">
            {awayLogo ? (
              <img
                src={awayLogo}
                alt={match.awayTeam?.name ?? "Visitante"}
                className="w-6 h-6 object-contain shrink-0"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                {match.awayTeam?.name?.charAt(0) ?? "V"}
              </div>
            )}
            <span
              className={`text-sm truncate transition-colors ${
                awayWon
                  ? "font-bold text-slate-950"
                  : isFinished
                  ? "font-normal text-slate-500"
                  : "font-semibold text-slate-800"
              }`}
              title={match.awayTeam?.name}
            >
              {match.awayTeam?.name}
            </span>
          </div>
        </div>

        {/* Asa Direita (140px): Rótulo de Rodada ou Liga para manter equilíbrio */}
        <div className="flex items-center justify-end gap-1.5 min-w-0">
          <span className="text-[11px] font-medium text-slate-500 bg-slate-100/90 px-2 py-0.5 rounded border border-slate-200/70 truncate max-w-[130px]">
            {isFavoriteBlock ? (match.league?.name || match.round) : match.round}
          </span>
        </div>
      </div>

      {/* Eventos da Partida (Gols e Cartões) no Desktop: Lado a Lado preservando os times */}
      {hasEvents && (
        <div className="hidden md:grid grid-cols-[140px_1fr_140px] items-start gap-3 mt-2 pt-2 border-t border-slate-100 text-xs">
          <div />
          <div className="w-full max-w-xl mx-auto px-2 grid grid-cols-2 gap-6">
            {/* Lado do Mandante (Alinhado à direita) */}
            <div className="space-y-1 text-right">
              {homeEvents.map((ev: any, idx: number) => {
                const isGoal = ev.type === "GOAL";
                const isRed = ev.type === "RED_CARD";
                const isPenalty = ev.detail?.toLowerCase().includes("pen");
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-end gap-1.5 text-[11px] text-slate-600"
                  >
                    <span className="font-medium text-slate-800 truncate">
                      {ev.playerName}
                      {isPenalty && (
                        <span className="text-slate-400 text-[10px]"> (P)</span>
                      )}
                    </span>
                    <span className="text-slate-400 text-[10px] font-mono">
                      {ev.minute}
                      {ev.extraMinute ? `+${ev.extraMinute}` : ""}′
                    </span>
                    <span className="text-xs shrink-0 select-none">
                      {isGoal ? "⚽" : isRed ? "🟥" : "🟨"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Lado do Visitante (Alinhado à esquerda) */}
            <div className="space-y-1 text-left">
              {awayEvents.map((ev: any, idx: number) => {
                const isGoal = ev.type === "GOAL";
                const isRed = ev.type === "RED_CARD";
                const isPenalty = ev.detail?.toLowerCase().includes("pen");
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-start gap-1.5 text-[11px] text-slate-600"
                  >
                    <span className="text-xs shrink-0 select-none">
                      {isGoal ? "⚽" : isRed ? "🟥" : "🟨"}
                    </span>
                    <span className="text-slate-400 text-[10px] font-mono">
                      {ev.minute}
                      {ev.extraMinute ? `+${ev.extraMinute}` : ""}′
                    </span>
                    <span className="font-medium text-slate-800 truncate">
                      {ev.playerName}
                      {isPenalty && (
                        <span className="text-slate-400 text-[10px]"> (P)</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div />
        </div>
      )}

      {/* Layout Mobile (< md): Card Compacto e Fluido */}
      <div className="md:hidden space-y-2">
        {/* Topo: Status + Favorito + Rodada */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => onToggleFavorite(e, match._id)}
              className="p-1 text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  isFavorite
                    ? "fill-amber-400 text-amber-500"
                    : "text-slate-300"
                }`}
              />
            </button>
            {isLive ? (
              <LiveMatchClock
                initialMinute={match.minute}
                status={match.status}
                statusShort={match.statusShort}
                updatedAt={match.elapsedSecondsUpdatedAt ?? match._creationTime}
              />
            ) : isFinished ? (
              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                Fim
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 font-medium">
                {new Date(match.startTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 truncate max-w-[150px]">
            {isFavoriteBlock ? (match.league?.name || match.round) : match.round}
          </span>
        </div>

        {/* Confronto Simétrico em 3 Colunas */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {/* Mandante */}
          <div className="flex items-center justify-end gap-1.5 min-w-0 text-right">
            <span
              className={`text-xs truncate max-w-[95px] sm:max-w-[140px] ${
                homeWon
                  ? "font-bold text-slate-950"
                  : isFinished
                  ? "font-normal text-slate-500"
                  : "font-semibold text-slate-800"
              }`}
            >
              {match.homeTeam?.name}
            </span>
            {homeLogo ? (
              <img
                src={homeLogo}
                alt=""
                className="w-5 h-5 object-contain shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-[9px] font-bold text-slate-600 shrink-0">
                {match.homeTeam?.name?.charAt(0) ?? "M"}
              </div>
            )}
          </div>

          {/* Placar */}
          <div className="flex justify-center shrink-0">
            {match.status === "SCHEDULED" ? (
              <span className="text-[10px] text-slate-500 font-bold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                VS
              </span>
            ) : (
              <div
                className={`px-2 py-0.5 rounded font-mono font-bold text-xs flex items-center gap-1 ${
                  isLive
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-900 border border-slate-200"
                }`}
              >
                <span>{match.homeScore}</span>
                <span className="text-slate-400 text-[10px]">-</span>
                <span>{match.awayScore}</span>
              </div>
            )}
          </div>

          {/* Visitante */}
          <div className="flex items-center justify-start gap-1.5 min-w-0 text-left">
            {awayLogo ? (
              <img
                src={awayLogo}
                alt=""
                className="w-5 h-5 object-contain shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-[9px] font-bold text-slate-600 shrink-0">
                {match.awayTeam?.name?.charAt(0) ?? "V"}
              </div>
            )}
            <span
              className={`text-xs truncate max-w-[95px] sm:max-w-[140px] ${
                awayWon
                  ? "font-bold text-slate-950"
                  : isFinished
                  ? "font-normal text-slate-500"
                  : "font-semibold text-slate-800"
              }`}
            >
              {match.awayTeam?.name}
            </span>
          </div>
        </div>

        {/* Eventos da Partida Mobile: Lado a Lado preservando os times */}
        {hasEvents && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-[10px]">
            {/* Mandante */}
            <div className="space-y-1 text-right">
              {homeEvents.map((ev: any, idx: number) => {
                const isGoal = ev.type === "GOAL";
                const isRed = ev.type === "RED_CARD";
                const isPenalty = ev.detail?.toLowerCase().includes("pen");
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-end gap-1 text-slate-600 truncate"
                  >
                    <span className="font-medium text-slate-800 truncate">
                      {ev.playerName}
                      {isPenalty && " (P)"}
                    </span>
                    <span className="text-slate-400 text-[9px] font-mono">
                      {ev.minute}′
                    </span>
                    <span className="text-[11px] select-none">
                      {isGoal ? "⚽" : isRed ? "🟥" : "🟨"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Visitante */}
            <div className="space-y-1 text-left">
              {awayEvents.map((ev: any, idx: number) => {
                const isGoal = ev.type === "GOAL";
                const isRed = ev.type === "RED_CARD";
                const isPenalty = ev.detail?.toLowerCase().includes("pen");
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-start gap-1 text-slate-600 truncate"
                  >
                    <span className="text-[11px] select-none">
                      {isGoal ? "⚽" : isRed ? "🟥" : "🟨"}
                    </span>
                    <span className="text-slate-400 text-[9px] font-mono">
                      {ev.minute}′
                    </span>
                    <span className="font-medium text-slate-800 truncate">
                      {ev.playerName}
                      {isPenalty && " (P)"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
