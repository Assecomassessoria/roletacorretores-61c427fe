
ALTER TABLE public.empreendimentos
  ADD COLUMN IF NOT EXISTS metodos_presenca text[] NOT NULL DEFAULT ARRAY['geofence']::text[],
  ADD COLUMN IF NOT EXISTS pin_intervalo_min integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS qrcode_token text;
