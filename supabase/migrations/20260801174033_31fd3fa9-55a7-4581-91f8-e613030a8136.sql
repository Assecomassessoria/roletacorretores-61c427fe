CREATE TABLE public.ausencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plantao_id uuid NOT NULL REFERENCES public.plantoes(id) ON DELETE CASCADE,
  corretor_id uuid NOT NULL REFERENCES public.corretores(id) ON DELETE CASCADE,
  empreendimento_id uuid NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  data date NOT NULL,
  inicio timestamptz NOT NULL,
  fim timestamptz,
  duracao_minutos integer,
  origem text NOT NULL DEFAULT 'automatica',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ausencias TO authenticated;
GRANT ALL ON public.ausencias TO service_role;

ALTER TABLE public.ausencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros do empreendimento podem ver ausencias"
ON public.ausencias FOR SELECT TO authenticated
USING (public.user_in_empreendimento(auth.uid(), empreendimento_id));

CREATE INDEX idx_ausencias_emp_data ON public.ausencias (empreendimento_id, data);
CREATE INDEX idx_ausencias_plantao ON public.ausencias (plantao_id);
CREATE UNIQUE INDEX idx_ausencias_aberta ON public.ausencias (plantao_id) WHERE fim IS NULL;

CREATE TRIGGER trg_ausencias_updated_at
BEFORE UPDATE ON public.ausencias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();