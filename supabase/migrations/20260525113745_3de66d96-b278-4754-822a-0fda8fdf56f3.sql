
CREATE TABLE public.sugestoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  whatsapp text NOT NULL,
  email text,
  mensagem text NOT NULL,
  origem text DEFAULT 'plantao',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sugestoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer pessoa pode enviar sugestao"
ON public.sugestoes FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(nome) BETWEEN 1 AND 120
  AND char_length(whatsapp) BETWEEN 8 AND 30
  AND char_length(mensagem) BETWEEN 1 AND 4000
);

CREATE POLICY "Master/Gerencia podem ler sugestoes"
ON public.sugestoes FOR SELECT TO authenticated
USING (
  public.is_master_email((auth.jwt() ->> 'email'))
  OR public.has_role(auth.uid(), 'gerente')
  OR public.has_role(auth.uid(), 'coordenador')
  OR public.has_role(auth.uid(), 'incorporadora')
);
