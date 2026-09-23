'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, User, Lock, Building2, Users, ShieldAlert, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'citizen' | 'volunteer' | 'ngo' | 'agency' | 'admin'>('volunteer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      localStorage.setItem('user', JSON.stringify(data.user));

      if (data.user.role === 'admin' || role === 'admin') {
        router.push('/admin');
      } else if (data.user.role === 'volunteer' || role === 'volunteer') {
        router.push('/volunteer');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 font-telemetry">
      <div className="p-8 rounded-2xl glass-panel space-y-6 border border-primary/40 shadow-tactical">
        
        {/* Brand Icon */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary text-primary mx-auto flex items-center justify-center">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-tactical-text">COMMAND AUTHENTICATION</h1>
          <p className="text-xs text-tactical-muted">VOLENTIFY 2.0 NATIONAL PORTAL</p>
        </div>

        {error && <div className="p-2 bg-red-900/50 border border-red-500 text-red-200 text-xs rounded text-center">{error}</div>}

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-surface-lowest p-1 rounded-lg text-[10px] font-bold">
          {(['volunteer', 'agency', 'admin'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`py-1.5 rounded uppercase transition-colors ${
                role === r ? 'bg-primary text-surface-lowest' : 'text-tactical-muted hover:text-tactical-text'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="text-tactical-muted block mb-1">EMAIL / COMMAND ID</label>
            <div className="relative">
              <User className="w-4 h-4 text-tactical-muted absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@agency.gov.in"
                className="w-full pl-9 pr-3 py-2.5 rounded bg-surface-lowest text-tactical-text border border-surface-highest focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-tactical-muted block mb-1">PASSWORD</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-tactical-muted absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded bg-surface-lowest text-tactical-text border border-surface-highest focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full py-3 rounded bg-primary text-surface-lowest font-bold text-xs hover:bg-primary-tint transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? 'AUTHENTICATING...' : 'AUTHENTICATE PORTAL'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-[11px] text-tactical-muted pt-2 border-t border-surface-highest">
          Don't have an authenticated account?{' '}
          <Link href="/register" className="text-primary font-bold hover:underline">
            Register Here
          </Link>
        </div>

      </div>
    </div>
  );
}
