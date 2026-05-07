'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { Ticket } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineTicket } from 'react-icons/hi';

export default function VerifyTicketPage() {
  const { code } = useParams<{ code: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<{ valid: boolean; message: string } | null>(null);

  useEffect(() => { loadTicket(); }, [code]);

  const loadTicket = async () => {
    try { const { data } = await api.get(`/orders/ticket/${code}`); setTicket(data); } catch { setTicket(null); } finally { setLoading(false); }
  };

  const validate = async () => {
    setValidating(true);
    try { const { data } = await api.post(`/orders/ticket/${code}/validate`); setResult(data); if (data.ticket) setTicket(data.ticket); }
    catch { setResult({ valid: false, message: 'Error al validar' }); } finally { setValidating(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

  if (!ticket) return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="text-center">
        <HiOutlineXCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="font-bold text-2xl text-gray-900 mb-2">Ticket no encontrado</h1>
        <p className="text-gray-500">Código <span className="font-mono text-primary-600">{code}</span> no existe</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-blue-900 p-6 text-center">
            <HiOutlineTicket className="w-8 h-8 text-white mx-auto mb-2" />
            <h1 className="font-bold text-lg text-white">{ticket.event?.title}</h1>
            <p className="text-white/70 text-sm mt-1">
              {ticket.event?.eventDate && format(new Date(ticket.event.eventDate), "dd 'de' MMMM, yyyy — hh:mm a", { locale: es })}
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="text-center"><p className="text-xs text-gray-500">Lugar</p><p className="font-semibold text-gray-900">{ticket.event?.venueName}</p></div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div><p className="text-xs text-gray-500">Comprador</p><p className="font-semibold text-gray-900 text-sm">{ticket.user?.firstName} {ticket.user?.lastName}</p></div>
              <div><p className="text-xs text-gray-500">Tipo</p><p className="font-semibold text-gray-900 text-sm">{ticket.sectionName || 'General'}</p></div>
            </div>
            {ticket.rowLabel && <div className="text-center"><p className="text-xs text-gray-500">Asiento</p><p className="font-semibold text-gray-900">Fila {ticket.rowLabel}, Asiento {ticket.seatNumber}</p></div>}
            {ticket.qrData && <div className="flex justify-center py-2"><img src={ticket.qrData} alt="QR" className="w-40 h-40 rounded border p-2" /></div>}
            <div className="text-center"><p className="font-mono text-lg font-bold text-primary-600 tracking-widest">{ticket.ticketCode}</p></div>
            <div className="text-center">
              <span className={`inline-flex px-3 py-1.5 rounded text-sm font-semibold ${ticket.status === 'active' ? 'bg-green-100 text-green-700' : ticket.status === 'used' ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-700'}`}>
                {ticket.status === 'active' ? '✅ Activo' : ticket.status === 'used' ? '☑️ Usado' : '❌ Cancelado'}
              </span>
            </div>
            {result && (
              <div className={`p-3 rounded text-center ${result.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                {result.valid ? <HiOutlineCheckCircle className="w-8 h-8 text-green-600 mx-auto mb-1" /> : <HiOutlineXCircle className="w-8 h-8 text-red-600 mx-auto mb-1" />}
                <p className={`text-sm font-medium ${result.valid ? 'text-green-700' : 'text-red-700'}`}>{result.message}</p>
              </div>
            )}
            {ticket.status === 'active' && !result && (
              <button onClick={validate} disabled={validating} className="btn-primary w-full py-3">{validating ? 'Validando...' : '🔍 VALIDAR TICKET'}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
