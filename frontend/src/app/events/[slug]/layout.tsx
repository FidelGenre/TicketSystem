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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/events/${slug}`, {
      cache: 'no-store',
    });

    if (!response.ok) throw new Error('Event not found');

    const event = await response.json();
    const image = resolveImage(event.bannerImageUrl || event.imageUrl);

    return {
      title: `${event.title} — LPTicket`,
      description: event.venueName
        ? `${event.title} en ${event.venueName}. Compra tus tickets en LPTicket.`
        : `${event.title}. Compra tus tickets en LPTicket.`,
      openGraph: {
        title: event.title,
        description: event.venueName || 'Evento disponible en LPTicket',
        url: `${siteUrl}/events/${slug}`,
        siteName: 'LPTicket',
        images: [{ url: image, width: 1200, height: 630, alt: event.title }],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: event.title,
        description: event.venueName || 'Evento disponible en LPTicket',
        images: [image],
      },
    };
  } catch {
    return {
      title: 'Evento — LPTicket',
      description: 'Compra tus tickets en LPTicket.',
    };
  }
}

export default function EventSlugLayout({ children }: { children: ReactNode }) {
  return children;
}
