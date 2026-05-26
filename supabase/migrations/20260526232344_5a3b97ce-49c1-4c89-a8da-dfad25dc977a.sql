ALTER TABLE public.empreendimentos
  ADD COLUMN IF NOT EXISTS criterios_sorteio text[] NOT NULL DEFAULT ARRAY['menor_atendimentos','ordem_sorteio']::text[];