'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Event, VenueSection, Seat, SeatStatus } from '@/types';
import { useCategories } from '@/context/CategoryContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { HiOutlineCalendar, HiOutlineLocationMarker, HiOutlineClock, HiOutlineTicket } from 'react-icons/hi';

export default function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { getCategoryInfo } = useCategories();
  const [event, setEvent] = useState<Event | null>(null);
  const [seatMap, setSeatMap] = useState<(VenueSection & { seats: Seat[] })[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  useEffect(() => { loadEvent(); }, [slug]);

  const loadEvent = async () => {
    try {
      const { data } = await api.get(`/events/${slug}`);
      setEvent(data);
      if (data.id) {
        const { data: map } = await api.get(`/events/${data.id}/seatmap`);
        setSeatMap(map);
      }
    } catch { router.push('/events'); }
    finally { setLoading(false); }
  };

  const toggleSeat = (seat: Seat) => {
    if (seat.status !== SeatStatus.AVAILABLE) return;
    setSelectedSeats((prev) => prev.find((s) => s.id === seat.id) ? prev.filter((s) => s.id !== seat.id) : [...prev, seat]);
  };

  const isSeatSelected = (seatId: string) => selectedSeats.some((s) => s.id === seatId);

  const getTotalPrice = () => selectedSeats.reduce((total, seat) => {
    const section = seatMap.find((s) => s.id === seat.sectionId);
    return total + (section ? Number(section.price) : 0);
  }, 0);

  const handleBuyTickets = () => {
    if (!isAuthenticated) { router.push(`/login?redirect=/events/${slug}/purchase`); return; }
    router.push(`/events/${slug}/purchase`);
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-8"><div className="h-64 skeleton rounded-lg mb-6" /><div className="h-6 skeleton rounded w-1/2 mb-3" /></div>;
  if (!event) return null;

  const categoryInfo = getCategoryInfo(event.category) || {
    labelEs: 'Otro', labelEn: 'Other', icon: '🎫', color: '#6366f1'
  };
  const eventDate = new Date(event.eventDate);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Image */}
      <div className="relative rounded-lg overflow-hidden mb-8 aspect-[21/9]">
        {event.imageUrl ? (
          <img src={event.imageUrl.startsWith('http') ? event.imageUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${event.imageUrl}`} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-600 to-primary-500 flex items-center justify-center">
            <span className="text-8xl">{categoryInfo.icon}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Event Info */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <span className="category-pill text-xs mb-3 inline-block">{categoryInfo.icon} {categoryInfo.labelEs}</span>
            <h1 className="font-bold text-2xl sm:text-3xl text-gray-900">{event.title}</h1>
          </div>

          {/* Quick info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <HiOutlineCalendar className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <div className="text-xs text-gray-500">Fecha</div>
                <div className="text-sm font-semibold text-gray-900">{format(eventDate, "dd 'de' MMMM, yyyy", { locale: es })}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <HiOutlineClock className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <div className="text-xs text-gray-500">Hora</div>
                <div className="text-sm font-semibold text-gray-900">{format(eventDate, 'hh:mm a')}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <HiOutlineLocationMarker className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <div className="text-xs text-gray-500">Lugar</div>
                <div className="text-sm font-semibold text-gray-900 truncate">{event.venueName}</div>
              </div>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="font-bold text-lg text-gray-900 mb-3">Acerca del evento</h2>
              <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{event.description}</div>
            </div>
          )}

          {/* Seat Map */}
          {seatMap.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="font-bold text-lg text-gray-900 mb-4">Selecciona tus asientos</h2>
              <div className="stage mb-6 mx-auto max-w-md">ESCENARIO</div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mb-6 justify-center">
                <div className="flex items-center gap-2 text-xs text-gray-600"><div className="seat seat-available w-5 h-5" /> Disponible</div>
                <div className="flex items-center gap-2 text-xs text-gray-600"><div className="seat seat-selected w-5 h-5" /> Seleccionado</div>
                <div className="flex items-center gap-2 text-xs text-gray-600"><div className="seat seat-sold w-5 h-5" /> Vendido</div>
                <div className="flex items-center gap-2 text-xs text-gray-600"><div className="seat seat-locked w-5 h-5" /> Reservado</div>
              </div>

              {seatMap.map((section) => (
                <div key={section.id} className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: section.color }} />{section.name}
                    </h3>
                    <span className="text-xs text-primary-600 font-bold">${Number(section.price).toFixed(2)} {event.currency || 'USD'}</span>
                  </div>
                  {section.seats && section.seats.length > 0 ? (
                    <div className="overflow-x-auto">
                      <div className="flex flex-col items-center gap-1 min-w-fit px-4">
                        {Array.from(new Set(section.seats.map((s) => s.rowLabel))).map((row) => (
                          <div key={row} className="flex items-center gap-1">
                            <span className="w-6 text-xs text-gray-400 text-right font-mono">{row}</span>
                            {section.seats.filter((s) => s.rowLabel === row).sort((a, b) => a.seatNumber - b.seatNumber).map((seat) => (
                              <button key={seat.id} onClick={() => toggleSeat(seat)} disabled={seat.status !== SeatStatus.AVAILABLE && !isSeatSelected(seat.id)}
                                className={`seat ${isSeatSelected(seat.id) ? 'seat-selected' : seat.status === SeatStatus.AVAILABLE ? 'seat-available' : seat.status === SeatStatus.SOLD ? 'seat-sold' : 'seat-locked'}`}
                                title={`${section.name} — Fila ${seat.rowLabel}, Asiento ${seat.seatNumber}`}>
                                <span className="text-[9px] font-mono">{seat.seatNumber}</span>
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <p className="text-gray-400 text-sm">Entrada general</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar — Purchase */}
        <div className="lg:col-span-1">
          <div className="sticky top-20">
            <div className="border border-gray-200 rounded-lg p-6 space-y-4 bg-white shadow-sm">
              <h3 className="font-bold text-lg text-gray-900">Resumen de compra</h3>

              {seatMap.length > 0 && (
                <div className="space-y-2">
                  {seatMap.map((section) => (
                    <div key={section.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: section.color }} />{section.name}</span>
                      <span className="font-semibold text-gray-900">${Number(section.price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedSeats.length > 0 && (
                <>
                  <hr className="border-gray-200" />
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500 mb-1">Asientos seleccionados:</div>
                    {selectedSeats.map((seat) => {
                      const section = seatMap.find((s) => s.id === seat.sectionId);
                      return (
                        <div key={seat.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{section?.name} — {seat.rowLabel}{seat.seatNumber}</span>
                          <span className="font-medium text-gray-800">${section ? Number(section.price).toFixed(2) : '0.00'}</span>
                        </div>
                      );
                    })}
                  </div>
                  <hr className="border-gray-200" />
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="text-gray-800">${getTotalPrice().toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Cargo por servicio (10%)</span><span className="text-gray-800">${(getTotalPrice() * 0.10).toFixed(2)}</span></div>
                    <hr className="border-gray-200" />
                    <div className="flex justify-between font-bold text-base"><span className="text-gray-900">Total</span><span className="text-primary-600">${(getTotalPrice() * 1.10).toFixed(2)} {event.currency || 'USD'}</span></div>
                  </div>
                </>
              )}

              <button onClick={handleBuyTickets} className="btn-primary w-full py-3">
                COMPRAR TICKETS
              </button>
              <p className="text-[10px] text-gray-400 text-center">Pagos seguros procesados por Stripe</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
