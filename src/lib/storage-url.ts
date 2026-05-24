// Helpers para lidar com URLs de buckets agora privados.
// Convertem URL pública armazenada (legado) ou caminho em URL assinada.

import { supabase } from "@/integrations/supabase/client";

const PUBLIC_RE = /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/;
const SIGN_RE = /\/storage\/v1\/object\/sign\/([^/]+)\/(.+?)(?:\?|$)/;

export function extractStoragePath(urlOrPath: string, bucket: string): string | null {
  if (!urlOrPath) return null;
  const m = urlOrPath.match(PUBLIC_RE) || urlOrPath.match(SIGN_RE);
  if (m && m[1] === bucket) return decodeURIComponent(m[2]);
  if (!urlOrPath.startsWith("http")) return urlOrPath;
  return null;
}

export async function clientSignedUrl(bucket: string, urlOrPath: string | null, expiresIn = 3600): Promise<string | null> {
  if (!urlOrPath) return null;
  const path = extractStoragePath(urlOrPath, bucket);
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}
