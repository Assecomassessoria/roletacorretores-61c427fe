ALTER TABLE public.corretores
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS tipo_logradouro text,
  ADD COLUMN IF NOT EXISTS logradouro text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS complemento text,
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS uf text;
GRANT ALL ON public.corretores TO service_role;
COMMENT ON COLUMN public.corretores.data_nascimento IS 'Data de nascimento; dado pessoal sem concessão de leitura pública.';
COMMENT ON COLUMN public.corretores.created_at IS 'Data e hora automática de início do cadastro do corretor.';