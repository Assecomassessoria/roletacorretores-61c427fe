-- Ampliar leitura de audit_log para gerência (além de master)
DROP POLICY IF EXISTS "master read audit_log" ON public.audit_log;

CREATE POLICY "master e gerencia leem audit_log"
ON public.audit_log
FOR SELECT
TO authenticated
USING (
  public.is_master(auth.uid())
  OR public.has_role(auth.uid(), 'gerente'::app_role)
  OR public.has_role(auth.uid(), 'incorporadora'::app_role)
);