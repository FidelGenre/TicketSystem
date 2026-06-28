'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api, { getImageUrl } from '@/lib/api';
import { useLang } from '@/context/LanguageContext';
import {
  HiOutlineClipboardCopy,
  HiOutlineExternalLink,
  HiOutlineQrcode,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineTicket,
} from 'react-icons/hi';

type DoorSaleMode = 'organizer' | 'staff';

type DoorSaleEvent = {
  id: string;
  title: string;
  eventDate?: string | null;
  venueName?: string | null;
  imageUrl?: string | null;
  bannerImageUrl?: string | null;
  status?: string | null;
};

type DoorSalePreview = {
  unitPrice: number;
  quantity: number;
  baseTotal: number;
  lpFee: number;
  processingFee: number;
  total: number;
  event?: DoorSaleEvent & { currency?: string };
};

type DoorSaleCheckout = DoorSalePreview & {
  sessionId: string;
  url: string;
  qrData: string;
};

type Props = {
  mode: DoorSaleMode;
};

function listFrom(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  return payload?.data || payload?.events || payload?.items || [];
}

function normalizeEvent(event: any): DoorSaleEvent {
  return {
    id: String(event.id),
    title: event.title || 'Evento',
    eventDate: event.eventDate || event.date,
    venueName: event.venueName || event.venue,
    imageUrl: event.imageUrl || null,
    bannerImageUrl: event.bannerImageUrl || null,
    status: event.status,
  };
}

