'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, User, Lock, Building2, Users, ShieldAlert, ArrowRight, AlertCircle } from 'lucide-react';
import { initiateGoogleSignIn } from '@/lib/googleAuth';

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

      if (!data.user.onboarded || !data.user.phone) {
        router.push('/onboarding');
      } else if (data.user.role === 'admin' || role === 'admin') {
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
    <div className="max-w-md mx-auto px-6 py-20 space-y-8">
      <div className="p-8 sm:p-10 rounded-3xl bg-surface-card border border-white/[0.08] shadow-2xl space-y-6 backdrop-blur-xl">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] font-mono text-xs text-primary backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SECURE COMMAND ACCESS</span>
          </div>
          
          <h1 className="heading-editorial text-3xl sm:text-4xl text-white">
            Command Authentication
          </h1>
          <p className="text-xs text-slate-400 font-light">
            Sign in to access your GIS deployments and response credentials.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-950/40 border border-red-500/40 text-red-200 text-xs rounded-2xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Google OAuth Quick Sign-In */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => initiateGoogleSignIn(role === 'admin' ? 'INCIDENT_ADMIN' : role === 'volunteer' ? 'VOLUNTEER' : 'CITIZEN')}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-sans font-bold text-sm flex items-center justify-center space-x-3 transition-all shadow-lg hover:shadow-xl active:scale-[0.99]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center space-x-4">
            <div className="flex-1 h-px bg-white/[0.08]" />
            <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">
              OR COMMAND ID
            </span>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-white/[0.03] p-1 rounded-full border border-white/[0.06]">
          {(['volunteer', 'agency', 'admin'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`py-2 rounded-full font-mono text-xs capitalize transition-all ${
                role === r 
                  ? 'bg-primary text-slate-950 font-bold shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-slate-400 block mb-1.5 font-medium">
              EMAIL / COMMAND ID
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@agency.gov.in"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary font-sans transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-slate-400 block mb-1.5 font-medium">
              PASSWORD
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary font-sans transition-colors"
              />
            </div>
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full py-4 rounded-full bg-primary hover:bg-primary-hover text-slate-950 font-semibold text-xs transition-all flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50 active:scale-95 mt-2"
          >
            <span>{loading ? 'Authenticating...' : 'Authenticate Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-400 pt-3 border-t border-white/[0.08]">
          Don't have an authenticated account?{' '}
          <Link href="/register" className="text-primary font-semibold hover:underline ml-1">
            Register Here
          </Link>
        </div>

      </div>
    </div>
  );
}
