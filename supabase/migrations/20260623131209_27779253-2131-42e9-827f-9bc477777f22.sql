
-- 1) biometric_tokens & webauthn_challenges: explicit deny policies make the
-- service-role-only intent explicit and clear the linter (RLS on, no policy).
CREATE POLICY "deny all authenticated reads"
  ON public.biometric_tokens
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "deny all authenticated reads"
  ON public.webauthn_challenges
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

-- 2) corretores.cpf — restrict column read to admin roles via column-level GRANT.
-- Service role and admin server functions still read freely (service_role bypasses).
REVOKE SELECT ON public.corretores FROM authenticated;
GRANT SELECT
  (id, nome, creci, telefone, email, empreendimento_id, ordem_roleta,
   ativo, user_id, foto_url, created_at, updated_at, status_habilitacao, equipe)
  ON public.corretores TO authenticated;
-- cpf is intentionally NOT granted to authenticated; read it server-side
-- through service-role admin functions only.

-- 3) email_log — tighten SELECT to incorporadora/master only; remove gerente
-- exposure of recipient addresses.
DROP POLICY IF EXISTS "scoped read email_log" ON public.email_log;
CREATE POLICY "admin read email_log"
  ON public.email_log
  FOR SELECT
  TO authenticated
  USING (
    is_master(auth.uid())
    OR (
      empreendimento_id IS NOT NULL
      AND has_role_in_empreendimento(auth.uid(), 'incorporadora'::app_role, empreendimento_id)
    )
  );
