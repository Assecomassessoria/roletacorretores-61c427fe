ALTER TABLE public.empreendimentos
  ADD COLUMN IF NOT EXISTS roleta_automatica boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS roleta_auto_horarios text[] NOT NULL DEFAULT ARRAY[]::text[];