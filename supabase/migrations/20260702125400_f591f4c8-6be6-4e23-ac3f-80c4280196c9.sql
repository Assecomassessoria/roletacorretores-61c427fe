
-- 1) Corrige "search_path mutable" nas funções SECURITY DEFINER de fila de e-mails
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pg_temp;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pg_temp;

-- 2) Revoga EXECUTE de anon em SECURITY DEFINER públicos (chamadas ocorrem via service_role)
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM anon, PUBLIC;

-- 3) Sugestões: remove INSERT anônimo direto na tabela. Inserções passam a ocorrer
--    exclusivamente via server function (service_role) com rate limit por IP.
DROP POLICY IF EXISTS "Qualquer pessoa pode enviar sugestao" ON public.sugestoes;

CREATE POLICY "Somente service_role insere sugestao"
ON public.sugestoes
FOR INSERT
TO service_role
WITH CHECK (true);

REVOKE INSERT ON public.sugestoes FROM anon, authenticated;
GRANT INSERT ON public.sugestoes TO service_role;
