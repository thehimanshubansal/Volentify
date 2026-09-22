'use client';

import React from 'react';

export default function PrivacyPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-telemetry text-xs">
      <h1 className="text-2xl font-bold text-tactical-text border-b border-surface-highest pb-4">
        Privacy Policy & Humanitarian Data Protocols
      </h1>
      <p className="text-tactical-muted leading-relaxed">
        Volentify 2.0 strictly protects user geolocation data. Location coordinates are strictly utilized during active emergency dispatch and are encrypted using TLS 1.3 standards.
      </p>
    </div>
  );
}
