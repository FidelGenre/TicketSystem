'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const EventsContent = dynamic(() => import('./EventsContent'), { ssr: false });

export default function EventsPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="h-10 skeleton rounded w-1/3 mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card"><div className="aspect-[16/10] skeleton" /><div className="p-4 space-y-3"><div className="h-5 skeleton rounded w-3/4" /><div className="h-3 skeleton rounded w-1/2" /></div></div>
          ))}
        </div>
      </div>
    }>
      <EventsContent />
    </Suspense>
  );
}
