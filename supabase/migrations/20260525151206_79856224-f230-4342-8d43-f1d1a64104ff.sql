DROP POLICY IF EXISTS "Master/Gerencia podem ler sugestoes" ON public.sugestoes;

CREATE POLICY "Apenas master le sugestoes"
ON public.sugestoes
FOR SELECT
TO authenticated
USING (is_master(auth.uid()));