'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer } from 'lucide-react';
import type { MusterPass as Pass } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

/** The digital muster pass — the credential responders present at check-in. */
export function MusterPass({ pass, phone, bloodGroup, district, className, printable = true }: {
  pass: Pass; phone?: string; bloodGroup?: string | null; district?: string | null; className?: string; printable?: boolean;
}) {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(`VOLENTIFY|${pass.code}|${pass.signature}`, {
      margin: 0, width: 220, errorCorrectionLevel: 'M', color: { dark: '#f4f1eaff', light: '#00000000' },
    }).then((url) => alive && setQr(url)).catch(() => alive && setQr(null));
    return () => { alive = false; };
  }, [pass.code, pass.signature]);

  const issued = new Date(pass.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className={cn('space-y-3', className)}>
      <article
        id="muster-pass"
        aria-label={`${pass.title} for ${pass.holder}`}
        className="relative overflow-hidden rounded-[1.25rem] border border-gold/35 bg-[radial-gradient(120%_90%_at_0%_0%,rgb(var(--gold)/0.10),transparent_55%),rgb(var(--ink-900))] p-6 sm:p-7 print:border-black print:bg-white print:text-black"
      >
        <div className="pointer-events-none absolute inset-2 rounded-[0.9rem] border border-gold/15 print:hidden" aria-hidden />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="font-serif text-xl text-gold">Volentify</p>
            <p className="mt-0.5 text-xs text-stone">{pass.title}</p>
          </div>
          <p className="code text-gold/80">{pass.code}</p>
        </div>

        <div className="relative mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-4">
            <div>
              <p className="text-xs text-stone">Holder</p>
              <p className="font-serif text-[2.4rem] leading-none text-ivory print:text-black">{pass.holder}</p>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {district && <div><dt className="text-xs text-stone">District</dt><dd className="text-ivory print:text-black">{district}</dd></div>}
              {bloodGroup && <div><dt className="text-xs text-stone">Blood group</dt><dd className="text-ivory print:text-black">{bloodGroup}</dd></div>}
              {phone && <div><dt className="text-xs text-stone">Mobile</dt><dd className="code text-ivory print:text-black">+91 {phone.slice(0, 5)} {phone.slice(5)}</dd></div>}
              <div><dt className="text-xs text-stone">Issued</dt><dd className="text-ivory print:text-black">{issued}</dd></div>
            </dl>
          </div>
          <div className="shrink-0 self-start rounded-xl border border-gold/25 p-3 sm:self-auto">
            {qr ? <img src={qr} alt={`QR code for pass ${pass.code}`} className="h-28 w-28 print:invert" />
              : <div className="h-28 w-28 animate-pulse rounded bg-ivory/[0.05]" aria-hidden />}
          </div>
        </div>

        <div className="relative mt-6 flex items-center justify-between gap-3 border-t border-gold/20 pt-3">
          <p className="text-[0.6875rem] text-stone">Signature</p>
          <p className="code truncate text-gold/70">{pass.signature}</p>
        </div>
      </article>
      {printable && (
        <Button variant="ghost" size="sm" onClick={() => window.print()} className="print:hidden">
          <Printer className="h-3.5 w-3.5" aria-hidden />Print pass
        </Button>
      )}
    </div>
  );
}
