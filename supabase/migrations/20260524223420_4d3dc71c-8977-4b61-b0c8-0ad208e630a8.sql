
ALTER TABLE public.triagens
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'aguardando';

CREATE INDEX IF NOT EXISTS idx_triagens_status ON public.triagens(status);

-- Função pública (SECURITY DEFINER) que retorna apenas o status mínimo de uma triagem
-- para o totem do cliente. Não expõe payload nem dados de auditoria.
CREATE OR REPLACE FUNCTION public.triagem_status_publico(_triagem_id uuid)
RETURNS TABLE(id uuid, status text, cliente_nome text, atendimento_id uuid, opcao_codigo text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, status, cliente_nome, atendimento_id, opcao_codigo, created_at
  FROM public.triagens
  WHERE id = _triagem_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.triagem_status_publico(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.triagem_status_publico(uuid) TO anon, authenticated;
