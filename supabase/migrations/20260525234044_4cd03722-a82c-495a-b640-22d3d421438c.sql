-- Normaliza CNPJs existentes para somente dígitos
UPDATE public.empreendimentos
SET cnpj = regexp_replace(cnpj, '[^0-9]', '', 'g')
WHERE cnpj IS NOT NULL AND cnpj <> regexp_replace(cnpj, '[^0-9]', '', 'g');

-- Converte strings vazias em NULL
UPDATE public.empreendimentos
SET cnpj = NULL
WHERE cnpj IS NOT NULL AND length(trim(cnpj)) = 0;

-- Índice único parcial: garante unicidade quando informado, permite NULL múltiplo
CREATE UNIQUE INDEX IF NOT EXISTS empreendimentos_cnpj_unique
ON public.empreendimentos (cnpj)
WHERE cnpj IS NOT NULL;