export default function DoorSaleWebPanel({ mode }: Props) {
  const { lang } = useLang();
  const [events, setEvents] = useState<DoorSaleEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventQuery, setEventQuery] = useState('');
  const [amount, setAmount] = useState('15');
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [preview, setPreview] = useState<DoorSalePreview | null>(null);
  const [checkout, setCheckout] = useState<DoorSaleCheckout | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const labels = {
    title: lang === 'es' ? 'Venta en puerta' : 'Door sale',
    subtitle: mode === 'staff'
      ? (lang === 'es' ? 'Crea links o QR de pago para eventos donde fuiste aprobado.' : 'Create payment links or QR codes for events you were approved for.')
      : (lang === 'es' ? 'Crea links o QR de pago para ventas rápidas en puerta.' : 'Create payment links or QR codes for quick door sales.'),
    event: lang === 'es' ? 'Evento' : 'Event',
    amount: lang === 'es' ? 'Precio por entrada' : 'Price per ticket',
    quantity: lang === 'es' ? 'Cantidad' : 'Quantity',
    buyerName: lang === 'es' ? 'Nombre comprador opcional' : 'Optional buyer name',
    buyerEmail: lang === 'es' ? 'Email comprador opcional' : 'Optional buyer email',
    create: lang === 'es' ? 'Crear link / QR de pago' : 'Create payment link / QR',
    creating: lang === 'es' ? 'Creando cobro...' : 'Creating payment...',
    open: lang === 'es' ? 'Abrir pago' : 'Open payment',
    copy: lang === 'es' ? 'Copiar link' : 'Copy link',
    copied: lang === 'es' ? 'Copiado' : 'Copied',
    base: lang === 'es' ? 'Entradas' : 'Tickets',
    lpFee: lang === 'es' ? 'Servicio LPTicket' : 'LPTicket service',
    processing: lang === 'es' ? 'Procesamiento' : 'Processing',
    total: lang === 'es' ? 'Total comprador' : 'Buyer total',
    empty: mode === 'staff'
      ? (lang === 'es' ? 'No tienes eventos aprobados para venta en puerta.' : 'You do not have approved door-sale events.')
      : (lang === 'es' ? 'No tienes eventos publicados para venta en puerta.' : 'You do not have published events for door sale.'),
  };

  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId), [events, selectedEventId]);
  const filteredEvents = useMemo(() => {
    const clean = eventQuery.trim().toLowerCase();
    if (!clean) return events;
    return events.filter((event) => [event.title, event.venueName].filter(Boolean).join(' ').toLowerCase().includes(clean));
  }, [events, eventQuery]);

  const money = (value: number, currency = preview?.event?.currency || 'USD') => {
    return new Intl.NumberFormat(lang === 'es' ? 'es-US' : 'en-US', { style: 'currency', currency }).format(Number(value || 0));
  };

  const formatDate = (value?: string | null) => {
    if (!value) return '';
    return new Intl.DateTimeFormat(lang === 'es' ? 'es-US' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
  };

  const loadEvents = async () => {
    setLoadingEvents(true);
    setError('');
    try {
      if (mode === 'staff') {
        const [approvedResult, ownResult] = await Promise.allSettled([
          api.get('/scanner-access/me'),
          api.get('/events/mine/list'),
        ]);
        const approvedEvents = approvedResult.status === 'fulfilled'
          ? listFrom(approvedResult.value.data)
            .filter((grant) => grant.status === 'approved' && grant.event)
            .map((grant) => normalizeEvent(grant.event))
          : [];
        const ownEvents = ownResult.status === 'fulfilled'
          ? listFrom(ownResult.value.data)
            .filter((event) => (event.status || 'published') === 'published')
            .map(normalizeEvent)
          : [];
        const merged = new Map<string, DoorSaleEvent>();
        [...ownEvents, ...approvedEvents].forEach((event) => merged.set(event.id, event));
        setEvents(Array.from(merged.values()));
      } else {
        const { data } = await api.get('/events/mine/list');
        setEvents(listFrom(data).filter((event) => (event.status || 'published') === 'published').map(normalizeEvent));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || (lang === 'es' ? 'No se pudieron cargar los eventos.' : 'Could not load events.'));
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [mode]);

  useEffect(() => {
    if (selectedEventId || events.length === 0) return;
    if (typeof window !== 'undefined') {
      const eventId = new URLSearchParams(window.location.search).get('eventId');
      if (eventId && events.some((event) => event.id === eventId)) {
        setSelectedEventId(eventId);
        return;
      }
    }
    setSelectedEventId(events[0].id);
  }, [events, selectedEventId]);

  useEffect(() => {
    setCheckout(null);
    const value = Number(amount || 0);
    if (!selectedEventId || value <= 0 || quantity <= 0) {
      setPreview(null);
      return;
    }
    setLoadingPreview(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/orders/door-sale/preview', {
          params: { eventId: selectedEventId, amount: value, quantity },
        });
        setPreview(data);
      } catch (err: any) {
        setPreview(null);
      } finally {
        setLoadingPreview(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [selectedEventId, amount, quantity]);

  const createCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedEventId || Number(amount || 0) <= 0 || creating) return;
    setCreating(true);
    setError('');
    setCopied(false);
    try {
      const { data } = await api.post('/orders/door-sale/checkout', {
        eventId: selectedEventId,
        amount: Number(amount),
        quantity,
        buyerName: buyerName.trim() || undefined,
        buyerEmail: buyerEmail.trim() || undefined,
      });
      setCheckout(data);
      setPreview(data);
    } catch (err: any) {
      setError(err.response?.data?.message || (lang === 'es' ? 'No se pudo crear el cobro.' : 'Could not create payment.'));
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async () => {
    if (!checkout?.url || typeof navigator === 'undefined') return;
    await navigator.clipboard.writeText(checkout.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="page-dark-shell min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-[#0A375A] px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white">
              <HiOutlineTicket className="h-4 w-4 text-orange-300" />
              {mode === 'staff' ? (lang === 'es' ? 'Empleado' : 'Staff') : (lang === 'es' ? 'Organizador' : 'Organizer')}
            </div>
            <h1 className="mt-4 text-3xl font-black text-white">{labels.title}</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-400">{labels.subtitle}</p>
          </div>
          <button type="button" onClick={loadEvents} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase text-white">
            <HiOutlineRefresh className="mr-2 inline h-4 w-4" />
            {lang === 'es' ? 'Actualizar' : 'Refresh'}
          </button>
        </div>

        {error && <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">{error}</div>}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <form onSubmit={createCheckout} className="rounded-xl border border-[rgba(246,198,95,0.14)] bg-[rgba(8,31,51,0.82)] p-5 space-y-5">
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-300">{labels.event}</p>
                <span className="text-xs font-bold text-slate-500">{events.length}</span>
              </div>
              <div className="relative mb-3">
                <HiOutlineSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  value={eventQuery}
                  onChange={(event) => setEventQuery(event.target.value)}
                  placeholder={lang === 'es' ? 'Buscar evento...' : 'Search event...'}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-12 py-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-[#F97316]"
                />
              </div>
              {loadingEvents ? (
                <div className="h-28 skeleton rounded-xl" />
              ) : filteredEvents.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm font-bold text-slate-400">{labels.empty}</p>
              ) : (
                <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                  {filteredEvents.map((event) => {
                    const selected = event.id === selectedEventId;
                    const image = event.imageUrl || event.bannerImageUrl;
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => setSelectedEventId(event.id)}
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                          selected ? 'border-orange-400/60 bg-orange-500/12' : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white/5">
                          {image ? <img src={getImageUrl(image)} alt="" className="h-full w-full object-cover" /> : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-white">{event.title}</p>
                          <p className="truncate text-xs font-semibold text-slate-400">{[formatDate(event.eventDate), event.venueName].filter(Boolean).join(' · ')}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">{labels.amount}</span>
                <input className="input" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">{labels.quantity}</span>
                <input className="input" type="number" min="1" max="50" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value || 1)))} required />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">{labels.buyerName}</span>
                <input className="input" value={buyerName} onChange={(event) => setBuyerName(event.target.value)} />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">{labels.buyerEmail}</span>
                <input className="input" type="email" value={buyerEmail} onChange={(event) => setBuyerEmail(event.target.value)} />
              </label>
            </div>

            <button type="submit" disabled={creating || !selectedEventId} className="btn-primary w-full py-4 text-sm disabled:cursor-not-allowed disabled:opacity-60">
              {creating ? labels.creating : labels.create}
            </button>
          </form>

          <aside className="space-y-5">
            <section className="rounded-xl border border-[rgba(246,198,95,0.14)] bg-[rgba(8,31,51,0.82)] p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-300">{lang === 'es' ? 'Desglose' : 'Breakdown'}</p>
              <h2 className="mt-2 text-xl font-black text-white">{selectedEvent?.title || labels.event}</h2>
              <div className="mt-5 space-y-3">
                {[
                  [labels.base, preview?.baseTotal || 0],
                  [labels.lpFee, preview?.lpFee || 0],
                  [labels.processing, preview?.processingFee || 0],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-sm font-bold text-slate-300">{label}</span>
                    <span className="font-black text-white">{loadingPreview ? '...' : money(Number(value))}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-orange-500 pt-4">
                  <span className="text-sm font-black uppercase tracking-wider text-white">{labels.total}</span>
                  <span className="text-2xl font-black text-orange-400">{money(preview?.total || 0)}</span>
                </div>
              </div>
            </section>

            {checkout && (
              <section className="rounded-xl border border-orange-400/30 bg-orange-500/10 p-5 text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-200">{lang === 'es' ? 'Pago creado' : 'Payment created'}</p>
                {checkout.qrData && (
                  <img src={checkout.qrData} alt="Payment QR" className="mx-auto mt-4 h-56 w-56 rounded-xl bg-white p-3" />
                )}
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <a href={checkout.url} target="_blank" rel="noreferrer" className="btn-primary inline-flex items-center justify-center gap-2 px-4 py-3 text-xs">
                    <HiOutlineExternalLink className="h-4 w-4" />
                    {labels.open}
                  </a>
                  <button type="button" onClick={copyLink} className="rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-xs font-black uppercase text-white">
                    <HiOutlineClipboardCopy className="mr-1 inline h-4 w-4" />
                    {copied ? labels.copied : labels.copy}
                  </button>
                </div>
              </section>
            )}

            {mode === 'staff' && (
              <Link href="/staff/scan-access" className="block rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-xs font-black uppercase text-slate-200 hover:bg-white/10">
                <HiOutlineQrcode className="mr-2 inline h-4 w-4 text-orange-300" />
                {lang === 'es' ? 'Volver a accesos de empleado' : 'Back to staff access'}
              </Link>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
