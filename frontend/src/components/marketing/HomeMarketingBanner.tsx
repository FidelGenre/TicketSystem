'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

type MarketingBanner = {
  id: string;
  imageData: string;
  fileName?: string;
};

export default function HomeMarketingBanner() {
  const [banner, setBanner] = useState<MarketingBanner | null>(null);

  useEffect(() => {
    let mounted = true;

    api
      .get('/marketing/banner/home')
      .then(({ data }) => {
        if (mounted && data?.imageData) setBanner(data);
      })
      .catch(() => {
        if (mounted) setBanner(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!banner?.imageData) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-2xl border border-[rgba(10,55,90,0.12)] bg-white shadow-xl shadow-[rgba(10,55,90,0.10)]">
        <img
          src={banner.imageData}
          alt={banner.fileName || 'Banner publicitario LPTicket'}
          className="block h-auto w-full object-cover"
        />
      </div>
    </section>
  );
}
