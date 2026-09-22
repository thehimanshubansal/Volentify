'use client';

import React from 'react';
import { HelpCircle } from 'lucide-react';

export default function FaqsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-telemetry">
      <div className="border-b border-surface-highest/60 pb-6 space-y-2">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-tactical-text">
          Frequently Asked Questions
        </h1>
      </div>

      <div className="space-y-4 text-xs">
        <div className="p-6 rounded-2xl glass-panel space-y-2">
          <h3 className="font-bold text-primary">How does Volentify 2.0 dispatch volunteers?</h3>
          <p className="text-tactical-muted">Volentify uses geo-fenced spatial indexing to match nearby registered volunteers with approved NDRF & NGO relief requisitions based on skill set.</p>
        </div>

        <div className="p-6 rounded-2xl glass-panel space-y-2">
          <h3 className="font-bold text-primary">Is the map data live?</h3>
          <p className="text-tactical-muted">Yes, satellite layers update via INSAT-3DR and Sentinel telemetry APIs every 15 minutes, and hazard pins update instantly via FastAPI WebSockets.</p>
        </div>
      </div>
    </div>
  );
}
