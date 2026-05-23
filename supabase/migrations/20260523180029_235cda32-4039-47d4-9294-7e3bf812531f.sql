
CREATE TABLE public.integracoes_crm (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  provider text NOT NULL DEFAULT 'zapier',
  webhook_url text NOT NULL,
  secret text,
  headers jsonb DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  empreendimento_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  criado_por uuid
);

ALTER TABLE public.integracoes_crm ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage integracoes_crm"
  ON public.integracoes_crm FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'incorporadora'::app_role) OR public.has_role(auth.uid(), 'gerente'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'incorporadora'::app_role) OR public.has_role(auth.uid(), 'gerente'::app_role));

CREATE TRIGGER trg_integracoes_crm_updated
  BEFORE UPDATE ON public.integracoes_crm
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_integracoes_crm_ativo ON public.integracoes_crm(ativo);
