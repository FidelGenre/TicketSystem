'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Event } from '@/types';
import { useCategories } from '@/context/CategoryContext';
import { useLang } from '@/context/LanguageContext';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { HiOutlineCalendar, HiOutlineLocationMarker, HiOutlineTag } from 'react-icons/hi';
import ShareEventButton from '@/components/events/ShareEventButton';

import { getImageUrl } from '@/lib/api';

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  const { getCategoryInfo } = useCategories();
  const { lang, t } = useLang();
  const [imageLoaded, setImageLoaded] = useState(false);

  const categoryInfo = getCategoryInfo(event.category) || {
    labelEs: 'Otro',
    labelEn: 'Other',
    icon: '🎫',
    color: '#6366f1',
  };

  const catLabel = lang === 'en' ? categoryInfo.labelEn : categoryInfo.labelEs;
  const eventDate = new Date(event.eventDate);
  const dateLocale = lang === 'en' ? enUS : es;

  return (
    <div className="event-signature-card group relative">
      <Link href={`/events/${event.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden bg-blue-950">
          {event.imageUrl && !imageLoaded && (
            <div className="absolute inset-0 z-10 h-full w-full animate-shimmer" />
          )}

          {event.imageUrl ? (
            <img
              src={getImageUrl(event.imageUrl)}
              alt={event.title}
              onLoad={() => setImageLoaded(true)}
              className={`h-full w-full object-cover transition-all duration-700 group-hover:scale-[1.035] ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onError={(e) => {
                setImageLoaded(true);
                (e.target as HTMLImageElement).style.display = 'none';
                const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}

          <div
            className="absolute inset-0 flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-800 via-blue-700 to-primary-500"
            style={{ display: event.imageUrl ? 'none' : 'flex' }}
          >
            <span className="text-6xl">{categoryInfo.icon}</span>
          </div>

          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-blue-950/82 via-blue-950/18 to-transparent" />

          <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-white/92 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-blue-900 shadow-sm backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
            {catLabel}
          </div>

          {event.isFeatured && (
            <div className="absolute right-3 top-3 rounded-lg bg-primary-500 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-sm">
              {lang === 'es' ? 'Destacado' : 'Featured'}
            </div>
          )}
        </div>

        <div className="space-y-3 p-4">
          <h3 className="line-clamp-2 min-h-[3rem] text-base font-black leading-tight text-blue-950">
            {event.title}
          </h3>

          <div className="flex items-center gap-1.5 text-sm font-semibold text-blue-700">
            <HiOutlineCalendar className="h-4 w-4 shrink-0" />
            <span>
              {format(eventDate, "dd/MM", { locale: dateLocale })} {t('atTime')} {format(eventDate, "hh:mm a")}
            </span>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
              <HiOutlineLocationMarker className="h-4 w-4 shrink-0 text-primary-500" />
              <span className="truncate">{event.venueName}</span>
            </div>
            {event.venueAddress && (
              <p className="text-xs text-gray-500 pl-5 truncate font-medium">
                {event.venueAddress}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <div className="flex items-center gap-1.5 text-blue-900">
              <HiOutlineTag className="h-4 w-4 shrink-0 text-primary-500" />
              <span className="text-sm font-black">
                {t('fromPrice')} {Number(event.minPrice || 0).toFixed(2)} {event.currency || 'USD'}
              </span>
            </div>

            <span className="inline-flex h-8 px-3 items-center justify-center rounded-lg bg-primary-500 text-[10px] font-black uppercase tracking-[0.1em] text-white transition-all group-hover:bg-primary-600">
              {t('buyTickets')}
            </span>
          </div>
        </div>
      </Link>

      <div className="absolute right-4 bottom-[6.15rem] z-20">
        <ShareEventButton
          eventTitle={event.title}
          eventPath={`/events/${event.slug}`}
          label={lang === 'es' ? 'Comparte con tus amigos' : 'Share with friends'}
          compact
          className="shrink-0 !h-8 !w-[4.6rem] !rounded-lg !border-blue-800 !bg-blue-800 !text-white !shadow-none hover:!bg-blue-700"
        />
      </div>
    </div>
  );
}
