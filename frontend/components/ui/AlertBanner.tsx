'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowRight, X } from 'lucide-react';

interface AlertBannerProps {
  level?: 'CRITICAL' | 'WARNING' | 'ADVISORY';
  message: string;
  location: string;
  actionUrl?: string;
  onDismiss?: () => void;
}

export default function AlertBanner({
  level = 'CRITICAL',
  message,
  location,
  actionUrl = '/alerts',
  onDismiss,
}: AlertBannerProps) {
  return (
    <div className="w-full bg-emergency text-white px-4 py-3 shadow-emergency flex items-center justify-between border-b border-red-400">
      <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
          <div className="p-1 rounded bg-black/20 animate-pulse">
            <ShieldAlert className="w-5 h-5 text-yellow-300" />
          </div>
          <div className="text-xs sm:text-sm font-medium">
            <span className="font-telemetry font-bold px-2 py-0.5 bg-black/40 rounded text-yellow-300 mr-2">
              [{level} ALERT - {location}]
            </span>
            <span>{message}</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href={actionUrl}
            className="px-3 py-1 text-xs font-bold bg-surface-lowest text-white hover:bg-black/60 rounded flex items-center space-x-1 transition-all"
          >
            <span>View Evacuation Protocol</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 hover:bg-black/20 rounded transition-colors text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
