
ALTER TABLE public.empreendimentos
  ADD COLUMN IF NOT EXISTS periodo_ausencia_minutos integer NOT NULL DEFAULT 60;

ALTER TABLE public.plantoes
  ADD COLUMN IF NOT EXISTS ultimo_ping_em timestamptz,
  ADD COLUMN IF NOT EXISTS fora_desde timestamptz,
  ADD COLUMN IF NOT EXISTS status_presenca text NOT NULL DEFAULT 'presente';

CREATE INDEX IF NOT EXISTS idx_plantoes_emp_data ON public.plantoes (empreendimento_id, data);
