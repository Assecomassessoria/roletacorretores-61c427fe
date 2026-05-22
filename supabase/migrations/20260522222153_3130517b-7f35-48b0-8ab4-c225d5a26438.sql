
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('incorporadora', 'gerente', 'coordenador', 'corretor');
CREATE TYPE public.plantao_status AS ENUM ('agendado', 'em_andamento', 'concluido', 'cancelado');
CREATE TYPE public.atendimento_status AS ENUM ('aberto', 'em_negociacao', 'fechado', 'perdido', 'transferido');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  telefone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ EMPREENDIMENTOS ============
CREATE TABLE public.empreendimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  endereco TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  raio_metros INTEGER NOT NULL DEFAULT 100,
  wifi_ssid TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.empreendimentos ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  empreendimento_id UUID REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, empreendimento_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role: SECURITY DEFINER para evitar recursão
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role_in_empreendimento(
  _user_id UUID, _role public.app_role, _empreendimento_id UUID
) RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (empreendimento_id = _empreendimento_id OR empreendimento_id IS NULL)
  );
$$;

-- ============ CORRETORES ============
CREATE TABLE public.corretores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  empreendimento_id UUID NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  creci TEXT,
  telefone TEXT,
  email TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem_roleta INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.corretores ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_corretores_emp ON public.corretores(empreendimento_id);

-- ============ PLANTOES ============
CREATE TABLE public.plantoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empreendimento_id UUID NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  corretor_id UUID NOT NULL REFERENCES public.corretores(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  status public.plantao_status NOT NULL DEFAULT 'agendado',
  presenca_confirmada_em TIMESTAMPTZ,
  presenca_lat DOUBLE PRECISION,
  presenca_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plantoes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_plantoes_emp_data ON public.plantoes(empreendimento_id, data);

-- ============ ATENDIMENTOS ============
CREATE TABLE public.atendimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empreendimento_id UUID NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  corretor_id UUID NOT NULL REFERENCES public.corretores(id) ON DELETE RESTRICT,
  plantao_id UUID REFERENCES public.plantoes(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  cliente_telefone TEXT,
  cliente_email TEXT,
  status public.atendimento_status NOT NULL DEFAULT 'aberto',
  observacoes TEXT,
  iniciado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalizado_em TIMESTAMPTZ,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_atendimentos_emp ON public.atendimentos(empreendimento_id);
CREATE INDEX idx_atendimentos_corretor ON public.atendimentos(corretor_id);

-- ============ HISTORICO SEMANAL ============
CREATE TABLE public.historico_semanal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empreendimento_id UUID NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  semana_inicio DATE NOT NULL,
  semana_fim DATE NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.historico_semanal ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_hist_emp ON public.historico_semanal(empreendimento_id, semana_inicio DESC);

-- ============ EMAIL LOG ============
CREATE TABLE public.email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario TEXT NOT NULL,
  assunto TEXT NOT NULL,
  status TEXT NOT NULL,
  payload JSONB,
  empreendimento_id UUID REFERENCES public.empreendimentos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_empreendimentos_updated BEFORE UPDATE ON public.empreendimentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_corretores_updated BEFORE UPDATE ON public.corretores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "users see own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'incorporadora') OR public.has_role(auth.uid(), 'gerente'));
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- user_roles
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'incorporadora'));
CREATE POLICY "incorporadora manages roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'incorporadora'))
  WITH CHECK (public.has_role(auth.uid(), 'incorporadora'));

-- empreendimentos
CREATE POLICY "auth read empreendimentos" ON public.empreendimentos FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "admins manage empreendimentos" ON public.empreendimentos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'incorporadora') OR public.has_role(auth.uid(), 'gerente'))
  WITH CHECK (public.has_role(auth.uid(), 'incorporadora') OR public.has_role(auth.uid(), 'gerente'));

-- corretores
CREATE POLICY "auth read corretores" ON public.corretores FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage corretores" ON public.corretores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'incorporadora') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'coordenador'))
  WITH CHECK (public.has_role(auth.uid(), 'incorporadora') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'coordenador'));

-- plantoes
CREATE POLICY "auth read plantoes" ON public.plantoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage plantoes" ON public.plantoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'incorporadora') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'coordenador'))
  WITH CHECK (public.has_role(auth.uid(), 'incorporadora') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'coordenador'));
CREATE POLICY "corretor confirm own presence" ON public.plantoes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.corretores c WHERE c.id = corretor_id AND c.user_id = auth.uid()));

-- atendimentos
CREATE POLICY "corretor read own atendimentos" ON public.atendimentos FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.corretores c WHERE c.id = corretor_id AND c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'incorporadora')
    OR public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'coordenador')
  );
CREATE POLICY "admins insert atendimentos" ON public.atendimentos FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'incorporadora')
    OR public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'coordenador')
    OR EXISTS (SELECT 1 FROM public.corretores c WHERE c.id = corretor_id AND c.user_id = auth.uid())
  );
CREATE POLICY "corretor update own atendimentos" ON public.atendimentos FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.corretores c WHERE c.id = corretor_id AND c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'coordenador')
    OR public.has_role(auth.uid(), 'incorporadora')
  );

-- historico_semanal
CREATE POLICY "admins read historico" ON public.historico_semanal FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'incorporadora') OR public.has_role(auth.uid(), 'gerente'));

-- email_log
CREATE POLICY "incorporadora read email_log" ON public.email_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'incorporadora'));
