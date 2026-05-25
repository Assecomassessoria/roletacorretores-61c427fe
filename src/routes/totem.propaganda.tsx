import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Pause, Play, Maximize2 } from "lucide-react";

type Propaganda = {
  id: string;
  titulo: string;
  midia_url: string;
  midia_tipo: "image" | "video";
  duracao_segundos: number;
  ordem: number;
  ativo: boolean;
};

type Emp = { id: string; nome: string; modo_propaganda: boolean };

export const Route = createFileRoute("/totem/propaganda")({
  component: TotemPropagandaPage,
  validateSearch: (s: Record<string, unknown>) => ({ emp: typeof s.emp === "string" ? s.emp : "" }),
  head: () => ({ meta: [
    { title: "Totem — Propaganda do empreendimento" },
    { name: "robots", content: "noindex" },
  ] }),
});

function TotemPropagandaPage() {
  const { emp: empId } = Route.useSearch();
  const [emp, setEmp] = useState<Emp | null>(null);
  const [propagandas, setPropagandas] = useState<Propaganda[]>([]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!empId) return;
    void (async () => {
      const [{ data: e }, { data: ps }] = await Promise.all([
        supabase.from("empreendimentos").select("id,nome,modo_propaganda").eq("id", empId).single(),
        (supabase as any).from("propagandas").select("*")
          .eq("empreendimento_id", empId).eq("ativo", true).order("ordem"),
      ]);
      if (e) setEmp(e as Emp);
      setPropagandas((ps ?? []) as Propaganda[]);
    })();
  }, [empId]);

  const ativa = useMemo(() => propagandas[idx % Math.max(propagandas.length, 1)] ?? null, [propagandas, idx]);

  useEffect(() => {
    if (paused || propagandas.length === 0) return;
    if (ativa?.midia_tipo === "video") return; // vídeo avança no onEnded
    const ms = Math.max(2, ativa?.duracao_segundos ?? 8) * 1000;
    timerRef.current = window.setTimeout(() => setIdx((i) => i + 1), ms);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [ativa, paused, propagandas.length]);

  function enterFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) void el.requestFullscreen();
  }

  if (!empId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        Faltou o parâmetro <code className="mx-2 rounded bg-white/10 px-2 py-0.5">?emp=&lt;id&gt;</code>
      </main>
    );
  }

  if (!emp?.modo_propaganda) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-black text-white">
        <h1 className="text-2xl font-bold">{emp?.nome ?? "—"}</h1>
        <p className="text-sm text-white/70">Modo Propaganda está desligado para este empreendimento.</p>
      </main>
    );
  }

  if (propagandas.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-black text-white">
        <h1 className="text-2xl font-bold">{emp.nome}</h1>
        <p className="text-sm text-white/70">Nenhuma mídia ativa cadastrada.</p>
      </main>
    );
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      {ativa?.midia_tipo === "image" ? (
        <img
          src={ativa.midia_url}
          alt={ativa.titulo}
          className="h-full w-full object-contain"
        />
      ) : ativa ? (
        <video
          ref={videoRef}
          key={ativa.id}
          src={ativa.midia_url}
          autoPlay
          muted
          playsInline
          onEnded={() => setIdx((i) => i + 1)}
          className="h-full w-full object-contain"
        />
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-6 py-4 text-white">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-white/60">Empreendimento</div>
          <div className="text-lg font-bold">{emp.nome}</div>
        </div>
        <div className="text-right text-xs text-white/70">
          {idx % propagandas.length + 1} / {propagandas.length} · {ativa?.titulo}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/80 to-transparent px-6 py-4">
        <Button
          size="lg"
          variant={paused ? "default" : "secondary"}
          onClick={() => {
            setPaused((p) => !p);
            if (videoRef.current) paused ? videoRef.current.play() : videoRef.current.pause();
          }}
        >
          {paused ? (<><Play className="mr-1 h-4 w-4" /> Retomar propaganda</>) : (<><Pause className="mr-1 h-4 w-4" /> Pausar (iniciar atendimento)</>)}
        </Button>
        <Button size="lg" variant="outline" onClick={enterFullscreen}>
          <Maximize2 className="mr-1 h-4 w-4" /> Tela cheia
        </Button>
      </div>
    </main>
  );
}
