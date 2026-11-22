'use client';

import dynamic from 'next/dynamic';

const TacticalMap = dynamic(() => import('@/components/map/TacticalMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-ink-900" aria-hidden />,
});

export default function MapPreview() {
  return (
    <div className="relative h-[34rem] overflow-hidden rounded-[1.75rem] border border-line shadow-float sm:h-[42rem]">
      <TacticalMap variant="embed" className="h-full w-full" />
    </div>
  );
}
