import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getEmpreendimentoAdmin } from "@/lib/empreendimentos-admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, Plus, Save, Settings2, Timer, Trash2, Users, Zap } from "lucide-react";

type Emp = {
  id: string;
  nome: string;
  horario_comercial_inicio: string | null;
  horario_comercial_fim: string | null;
  horario_matutino_inicio: string | null;
  horario_matutino_fim: string | null;
  horario_vespertino_inicio: string | null;
  horario_vespertino_fim: string | null;
  roleta_automatica: boolean;
  roleta_auto_horarios: string[];
  periodo_ausencia_minutos: number;
};

type Plantao = {
  id: string;
  corretor_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  status: string;
};

type Corretor = { id: string; nome: string; ativo: boolean };

type Periodo = "integral" | "manha" | "tarde";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: ConfiguracoesPage,
  head: () => ({
    meta: [
      { title: "Configurações de Roleta e Períodos — Roleta Corretor" },
      {
        name: "description",
        content:
          "Defina o horário do sorteio automático, o tempo de ausência e o período de plantão de cada corretor sem alterar código.",
      },
      { property: "og:title", content: "Configurações de Roleta e Períodos" },
      {
        property: "og:description",
        content: "Horário do sorteio automático e período de cada corretor, configuráveis pela gerência.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function hojeISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function hhmm(v: string | null | undefined, fallback: string) {
  return (v ?? "").slice(0, 5) || fallback;
}

function ConfiguracoesPage() {
  const getEmpAdmin = useServerFn(getEmpreendimentoAdmin);
  const [emps, setEmps] = useState<{ id: string; nome: string }[]>([]);
  const [empId, setEmpId] = useState<string>("");
  const [emp, setEmp] = useState<Emp | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [novoHorario, setNovoHorario] = useState("");
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [plantoes, setPlantoes] = useState<Plantao[]>([]);
  const data = hojeISO();

  useEffect(() => {
    supabase
      .from("empreendimentos")
      .select("id,nome")
      .eq("ativo", true)
      .order("nome")
      .then(({ data: rows, error }) => {
        if (error) return toast.error(error.message);
        setEmps((rows ?? []) as { id: string; nome: string }[]);
        if (rows?.length) setEmpId((cur) => cur || rows[0].id);
      });
  }, []);

  useEffect(() => {
    if (!empId) return;
    carregarEmp();
    carregarCorretores();
    carregarPlantoes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empId]);

  async function carregarEmp() {
    try {
      const { row } = await getEmpAdmin({ data: { id: empId } });
      setEmp(row as Emp);
      setDirty(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar empreendimento");
    }
  }

  async function carregarCorretores() {
    const { data: rows, error } = await supabase
      .from("corretores")
      .select("id,nome,ativo")
      .eq("empreendimento_id", empId)
      .eq("ativo", true)
      .order("nome");
    if (error) return toast.error(error.message);
    setCorretores((rows ?? []) as Corretor[]);
  }

  async function carregarPlantoes() {
    const { data: rows, error } = await supabase
      .from("plantoes")
      .select("id,corretor_id,data,hora_inicio,hora_fim,status")
      .eq("empreendimento_id", empId)
      .eq("data", data);
    if (error) return toast.error(error.message);
    setPlantoes((rows ?? []) as Plantao[]);
  }

  function patch<K extends keyof Emp>(k: K, v: Emp[K]) {
    setEmp((s) => (s ? { ...s, [k]: v } : s));
    setDirty(true);
  }

  async function salvar() {
    if (!emp) return;
    setSaving(true);
    const { error } = await supabase
      .from("empreendimentos")
      .update({
        roleta_automatica: emp.roleta_automatica,
        roleta_auto_horarios: emp.roleta_auto_horarios,
        periodo_ausencia_minutos: emp.periodo_ausencia_minutos,
        horario_comercial_inicio: emp.horario_comercial_inicio,
        horario_comercial_fim: emp.horario_comercial_fim,
        horario_matutino_inicio: emp.horario_matutino_inicio,
        horario_matutino_fim: emp.horario_matutino_fim,
        horario_vespertino_inicio: emp.horario_vespertino_inicio,
        horario_vespertino_fim: emp.horario_vespertino_fim,
      } as never)
      .eq("id", emp.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    setDirty(false);
    toast.success("Configurações salvas");
  }

  function adicionarHorario() {
    if (!emp) return;
    const h = novoHorario.trim();
    if (!/^\d{2}:\d{2}$/.test(h)) return toast.error("Use o formato HH:MM");
    if (emp.roleta_auto_horarios.includes(h)) return toast.message("Horário já cadastrado");
    patch("roleta_auto_horarios", [...emp.roleta_auto_horarios, h].sort());
    setNovoHorario("");
  }

  const faixas: Record<Periodo, { inicio: string; fim: string; label: string }> = useMemo(
    () => ({
      integral: {
        inicio: hhmm(emp?.horario_comercial_inicio, "09:00"),
        fim: hhmm(emp?.horario_comercial_fim, "18:00"),
        label: "Integral",
      },
      manha: {
        inicio: hhmm(emp?.horario_matutino_inicio, "09:00"),
        fim: hhmm(emp?.horario_matutino_fim, "13:30"),
        label: "Manhã",
      },
      tarde: {
        inicio: hhmm(emp?.horario_vespertino_inicio, "13:30"),
        fim: hhmm(emp?.horario_vespertino_fim, "18:00"),
        label: "Tarde",
      },
    }),
    [emp],
  );

  function periodoDoPlantao(p: Plantao): Periodo | null {
    const i = p.hora_inicio.slice(0, 5);
    const f = p.hora_fim.slice(0, 5);
    for (const key of ["integral", "manha", "tarde"] as Periodo[]) {
      if (faixas[key].inicio === i && faixas[key].fim === f) return key;
    }
    return null;
  }

  async function definirPeriodo(corretor: Corretor, periodo: Periodo) {
    const faixa = faixas[periodo];
    const atual = plantoes.find((p) => p.corretor_id === corretor.id);
    const payload = {
      empreendimento_id: empId,
      corretor_id: corretor.id,
      data,
      hora_inicio: `${faixa.inicio}:00`,
      hora_fim: `${faixa.fim}:00`,
    };
    const { error } = atual
      ? await supabase
          .from("plantoes")
          .update({ hora_inicio: payload.hora_inicio, hora_fim: payload.hora_fim } as never)
          .eq("id", atual.id)
      : await supabase.from("plantoes").insert(payload as never);
    if (error) return toast.error(error.message);
    toast.success(`${corretor.nome}: período ${faixa.label} (${faixa.inicio}–${faixa.fim})`);
    carregarPlantoes();
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Settings2 className="h-5 w-5 text-primary" /> Configurações de sorteio e períodos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Defina aqui o horário do sorteio automático e o período de cada corretor — sem precisar alterar o código.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div className="min-w-[220px]">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Empreendimento</Label>
            <Select value={empId} onValueChange={setEmpId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {emps.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={salvar} disabled={!dirty || saving}>
            <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </header>

      {!emp ? (
        <p className="text-sm text-muted-foreground">Carregando configurações…</p>
      ) : (
        <>
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
              <Zap className="h-4 w-4 text-emerald-500" /> Sorteio automático
            </h2>
            <div className="mb-4 flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className="text-sm font-medium">
                  {emp.roleta_automatica ? "Automática ATIVA" : "Manual"}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Com a opção ativa, a roleta é batida sozinha nos horários abaixo (fuso de São Paulo).
                </p>
              </div>
              <Switch
                checked={emp.roleta_automatica}
                onCheckedChange={(v) => patch("roleta_automatica", v)}
              />
            </div>

            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Horários do sorteio
            </Label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {emp.roleta_auto_horarios.length === 0 ? (
                <span className={emp.roleta_automatica ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"}>
                  {emp.roleta_automatica
                    ? "Roleta automática LIGADA, mas sem horário definido — o sorteio não vai acontecer. Cadastre ao menos um horário."
                    : "Nenhum horário definido."}
                </span>
              ) : (
                emp.roleta_auto_horarios.map((h) => (
                  <Badge key={h} variant="outline" className="gap-1.5 py-1 text-sm">
                    <Clock className="h-3.5 w-3.5" /> {h}
                    <button
                      type="button"
                      className="ml-1 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        patch("roleta_auto_horarios", emp.roleta_auto_horarios.filter((x) => x !== h))
                      }
                      aria-label={`Remover horário ${h}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Input
                type="time"
                className="w-36"
                value={novoHorario}
                onChange={(e) => setNovoHorario(e.target.value)}
              />
              <Button variant="outline" onClick={adicionarHorario}>
                <Plus className="mr-1.5 h-4 w-4" /> Adicionar horário
              </Button>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
              <Timer className="h-4 w-4 text-amber-500" /> Períodos e tempo de ausência
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <FaixaCard
                titulo="Integral (comercial)"
                inicio={emp.horario_comercial_inicio}
                fim={emp.horario_comercial_fim}
                onChange={(i, f) => {
                  patch("horario_comercial_inicio", i);
                  patch("horario_comercial_fim", f);
                }}
              />
              <FaixaCard
                titulo="Manhã (matutino)"
                inicio={emp.horario_matutino_inicio}
                fim={emp.horario_matutino_fim}
                onChange={(i, f) => {
                  patch("horario_matutino_inicio", i);
                  patch("horario_matutino_fim", f);
                }}
              />
              <FaixaCard
                titulo="Tarde (vespertino)"
                inicio={emp.horario_vespertino_inicio}
                fim={emp.horario_vespertino_fim}
                onChange={(i, f) => {
                  patch("horario_vespertino_inicio", i);
                  patch("horario_vespertino_fim", f);
                }}
              />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Período de ausência
              </Label>
              <Input
                type="number"
                min={5}
                max={240}
                step={5}
                className="w-28"
                value={emp.periodo_ausencia_minutos ?? 60}
                onChange={(e) =>
                  patch(
                    "periodo_ausencia_minutos",
                    Math.max(5, Math.min(240, Number(e.target.value) || 60)),
                  )
                }
              />
              <span className="text-sm text-muted-foreground">minutos fora do raio → Ausente</span>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
              <Users className="h-4 w-4 text-primary" /> Período de cada corretor — {data.split("-").reverse().join("/")}
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Aplica o horário do plantão de hoje conforme as faixas configuradas acima. Salve as faixas antes de aplicar.
            </p>
            {corretores.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum corretor ativo neste empreendimento.</p>
            ) : (
              <ul className="divide-y divide-border">
                {corretores.map((c) => {
                  const p = plantoes.find((x) => x.corretor_id === c.id);
                  const atual = p ? periodoDoPlantao(p) : null;
                  return (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                      <div>
                        <div className="text-sm font-medium">{c.nome}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {p
                            ? `Hoje: ${p.hora_inicio.slice(0, 5)}–${p.hora_fim.slice(0, 5)}${atual ? ` (${faixas[atual].label})` : ""}`
                            : "Sem plantão hoje"}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        {(["integral", "manha", "tarde"] as Periodo[]).map((k) => (
                          <Button
                            key={k}
                            size="sm"
                            variant={atual === k ? "default" : "outline"}
                            onClick={() => definirPeriodo(c, k)}
                          >
                            {faixas[k].label}
                          </Button>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function FaixaCard({
  titulo,
  inicio,
  fim,
  onChange,
}: {
  titulo: string;
  inicio: string | null;
  fim: string | null;
  onChange: (i: string | null, f: string | null) => void;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider">{titulo}</h3>
      <div className="flex items-center gap-2">
        <Input type="time" value={inicio?.slice(0, 5) ?? ""} onChange={(e) => onChange(e.target.value || null, fim)} />
        <span className="text-muted-foreground">–</span>
        <Input type="time" value={fim?.slice(0, 5) ?? ""} onChange={(e) => onChange(inicio, e.target.value || null)} />
      </div>
    </div>
  );
}
