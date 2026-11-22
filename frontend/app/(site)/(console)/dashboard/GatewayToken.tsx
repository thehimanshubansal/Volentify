'use client';

import { useState } from 'react';
import { Copy, KeyRound } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface MeshToken { token: string; expires_at: string; token_type: 'Bearer' }

/** Short-lived bearer token for the Volentify Mesh Android app's gateway sync (OD-01). */
export function GatewayToken() {
  const toast = useToast();
  const [token, setToken] = useState<MeshToken | null>(null);
  const [busy, setBusy] = useState(false);

  const issue = async () => {
    setBusy(true);
    try {
      setToken(await api.post<MeshToken>('/api/mesh/token'));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not issue a gateway token.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token.token);
      toast('Gateway token copied');
    } catch {
      toast('Copy failed — select the token and copy it manually.', 'error');
    }
  };

  return (
    <div className="rounded-2xl border border-line p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <KeyRound className="mt-1 h-4 w-4 text-gold" aria-hidden />
        <div className="space-y-1">
          <h3 className="font-serif text-2xl text-ivory">Mesh gateway check-in</h3>
          <p className="text-sm leading-relaxed text-stone">
            When your phone carries field reports out of a no-signal zone, the Volentify Mesh app uses this token to upload
            its outbox. Paste it into the app at check-in. It expires on its own; issue a new one each shift.
          </p>
          <a href="/mesh" className="link inline-block pt-1 text-sm">Get the Volentify Mesh app for Android</a>
        </div>
      </div>
      {token ? (
        <div className="mt-5 space-y-3">
          <textarea readOnly value={token.token} aria-label="Gateway token" onFocus={(e) => e.currentTarget.select()}
            className="h-20 w-full resize-none rounded-[10px] border border-line bg-ink-800 p-3 font-mono text-[0.6875rem] leading-relaxed text-sand" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="code">Expires {formatDateTime(token.expires_at)}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={copy}><Copy className="h-3.5 w-3.5" aria-hidden />Copy token</Button>
              <Button size="sm" variant="ghost" onClick={issue} loading={busy}>Issue new</Button>
            </div>
          </div>
        </div>
      ) : (
        <Button className="mt-5" variant="secondary" onClick={issue} loading={busy}>Issue gateway token</Button>
      )}
    </div>
  );
}
