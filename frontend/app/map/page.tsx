'use client';

import React from 'react';
import DisasterGISMap from '@/components/map/DisasterGISMap';

export default function MapPage() {
  return (
    <div className="w-full h-full bg-surface-lowest">
      <DisasterGISMap />
    </div>
  );
}
