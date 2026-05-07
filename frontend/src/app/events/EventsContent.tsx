'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import EventCard from '@/components/events/EventCard';
import { Event, EventsResponse } from '@/types';
import { useCategories } from '@/context/CategoryContext';
import { HiOutlineSearch } from 'react-icons/hi';

export default function EventsContent() {
  const searchParams = useSearchParams();
  const { categories } = useCategories();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');

  useEffect(() => { loadEvents(); }, [page, category]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 12 };
      if (category) params.category = category;
      if (search) params.search = search;
      const { data } = await api.get<EventsResponse>('/events', { params });
      setEvents(data.events);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); loadEvents(); };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search + Category filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
          <input 
            type="text" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Buscar eventos..." 
            className="input pr-24 py-2.5" 
            style={{ paddingLeft: '3rem' }}
          />
          <button type="submit" className="btn-primary absolute right-1 top-1/2 -translate-y-1/2 text-xs py-1.5 px-4 rounded-lg">Buscar</button>
        </form>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button onClick={() => { setCategory(''); setPage(1); }} className={`category-pill ${!category ? 'active' : ''}`}>Todos</button>
        {categories.map((cat) => (
          <button key={cat.slug} onClick={() => { setCategory(cat.slug); setPage(1); }} className={`category-pill ${category === cat.slug ? 'active' : ''}`}>
            {cat.labelEs}
          </button>
        ))}
      </div>

      <p className="text-sm text-gray-500 mb-4">{total} {total === 1 ? 'evento encontrado' : 'eventos encontrados'}</p>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card"><div className="aspect-[3/4] skeleton" /><div className="p-4 space-y-2"><div className="h-4 skeleton rounded w-3/4" /><div className="h-3 skeleton rounded w-1/2" /></div></div>
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {events.map((event) => <EventCard key={event.id} event={event} />)}
        </div>
      ) : (
        <div className="text-center py-20 border border-gray-200 rounded-lg"><p className="text-gray-500">No se encontraron eventos</p></div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-10">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`w-9 h-9 rounded text-sm font-medium transition-all ${p === page ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}
