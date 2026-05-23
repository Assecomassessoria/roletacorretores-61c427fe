-- Tabela de configuração das opções de triagem (editável pela Incorporadora)
CREATE TABLE public.opcoes_triagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  label text NOT NULL,
  action text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.opcoes_triagem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read opcoes_triagem"
  ON public.opcoes_triagem FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins manage opcoes_triagem"
  ON public.opcoes_triagem FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'incorporadora'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
  WITH CHECK (has_role(auth.uid(), 'incorporadora'::app_role) OR has_role(auth.uid(), 'gerente'::app_role));

CREATE TRIGGER trg_opcoes_triagem_updated
  BEFORE UPDATE ON public.opcoes_triagem
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed das 5 opções da Lorenza
INSERT INTO public.opcoes_triagem (codigo, label, action, ordem) VALUES
  ('A', 'Atendido por corretor', 'verificar_presenca', 1),
  ('B', 'Primeira visita', 'alocar_roleta', 2),
  ('C', 'Retorno', 'verificar_presenca_ou_redirecionar', 3),
  ('D', 'Outros serviços', 'encaminhar_coordenador', 4),
  ('E', 'Corretor visitante', 'cadastrar_visitante', 5);

-- Tabela de triagens registradas (histórico)
CREATE TABLE public.triagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atendimento_id uuid REFERENCES public.atendimentos(id) ON DELETE CASCADE,
  empreendimento_id uuid NOT NULL,
  opcao_codigo text NOT NULL,
  acao text NOT NULL,
  origem text NOT NULL DEFAULT 'painel',
  cliente_nome text,
  cliente_telefone text,
  payload jsonb,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_triagens_atendimento ON public.triagens(atendimento_id);
CREATE INDEX idx_triagens_empreendimento ON public.triagens(empreendimento_id);
CREATE INDEX idx_triagens_created_at ON public.triagens(created_at DESC);

ALTER TABLE public.triagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read triagens"
  ON public.triagens FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'incorporadora'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'coordenador'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.atendimentos a
      JOIN public.corretores c ON c.id = a.corretor_id
      WHERE a.id = triagens.atendimento_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "admins insert triagens"
  ON public.triagens FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'incorporadora'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'coordenador'::app_role)
  );