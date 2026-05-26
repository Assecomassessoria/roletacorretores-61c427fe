ALTER TABLE public.corretores ADD COLUMN IF NOT EXISTS cpf text;

CREATE UNIQUE INDEX IF NOT EXISTS corretores_cpf_emp_unique
  ON public.corretores (empreendimento_id, cpf)
  WHERE cpf IS NOT NULL AND cpf <> '';