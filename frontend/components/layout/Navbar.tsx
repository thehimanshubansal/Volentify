'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ArrowUpRight } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Platform' },
    { href: '/map', label: 'Map' },
    { href: '/alerts', label: 'Alerts' },
    { href: '/disaster-intelligence', label: 'Intelligence' },
    { href: '/research', label: 'Research' },
    { href: '/about', label: 'About' },
    { href: '/resources', label: 'Resources' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-white/[0.05]">
      <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
        
        {/* Brand Name - Volentify (Never write 2.0 inside logo) */}
        <Link href="/" className="group">
          <span className="font-serif text-2xl tracking-tight text-white group-hover:opacity-90 transition-opacity">
            Volentify
          </span>
        </Link>

        {/* Clean Nav Links */}
        <nav className="hidden lg:flex items-center space-x-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm tracking-tight transition-colors ${
                  isActive ? 'text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="hidden sm:flex items-center space-x-6">
          <Link
            href="/volunteer"
            className="text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            Volunteer
          </Link>
          <Link
            href="/login"
            className="text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            Login
          </Link>
          <Link
            href="/map"
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors flex items-center space-x-1"
          >
            <span>Explore Map</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
          </Link>
        </div>

        {/* Mobile Toggle */}
        <div className="flex lg:hidden">
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
        <div className="lg:hidden bg-background border-b border-white/[0.05] px-8 py-6 space-y-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base text-slate-300 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-4 border-t border-white/[0.05] flex flex-col space-y-3">
            <Link href="/volunteer" className="text-sm text-slate-300">Volunteer</Link>
            <Link href="/login" className="text-sm text-slate-300">Login</Link>
          </div>
        </div>
      )}
    </header>
  );
}
