-- Permitir múltiplos corretores no mesmo dia/equipe (mesmo empreendimento).
-- Remove a restrição que limitava 1 linha por (empreendimento, equipe, data)
-- e cria uma nova garantindo que o mesmo corretor não duplique o mesmo dia.

ALTER TABLE public.escala_semanal
  DROP CONSTRAINT IF EXISTS escala_semanal_empreendimento_id_equipe_data_key;

CREATE UNIQUE INDEX IF NOT EXISTS escala_semanal_emp_equipe_data_corretor_uidx
  ON public.escala_semanal (empreendimento_id, equipe, data, corretor_id)
  WHERE corretor_id IS NOT NULL;