'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, ArrowUpRight, User, LogOut, ShieldAlert, Radio } from 'lucide-react';

interface AuthUser {
  name: string;
  email: string;
  role?: string;
  state_district?: string;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const checkUser = () => {
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (e) {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    checkUser();
    window.addEventListener('storage', checkUser);
    return () => window.removeEventListener('storage', checkUser);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    router.push('/');
  };

  const navLinks = [
    { href: '/', label: 'Platform' },
    { href: '/map', label: 'Tactical Map' },
    { href: '/disasters', label: 'Disasters' },
    { href: '/volunteer', label: 'Volunteer Hub' },
    { href: '/predictions', label: 'ML Hazard Models' },
    { href: '/disaster-intelligence', label: 'Intelligence' },
    { href: '/alerts', label: 'Alerts' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-background/90 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Name */}
        <Link href="/" className="group flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold">
            V
          </div>
          <span className="font-serif text-2xl tracking-tight text-white group-hover:text-primary transition-colors">
            Volentify
          </span>
        </Link>

        {/* Clean Nav Links */}
        <nav className="hidden xl:flex items-center space-x-6">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-xs tracking-tight transition-colors ${
                  isActive ? 'text-primary font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions & Role-Based Auth Display */}
        <div className="hidden sm:flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-3">
              <Link
                href="/dashboard"
                className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-surface-card border border-surface-subtle hover:border-primary/50 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white leading-none">{user.name}</div>
                  <div className="text-[9px] text-primary font-mono">{user.role || 'VOLUNTEER'}</div>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-emergency transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                href="/login"
                className="text-xs font-medium text-slate-300 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-3 py-1.5 rounded-lg bg-surface-card border border-surface-subtle text-white text-xs font-medium hover:border-primary/50 transition-colors"
              >
                Register
              </Link>
            </div>
          )}

          <Link
            href="/map"
            className="px-3.5 py-1.5 rounded-full bg-primary hover:bg-primary-tint text-surface-lowest text-xs font-bold transition-colors flex items-center space-x-1 shadow-tactical"
          >
            <span>Live GIS</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile Toggle */}
        <div className="flex xl:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-background border-b border-white/[0.08] px-6 py-6 space-y-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm text-slate-300 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          
          <div className="pt-4 border-t border-white/[0.08] flex flex-col space-y-3">
            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="text-sm text-primary font-bold">
                  Dashboard ({user.name} - {user.role || 'VOLUNTEER'})
                </Link>
                <button onClick={handleLogout} className="text-left text-sm text-emergency">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-sm text-slate-300">Login</Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="text-sm text-slate-300">Register</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
