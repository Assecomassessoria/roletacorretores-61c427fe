-- Resetar senha mestra para 4723197056 nos dois e-mails Master
UPDATE auth.users
SET encrypted_password = crypt('4723197056', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE email IN (
  'contatoapps@simuladorcorretorelite.com.br',
  'contato@assecomassessoria.net.br'
);