'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { MESH_DOWNLOAD_PATH } from '@/lib/release';

/** QR code for opening the download on a phone when this page is viewed on a computer. */
export default function DownloadQr() {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(`${window.location.origin}${MESH_DOWNLOAD_PATH}`, {
      margin: 1, width: 360, color: { dark: '#07080aff', light: '#f4f1eaff' },
    }).then(setSrc).catch(() => setSrc(null));
  }, []);
  return (
    <div className="w-44 shrink-0 space-y-3 text-center">
      <div className="aspect-square overflow-hidden rounded-xl bg-ivory p-2">
        {src ? <img src={src} alt="QR code that downloads the Volentify Mesh app" className="h-full w-full" /> : null}
      </div>
      <p className="text-xs text-stone">Scan with your phone’s camera to download</p>
    </div>
  );
}
