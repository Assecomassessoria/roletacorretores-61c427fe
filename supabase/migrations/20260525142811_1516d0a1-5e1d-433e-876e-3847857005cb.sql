
-- 1) Column-level grants on empreendimentos — hide sensitive cols from authenticated
REVOKE SELECT ON public.empreendimentos FROM authenticated;
GRANT SELECT (
  id, nome, endereco, latitude, longitude, raio_metros, ativo, criado_por,
  created_at, updated_at, metodos_presenca, pin_intervalo_min, cnpj,
  ciclo_roleta, horario_comercial_inicio, horario_comercial_fim,
  horario_matutino_inicio, horario_matutino_fim,
  horario_vespertino_inicio, horario_vespertino_fim,
  regras_pdf_url, whatsapp_grupo_url,
  equipe_alfa_nome, equipe_beta_nome,
  roleta_automatica, roleta_auto_horarios,
  logo_url, cor_primaria, cor_secundaria, cor_destaque
) ON public.empreendimentos TO authenticated;
-- Sensitive (wifi_ssid, qrcode_token, ip_homologado) intentionally omitted.
-- Admin server functions use service-role client (supabaseAdmin) which bypasses grants.

-- 2) Escala — restringe claim a hoje ou futuro
DROP POLICY IF EXISTS "corretor claim empty escala" ON public.escala_semanal;
CREATE POLICY "corretor claim empty escala"
ON public.escala_semanal
FOR UPDATE
TO authenticated
USING (
  corretor_id IS NULL
  AND data >= (now() AT TIME ZONE 'America/Sao_Paulo')::date
  AND EXISTS (
    SELECT 1 FROM public.corretores c
    WHERE c.empreendimento_id = escala_semanal.empreendimento_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.corretores c
    WHERE c.id = escala_semanal.corretor_id
      AND c.user_id = auth.uid()
      AND c.empreendimento_id = escala_semanal.empreendimento_id
  )
);

-- 3) plantao-regras storage policy — escopo por empreendimento
DROP POLICY IF EXISTS "plantao-regras read" ON storage.objects;
CREATE POLICY "plantao-regras read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'plantao-regras'
  AND (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'incorporadora'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.empreendimentos e
      WHERE e.id::text = split_part(name, '/', 1)
        AND user_in_empreendimento(auth.uid(), e.id)
    )
  )
);

-- 4) Tabela para anti brute-force do check-in público
CREATE TABLE IF NOT EXISTS public.checkin_falhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empreendimento_id uuid NOT NULL,
  creci text NOT NULL,
  tentativa_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_checkin_falhas_lookup
  ON public.checkin_falhas (empreendimento_id, creci, tentativa_em DESC);

ALTER TABLE public.checkin_falhas ENABLE ROW LEVEL SECURITY;
-- Sem políticas: somente service_role acessa via supabaseAdmin.

-- 5) Restringe EXECUTE de funções utilitárias (mantém o que o frontend precisa)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_escala_semanal() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_log_set_email() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.plantoes_corretor_presence_guard() FROM PUBLIC, anon, authenticated;
-- has_role / has_role_in_empreendimento / user_in_empreendimento / is_master / assinatura_status mantêm EXECUTE: são usadas por policies e RPCs autenticadas.
