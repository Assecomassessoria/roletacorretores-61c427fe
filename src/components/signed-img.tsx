import { useEffect, useState } from "react";
import { clientSignedUrl, extractStoragePath } from "@/lib/storage-url";

type Props = {
  bucket: string;
  src: string | null | undefined;
  alt?: string;
  className?: string;
  expiresIn?: number;
};

export function SignedImg({ bucket, src, alt = "", className, expiresIn = 3600 }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!src) {
      setUrl(null);
      return;
    }
    // Link externo (não pertence ao bucket): exibe direto.
    const path = extractStoragePath(src, bucket);
    if (!path && /^https?:\/\//i.test(src)) {
      setUrl(src);
      return;
    }
    clientSignedUrl(bucket, src, expiresIn).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [bucket, src, expiresIn]);

  if (!url) return null;
  return <img src={url} alt={alt} className={className} />;
}

