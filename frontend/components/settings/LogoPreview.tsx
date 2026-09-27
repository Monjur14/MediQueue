'use client';

import { useState } from 'react';

/** Square preview of the clinic logo; falls back to the clinic initial when the link is empty or broken. */
export function LogoPreview({ url, name }: { url: string; name: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const showImage = url && failedUrl !== url;

  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border border-mq-line bg-mq-ground" aria-hidden>
      {showImage ? (
        // Remote logo from any host, so a plain img instead of next/image
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-contain" onError={() => setFailedUrl(url)} />
      ) : (
        <span className="text-xl font-medium text-mq-subtle">{initial}</span>
      )}
    </div>
  );
}
