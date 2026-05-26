
-- Credenciais WebAuthn (Passkey/biometria) por dispositivo
CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  corretor_id uuid NULL,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  transports text[] NULL,
  device_label text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user ON public.webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_corretor ON public.webauthn_credentials(corretor_id);

ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own credentials"
  ON public.webauthn_credentials FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users delete own credentials"
  ON public.webauthn_credentials FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Desafios temporários para registro/autenticação (server-only)
CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('registration','authentication')),
  user_id uuid NULL,
  corretor_id uuid NULL,
  creci text NULL,
  empreendimento_id uuid NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires ON public.webauthn_challenges(expires_at);

ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;
-- nenhuma policy: somente service role acessa

-- Tokens de uso único emitidos após autenticação biométrica (TTL 60s)
CREATE TABLE IF NOT EXISTS public.biometric_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  corretor_id uuid NOT NULL,
  empreendimento_id uuid NOT NULL,
  used_at timestamptz NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '60 seconds'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_biometric_tokens_token ON public.biometric_tokens(token);

ALTER TABLE public.biometric_tokens ENABLE ROW LEVEL SECURITY;
-- nenhuma policy: somente service role acessa
