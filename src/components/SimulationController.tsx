import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
} from "lucide-react";

interface SimulationControllerProps {
  initialMatchId?: Id<"matches"> | null;
  onSelectMatch?: (matchId: Id<"matches">) => void;
}

export function SimulationController({
  initialMatchId,
  onSelectMatch,
}: SimulationControllerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [userSelectedMatchId, setUserSelectedMatchId] = useState<Id<"matches"> | null>(null);
  const [prevInitialId, setPrevInitialId] = useState(initialMatchId);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(5);
  const [isOperating, setIsOperating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Sincroniza se o usuário abrir um modal de partida no App
  if (initialMatchId && initialMatchId !== prevInitialId) {
    setPrevInitialId(initialMatchId);
    setUserSelectedMatchId(initialMatchId);
  }

  // Carrega todas as partidas para preencher o dropdown
  const allMatches = useQuery(api.matches.listMatches, {});

  // Filtra partidas ativas ou agendadas prioritariamente
  const candidateMatches =
    allMatches?.filter((m) =>
      ["SCHEDULED", "LIVE", "IN_PLAY", "PAUSED", "HALFTIME"].includes(m.status)
    ) || allMatches || [];

  const effectiveMatchId =
    userSelectedMatchId || (candidateMatches.length > 0 ? candidateMatches[0]._id : null);

  // Consulta o status dinâmico da simulação para a partida selecionada
  const simStatus = useQuery(
    api.simulation.getSimulationStatus,
    effectiveMatchId ? { matchId: effectiveMatchId } : "skip"
  );

  // Mutations da simulação
  const startSimulation = useMutation(api.simulation.startSimulation);
  const pauseSimulation = useMutation(api.simulation.pauseSimulation);
  const resetSimulation = useMutation(api.simulation.resetSimulation);

  const selectedMatch = allMatches?.find((m) => m._id === effectiveMatchId);

  const handleStartOrResume = async () => {
    if (!effectiveMatchId) return;
    setIsOperating(true);
    setStatusMessage(null);
    try {
      await startSimulation({
        matchId: effectiveMatchId,
        speedMultiplier,
      });
      setStatusMessage("Simulação iniciada!");
      if (onSelectMatch) onSelectMatch(effectiveMatchId);
    } catch (err: any) {
      setStatusMessage(`Erro: ${err?.message || "falha ao iniciar"}`);
    } finally {
      setIsOperating(false);
    }
  };

  const handlePause = async () => {
    if (!effectiveMatchId) return;
    setIsOperating(true);
    try {
      await pauseSimulation({ matchId: effectiveMatchId });
      setStatusMessage("Simulação pausada.");
    } catch (err: any) {
      setStatusMessage(`Erro: ${err?.message || "falha ao pausar"}`);
    } finally {
      setIsOperating(false);
    }
  };

  const handleReset = async () => {
    if (!effectiveMatchId) return;
    setIsOperating(true);
    try {
      await resetSimulation({ matchId: effectiveMatchId });
      setStatusMessage("Partida resetada para 0x0.");
    } catch (err: any) {
      setStatusMessage(`Erro: ${err?.message || "falha ao resetar"}`);
    } finally {
      setIsOperating(false);
    }
  };

  const isLive = simStatus?.isSimulating || ["LIVE", "IN_PLAY"].includes(simStatus?.status || "");
  const isPaused = simStatus?.isPaused || simStatus?.status === "PAUSED";
  const isFinished = simStatus?.status === "FINISHED";

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans">
      {/* Botão Retrátil (Pill Flutuante) quando fechado */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/95 hover:bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-700/80 backdrop-blur-md transition-all hover:scale-105 active:scale-95 group cursor-pointer"
          title="Abrir Controle de Simulação"
        >
          <span className="relative flex h-2.5 w-2.5">
            {isLive ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-400" />
            )}
          </span>

          <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300" />
          <span>Simulador TCC</span>

          {isLive && simStatus && (
            <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-[10px] text-emerald-300 font-mono">
              {simStatus.minute}' ({simStatus.homeScore}×{simStatus.awayScore})
            </span>
          )}

          <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
        </button>
      )}

      {/* Painel Expandido */}
      {isOpen && (
        <div className="w-84 sm:w-92 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  Motor de Simulação
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Reatividade em Tempo Real • Convex
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Seletor de Partida */}
          <div className="mt-3">
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Partida Alvo:
            </label>
            <select
              value={effectiveMatchId || ""}
              onChange={(e) => {
                const id = e.target.value as Id<"matches">;
                setUserSelectedMatchId(id);
                if (onSelectMatch) onSelectMatch(id);
              }}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {candidateMatches.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.league?.code ? `[${m.league.code}] ` : ""}
                  {m.homeTeam?.name || "Mandante"} × {m.awayTeam?.name || "Visitante"} (
                  {m.statusShort || m.status})
                </option>
              ))}
            </select>
          </div>

          {/* Placar e Status em Tempo Real */}
          {selectedMatch && (
            <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[100px]">
                  {selectedMatch.homeTeam?.name || "Mandante"}
                </span>

                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs font-mono font-bold text-sm text-slate-900 dark:text-white">
                  <span>{simStatus?.homeScore ?? selectedMatch.homeScore}</span>
                  <span className="text-slate-400 text-xs">×</span>
                  <span>{simStatus?.awayScore ?? selectedMatch.awayScore}</span>
                </div>

                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[100px] text-right">
                  {selectedMatch.awayTeam?.name || "Visitante"}
                </span>
              </div>

              {/* Informações da Fase e Minuto */}
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/40">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-indigo-500" />
                  <span>
                    Minuto:{" "}
                    <strong className="text-slate-700 dark:text-slate-300 font-mono">
                      {simStatus?.minute ?? selectedMatch.minute ?? 0}'
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isLive
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/60"
                        : isPaused
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-300 dark:border-amber-700/60"
                        : isFinished
                        ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                    }`}
                  >
                    {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    {simStatus?.statusShort || selectedMatch.statusShort || selectedMatch.status}
                  </span>
                </div>
              </div>

              {simStatus?.eventsCount !== undefined && simStatus.eventsCount > 0 && (
                <div className="mt-1 text-[10px] text-slate-400 text-right">
                  {simStatus.eventsCount} lances registrados
                </div>
              )}
            </div>
          )}

          {/* Seletor de Velocidade */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" />
                Velocidade do Relógio:
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {speedMultiplier}x acelerado
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 5, 10].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setSpeedMultiplier(speed)}
                  className={`py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer border ${
                    speedMultiplier === speed
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="mt-3.5 grid grid-cols-3 gap-2">
            <button
              onClick={handleStartOrResume}
              disabled={isOperating}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isPaused ? "Retomar" : isLive ? "Reiniciar" : "Iniciar"}</span>
            </button>

            <button
              onClick={handlePause}
              disabled={isOperating || !isLive}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white font-bold text-xs shadow-sm shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pausar</span>
            </button>

            <button
              onClick={handleReset}
              disabled={isOperating}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer"
              title="Resetar para 0x0 e estado agendado"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resetar</span>
            </button>
          </div>

          {/* Mensagem de Feedback */}
          {statusMessage && (
            <div className="mt-2 text-[10px] text-center text-slate-500 dark:text-slate-400 italic">
              {statusMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
