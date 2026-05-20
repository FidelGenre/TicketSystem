import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.lpticket.com';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://ticketsystembackend.up.railway.app/api';

function resolveImage(url?: string | null) {
  if (!url) return `${siteUrl}/logo.png`;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('data:')) return `${siteUrl}/logo.png`;

  const backendBase = apiUrl.replace(/\/api\/?$/, '');
  return `${backendBase}${url.startsWith('/') ? url : `/${url}`}`;
}

function cleanText(value?: string | null, fallback = '') {
  return String(value || fallback).replace(/\s+/g, ' ').trim();
}

function formatEventDate(value?: string | null, timezone = 'UTC') {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('es-US', {
      timeZone: timezone || 'UTC',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(value));
  } catch {
    return '';
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const eventUrl = `${siteUrl}/events/${slug}`;

  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/events/${slug}`, {
      cache: 'no-store',
    });

    if (!response.ok) throw new Error('Event not found');

    const event = await response.json();
    const image = resolveImage(event.bannerImageUrl || event.imageUrl);
    const dateText = formatEventDate(event.eventDate, event.eventTimezone || 'UTC');
    const venueText = cleanText(event.venueName || event.venueAddress);
    const title = `${cleanText(event.title, 'Evento')} — LPTicket`;
    const description = cleanText(
      event.description,
      [event.title, venueText && `en ${venueText}`, dateText && `el ${dateText}`, 'Compra tickets seguros en LPTicket.']
        .filter(Boolean)
        .join(' ')
    ).slice(0, 220);

    return {
      title,
      description,
      keywords: [
        event.title,
        event.venueName,
        event.venueAddress,
        event.category,
        'LPTicket',
        'tickets',
        'eventos',
        'boletos',
      ].filter(Boolean),
      alternates: {
        canonical: eventUrl,
      },
      openGraph: {
        title,
        description,
        url: eventUrl,
        siteName: 'LPTicket',
        images: [{ url: image, width: 1200, height: 630, alt: event.title }],
        type: 'website',
        locale: 'es_US',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [image],
      },
      robots: {
        index: true,
        follow: true,
      },
    };
  } catch {
    return {
      title: 'Evento — LPTicket',
      description: 'Compra tickets seguros para eventos en LPTicket.',
      alternates: {
        canonical: eventUrl,
      },
    };
  }
}

export default function EventSlugLayout({ children }: { children: ReactNode }) {
  return children;
}
