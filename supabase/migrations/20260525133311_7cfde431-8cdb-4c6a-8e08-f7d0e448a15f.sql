
ALTER TABLE public.escala_semanal
  ADD COLUMN IF NOT EXISTS periodos text[] NOT NULL DEFAULT ARRAY['manha','tarde'];

ALTER TABLE public.escala_semanal
  ADD CONSTRAINT escala_semanal_periodos_chk
  CHECK (
    array_length(periodos, 1) >= 1
    AND periodos <@ ARRAY['manha','tarde']
  );
