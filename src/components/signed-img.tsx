import { useEffect, useState } from "react";
import { clientSignedUrl } from "@/lib/storage-url";

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
