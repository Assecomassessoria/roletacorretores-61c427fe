ALTER TABLE public.empreendimentos
  ADD COLUMN IF NOT EXISTS fila_oficial_data date,
  ADD COLUMN IF NOT EXISTS fila_oficial_ids uuid[];