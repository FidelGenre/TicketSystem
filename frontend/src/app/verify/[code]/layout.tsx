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
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;

  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/orders/ticket/${code}`, {
      cache: 'no-store',
    });

    if (!response.ok) throw new Error('Ticket not found');

    const ticket = await response.json();
    const event = ticket.event;
    const image = resolveImage(event?.bannerImageUrl || event?.imageUrl);
    const title = event?.title ? `Entrada para ${event.title}` : 'Entrada LPTicket';

    return {
      title: `${title} — LPTicket`,
      description: event?.venueName
        ? `${event.venueName}${event.venueAddress ? ` — ${event.venueAddress}` : ''}`
        : 'Entrada digital de LPTicket.',
      openGraph: {
        title,
        description: event?.venueName || 'Entrada digital de LPTicket',
        url: `${siteUrl}/verify/${code}`,
        siteName: 'LPTicket',
        images: [{ url: image, width: 1200, height: 630, alt: title }],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: event?.venueName || 'Entrada digital de LPTicket',
        images: [image],
      },
    };
  } catch {
    return {
      title: 'Entrada LPTicket',
      description: 'Entrada digital de LPTicket.',
    };
  }
}

export default function VerifyCodeLayout({ children }: { children: ReactNode }) {
  return children;
}
