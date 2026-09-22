'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, User, Mail, Lock, Building2, MapPin } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<'citizen' | 'volunteer' | 'ngo' | 'agency'>('volunteer');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/dashboard');
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12 font-telemetry">
      <div className="p-8 rounded-2xl glass-panel space-y-6 border border-primary/40 shadow-tactical">
        
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold text-tactical-text">REGISTER NEW ACCOUNT</h1>
          <p className="text-xs text-tactical-muted">JOIN VOLENTIFY NATIONAL NETWORK</p>
        </div>

        {/* Role Select */}
        <div className="grid grid-cols-4 gap-1 bg-surface-lowest p-1 rounded-lg text-[9px] font-bold">
          {(['citizen', 'volunteer', 'ngo', 'agency'] as const).map((r) => (
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

        <form onSubmit={handleRegister} className="space-y-3 text-xs">
          <div>
            <label className="text-tactical-muted block mb-1">FULL NAME / ENTITY NAME</label>
            <input required placeholder="Rahul Sharma / NDRF Battalion 3" className="w-full p-2.5 rounded bg-surface-lowest text-tactical-text border border-surface-highest" />
          </div>

          <div>
            <label className="text-tactical-muted block mb-1">EMAIL ADDRESS</label>
            <input required type="email" placeholder="rahul@domain.com" className="w-full p-2.5 rounded bg-surface-lowest text-tactical-text border border-surface-highest" />
          </div>

          <div>
            <label className="text-tactical-muted block mb-1">PHONE NUMBER (SMS ALERTS)</label>
            <input required placeholder="+91 9876543210" className="w-full p-2.5 rounded bg-surface-lowest text-tactical-text border border-surface-highest" />
          </div>

          <div>
            <label className="text-tactical-muted block mb-1">STATE & DISTRICT</label>
            <input required placeholder="Puri, Odisha" className="w-full p-2.5 rounded bg-surface-lowest text-tactical-text border border-surface-highest" />
          </div>

          <button type="submit" className="w-full py-3 rounded bg-primary text-surface-lowest font-bold text-xs hover:bg-primary-tint transition-colors">
            CREATE ACCOUNT & VERIFY
          </button>
        </form>

      </div>
    </div>
  );
}
