'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { useLang } from '@/context/LanguageContext';
import { SOCIAL_MATCH_INTERESTS, getSocialInterestLabel } from '@/lib/socialMatch';
import type { Ticket } from '@/types';
import { HiOutlineCheckCircle, HiOutlineEyeOff, HiOutlineLocationMarker } from 'react-icons/hi';
import toast from 'react-hot-toast';

type SocialForm = {
  enabled: boolean;
  interests: string[];
  invisibleMode: boolean;
  shareLocation: boolean;
  instagram: string;
  industry: string;
};

const emptyForm: SocialForm = {
  enabled: false,
  interests: [],
  invisibleMode: false,
  shareLocation: false,
  instagram: '',
  industry: '',
};

export default function SocialMatchPanel() {
  const { lang } = useLang();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [preferences, setPreferences] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [form, setForm] = useState<SocialForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const eventOptions = useMemo(() => {
    const map = new Map<string, any>();
    tickets.forEach((ticket) => {
      if (ticket.eventId && ticket.event) map.set(ticket.eventId, ticket.event);
    });
    return Array.from(map.entries()).map(([id, event]) => ({ id, event }));
  }, [tickets]);

  const selectedEvent = eventOptions.find((item) => item.id === selectedEventId)?.event;

  const loadSocialMatch = async () => {
    const [ticketRes, prefsRes] = await Promise.all([
      api.get('/orders/my-tickets', { params: { page: 1, limit: 100 } }),
      api.get('/social-match/me'),
    ]);
    setTickets(ticketRes.data.data || []);
    setPreferences(prefsRes.data || []);
  };

  useEffect(() => {
    loadSocialMatch().catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedEventId && eventOptions.length > 0) {
      setSelectedEventId(eventOptions[0].id);
    }
  }, [eventOptions, selectedEventId]);

  useEffect(() => {
    const preference = preferences.find((item) => item.eventId === selectedEventId);
    setForm(preference ? {
      enabled: Boolean(preference.enabled),
      interests: preference.interests || [],
      invisibleMode: Boolean(preference.invisibleMode),
      shareLocation: Boolean(preference.shareLocation),
      instagram: preference.instagram || '',
      industry: preference.industry || '',
    } : emptyForm);

    if (selectedEventId) {
      api.get(`/social-match/events/${selectedEventId}/summary`)
        .then((res) => setSummary(res.data))
        .catch(() => setSummary(null));
    }
  }, [selectedEventId, preferences]);

  const toggleInterest = (interest: string) => {
    setForm((current) => ({
      ...current,
      interests: current.interests.includes(interest)
        ? current.interests.filter((item) => item !== interest)
        : [...current.interests, interest],
    }));
  };

  const save = async () => {
    if (!selectedEventId) return;
    setSaving(true);
    try {
      await api.put(`/social-match/events/${selectedEventId}/preferences`, form);
      await loadSocialMatch();
      toast.success(lang === 'es' ? 'Social Match actualizado' : 'Social Match updated');
    } catch {
      toast.error(lang === 'es' ? 'No se pudo guardar Social Match' : 'Could not save Social Match');
    } finally {
      setSaving(false);
    }
  };

  if (eventOptions.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-sm font-bold text-gray-700">
          {lang === 'es' ? 'Compra una entrada para activar Social Match.' : 'Buy a ticket to activate Social Match.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#0a375a]/15 bg-white p-5">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#f97316]">Social Match</p>
        <h2 className="mt-1 text-xl font-black text-[#0a375a]">
          {lang === 'es' ? 'Conecta con personas en tus eventos' : 'Connect with people at your events'}
        </h2>
        <p className="mt-1 text-sm font-semibold text-gray-500">
          {lang === 'es'
            ? 'Solo mostramos perfiles compatibles sugeridos, nunca una lista completa de asistentes.'
            : 'We only show compatible suggestions, never a full attendee list.'}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {eventOptions.map(({ id, event }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSelectedEventId(id)}
            className={`rounded-xl border p-4 text-left transition ${selectedEventId === id ? 'border-[#f97316] bg-orange-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          >
            <p className="text-sm font-black text-gray-900">{event.title}</p>
            <p className="mt-1 text-xs font-semibold text-gray-500">{event.venueName}</p>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-gray-900">{selectedEvent?.title}</p>
            <p className="text-xs font-semibold text-gray-500">
              {lang === 'es' ? 'Conecta con personas en el evento' : 'Connect with people at the event'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setForm((current) => ({ ...current, enabled: !current.enabled }))}
            className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-wide text-white ${form.enabled ? 'bg-[#f97316]' : 'bg-[#0a375a]'}`}
          >
            {form.enabled ? (lang === 'es' ? 'Activo' : 'Active') : (lang === 'es' ? 'Activar' : 'Activate')}
          </button>
        </div>

        {summary && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xl font-black text-[#0a375a]">{summary.compatibleCount || 0}</p>
              <p className="text-[10px] font-black uppercase tracking-wide text-gray-500">{lang === 'es' ? 'Compatibles' : 'Compatible'}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xl font-black text-[#0a375a]">{summary.sharedInterestCount || 0}</p>
              <p className="text-[10px] font-black uppercase tracking-wide text-gray-500">{lang === 'es' ? 'Intereses' : 'Interests'}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xl font-black text-[#0a375a]">{summary.vipCompatibleCount || 0}</p>
              <p className="text-[10px] font-black uppercase tracking-wide text-gray-500">VIP</p>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {SOCIAL_MATCH_INTERESTS.map((interest) => (
            <button
              key={interest.id}
              type="button"
              onClick={() => toggleInterest(interest.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${form.interests.includes(interest.id) ? 'border-[#f97316] bg-orange-50 text-[#c2410c]' : 'border-gray-200 bg-white text-gray-600'}`}
            >
              {getSocialInterestLabel(interest.id, lang)}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-sm font-bold text-gray-700">
            <input type="checkbox" checked={form.invisibleMode} onChange={(e) => setForm({ ...form, invisibleMode: e.target.checked })} />
            <HiOutlineEyeOff className="h-4 w-4" />
            {lang === 'es' ? 'Modo invisible / privado' : 'Invisible / private mode'}
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-sm font-bold text-gray-700">
            <input type="checkbox" checked={form.shareLocation} onChange={(e) => setForm({ ...form, shareLocation: e.target.checked })} />
            <HiOutlineLocationMarker className="h-4 w-4" />
            {lang === 'es' ? 'Permitir ubicación aproximada' : 'Allow approximate location'}
          </label>
          <input className="input text-sm" placeholder="Instagram" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
          <input className="input text-sm" placeholder={lang === 'es' ? 'Industria / profesión' : 'Industry / profession'} value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
        </div>

        <button onClick={save} disabled={saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0a375a] px-5 py-3 text-sm font-black text-white disabled:opacity-60">
          <HiOutlineCheckCircle className="h-4 w-4" />
          {saving ? (lang === 'es' ? 'Guardando...' : 'Saving...') : (lang === 'es' ? 'Guardar Social Match' : 'Save Social Match')}
        </button>
      </div>
    </div>
  );
}
