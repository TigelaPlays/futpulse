import { useEffect, useState } from "react";

interface LiveMatchClockProps {
  initialMinute?: number;
  status: string;
  statusShort: string;
  updatedAt?: number;
}

export function LiveMatchClock({
  initialMinute = 0,
  status,
  statusShort,
  updatedAt,
}: LiveMatchClockProps) {
  const isRunning = status === "IN_PLAY" || status === "EXTRA_TIME";

  // Calcula os segundos acumulados apenas dentro da tolerância razoável (máximo 5 minutos de avanço desde o último sync)
  const getElapsedSeconds = () => {
    const baseSeconds = initialMinute * 60;
    if (!isRunning || !updatedAt) return baseSeconds;

    const diffSeconds = Math.floor((Date.now() - updatedAt) / 1000);
    // Se a diferença for superior a 5 minutos (ex: dados guardados há horas), não soma para não estourar o relógio
    if (diffSeconds > 300 || diffSeconds < 0) {
      return baseSeconds;
    }

    return baseSeconds + diffSeconds;
  };

  const [totalSeconds, setTotalSeconds] = useState(getElapsedSeconds);
  const [prevSync, setPrevSync] = useState({ initialMinute, updatedAt, statusShort, status });

  // Sincroniza o estado durante o render quando as props do Convex/API forem atualizadas
  if (
    prevSync.initialMinute !== initialMinute ||
    prevSync.updatedAt !== updatedAt ||
    prevSync.statusShort !== statusShort ||
    prevSync.status !== status
  ) {
    setPrevSync({ initialMinute, updatedAt, statusShort, status });
    setTotalSeconds(getElapsedSeconds());
  }

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTotalSeconds((prev) => {
        const next = prev + 1;
        // Limite padrão: não ultrapassa 45' na 1H ou 90' na 2H via relógio local até vir confirmação da API
        if (statusShort === "1H" && next > 45 * 60) return 45 * 60;
        if (statusShort === "2H" && next > 90 * 60) return 90 * 60;
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, statusShort]);

  // Se estiver no intervalo ou pausado
  if (statusShort === "HT" || status === "PAUSED") {
    return (
      <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        <span>Intervalo</span>
      </div>
    );
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formattedSeconds = seconds.toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-bold text-xs bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="tabular-nums">
        {minutes}:{formattedSeconds}
      </span>
      <span className="text-[10px] text-emerald-300/80 font-sans font-semibold uppercase">
        {statusShort}
      </span>
    </div>
  );
}