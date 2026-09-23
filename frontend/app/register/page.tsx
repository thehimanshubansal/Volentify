'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, User, Mail, Lock, Building2, MapPin } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<'citizen' | 'volunteer' | 'ngo' | 'agency'>('volunteer');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    state_district: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          role
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Registration failed');
      }

      // Automatically login on register
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Also register as volunteer if role is volunteer
      if (role === 'volunteer') {
        await fetch('/api/volunteer/profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: data.user.id,
                name: formData.name,
                skills: [],
                equipment: [],
                availability_status: 'available',
                lat: 0,
                lng: 0,
                rating: 5.0
            })
        });
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
    <div className="max-w-lg mx-auto px-4 py-12 font-telemetry">
      <div className="p-8 rounded-2xl glass-panel space-y-6 border border-primary/40 shadow-tactical">
        
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold text-tactical-text">REGISTER NEW ACCOUNT</h1>
          <p className="text-xs text-tactical-muted">JOIN VOLENTIFY NATIONAL NETWORK</p>
        </div>

        {error && <div className="p-2 bg-red-900/50 border border-red-500 text-red-200 text-xs rounded text-center">{error}</div>}

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
            <input name="name" required placeholder="Rahul Sharma / NDRF Battalion 3" value={formData.name} onChange={handleChange} className="w-full p-2.5 rounded bg-surface-lowest text-tactical-text border border-surface-highest" />
          </div>

          <div>
            <label className="text-tactical-muted block mb-1">EMAIL ADDRESS</label>
            <input name="email" required type="email" placeholder="rahul@domain.com" value={formData.email} onChange={handleChange} className="w-full p-2.5 rounded bg-surface-lowest text-tactical-text border border-surface-highest" />
          </div>

          <div>
            <label className="text-tactical-muted block mb-1">PHONE NUMBER (SMS ALERTS)</label>
            <input name="phone" required placeholder="+91 9876543210" value={formData.phone} onChange={handleChange} className="w-full p-2.5 rounded bg-surface-lowest text-tactical-text border border-surface-highest" />
          </div>

          <div>
            <label className="text-tactical-muted block mb-1">STATE & DISTRICT</label>
            <input name="state_district" required placeholder="Puri, Odisha" value={formData.state_district} onChange={handleChange} className="w-full p-2.5 rounded bg-surface-lowest text-tactical-text border border-surface-highest" />
          </div>

          <div>
            <label className="text-tactical-muted block mb-1">PASSWORD</label>
            <input name="password" required type="password" placeholder="••••••••" value={formData.password} onChange={handleChange} className="w-full p-2.5 rounded bg-surface-lowest text-tactical-text border border-surface-highest" />
          </div>

          <button disabled={loading} type="submit" className="w-full py-3 rounded bg-primary text-surface-lowest font-bold text-xs hover:bg-primary-tint transition-colors disabled:opacity-50">
            {loading ? 'PROCESSING...' : 'CREATE ACCOUNT & VERIFY'}
          </button>
        </form>

        <div className="text-center text-xs text-tactical-muted mt-4">
          Already have an account? <Link href="/login" className="text-primary hover:underline font-bold">LOGIN HERE</Link>
        </div>

      </div>
    </div>
  );
}
