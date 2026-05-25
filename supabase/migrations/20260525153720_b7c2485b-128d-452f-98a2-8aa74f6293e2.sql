
CREATE OR REPLACE FUNCTION public.storage_path_emp(_name text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_emp uuid;
BEGIN
  BEGIN
    v_emp := split_part(_name, '/', 1)::uuid;
  EXCEPTION WHEN others THEN
    v_emp := NULL;
  END;
  RETURN v_emp;
END;
$$;
