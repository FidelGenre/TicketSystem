'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';
import { useLang } from '@/context/LanguageContext';
import { VenueSection } from '@/types';
import {
  HiOutlinePlus,
  HiOutlineSave,
  HiOutlineTrash,
  HiOutlineZoomIn,
  HiOutlineZoomOut,
} from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface VenueMapBuilderProps {
  eventId: string;
  initialSections: VenueSection[];
  onSaved: (sections: VenueSection[]) => void;
  onChange?: (sections: Partial<VenueSection>[]) => void;
}

const SECTION_COLORS = ['#f97316', '#3b82f6', '#10b981', '#a855f7', '#ec4899', '#ef4444', '#f59e0b', '#6366f1'];

// Stage is the anchor: centered horizontally at y=60 in canvas space
const STAGE_W = 320;
const STAGE_H = 60;
const CANVAS_W = 2000;
const CANVAS_H = 1600;
const STAGE_X = (CANVAS_W - STAGE_W) / 2;
const STAGE_Y = 60;

export default function VenueMapBuilder({ eventId, initialSections, onSaved, onChange }: VenueMapBuilderProps) {
  const { t, lang } = useLang();
  const [sections, setSections] = useState<Partial<VenueSection>[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Pan & zoom state stored in refs so we don't re-render on every frame
  const viewRef = useRef({ x: 0, y: 0, scale: 0.6 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Pointer-based pan of the viewport
  const panningRef = useRef(false);
  const panStartRef = useRef({ mx: 0, my: 0, vx: 0, vy: 0 });

  // Pointer-based drag/resize of a section
  const draggingRef = useRef<{ id: string; type: 'move' | 'resize'; startMx: number; startMy: number; origX: number; origY: number; origW: number; origH: number } | null>(null);

  // Apply the CSS transform without a React re-render
  const applyTransform = useCallback(() => {
    if (!canvasRef.current) return;
    const { x, y, scale } = viewRef.current;
    canvasRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }, []);

  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current && initialSections.length > 0) {
      setSections(JSON.parse(JSON.stringify(initialSections)));
      initializedRef.current = true;
    }
  }, [initialSections]);

  useEffect(() => {
    if (onChange) onChange(sections);
  }, [sections, onChange]);

  useEffect(() => {
    if (!viewportRef.current) return;
    const vw = viewportRef.current.clientWidth;
    const vh = viewportRef.current.clientHeight;
    const scale = 0.55;
    // Center so stage top-center is visible
    viewRef.current = {
      scale,
      x: vw / 2 - (STAGE_X + STAGE_W / 2) * scale,
      y: vh / 4 - STAGE_Y * scale,
    };
    applyTransform();
  }, [applyTransform]);

  // ── Viewport pointer events (pan + zoom) ─────────────────────────────────
  const onViewportPointerDown = useCallback((e: React.PointerEvent) => {
    // Only pan when clicking the viewport background, not a section
    if ((e.target as HTMLElement).closest('[data-section]')) return;
    panningRef.current = true;
    panStartRef.current = { mx: e.clientX, my: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
  }, []);

  const onViewportPointerMove = useCallback((e: React.PointerEvent) => {
    if (draggingRef.current) {
      const { id, type, startMx, startMy, origX, origY, origW, origH } = draggingRef.current;
      const scale = viewRef.current.scale;
      const dx = (e.clientX - startMx) / scale;
      const dy = (e.clientY - startMy) / scale;

      const el = document.getElementById(`sec-${id}`);
      if (!el) return;

      if (type === 'move') {
        const newX = Math.max(0, origX + dx);
        const newY = Math.max(STAGE_Y + STAGE_H + 10, origY + dy);
        el.style.left = `${newX}px`;
        el.style.top = `${newY}px`;
        (draggingRef.current as any)._pendingX = newX;
        (draggingRef.current as any)._pendingY = newY;
      } else {
        const newW = Math.max(40, origW + dx);
        const newH = Math.max(40, origH + dy);
        el.style.width = `${newW}px`;
        el.style.height = `${newH}px`;
        (draggingRef.current as any)._pendingW = newW;
        (draggingRef.current as any)._pendingH = newH;
      }
      return;
    }
    if (!panningRef.current) return;
    const { mx, my, vx, vy } = panStartRef.current;
    viewRef.current.x = vx + (e.clientX - mx);
    viewRef.current.y = vy + (e.clientY - my);
    applyTransform();
  }, [applyTransform]);

  const onViewportPointerUp = useCallback((e: React.PointerEvent) => {
    if (draggingRef.current) {
      const { id } = draggingRef.current;
      const pX = (draggingRef.current as any)._pendingX;
      const pY = (draggingRef.current as any)._pendingY;
      const pW = (draggingRef.current as any)._pendingW;
      const pH = (draggingRef.current as any)._pendingH;
      
      setSections(prev => prev.map(s => {
        if (s.id !== id) return s;
        return {
          ...s,
          mapX: pX ?? s.mapX,
          mapY: pY ?? s.mapY,
          mapWidth: pW ?? s.mapWidth,
          mapHeight: pH ?? s.mapHeight,
        };
      }));
      draggingRef.current = null;
      (e.currentTarget as HTMLElement).style.cursor = 'default';
      return;
    }
    panningRef.current = false;
    (e.currentTarget as HTMLElement).style.cursor = 'default';
  }, []);

  const onViewportWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const zoomSpeed = 0.001;
    const delta = -e.deltaY * zoomSpeed;
    const oldScale = viewRef.current.scale;
    const newScale = Math.min(3, Math.max(0.1, oldScale + delta));
    
    if (newScale === oldScale) return;

    const rect = viewportRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Correct zoom centering logic:
    // We want the point (mx, my) in screen coordinates to map to the same 
    // point in world coordinates before and after the zoom.
    const ratio = newScale / oldScale;
    viewRef.current.x = mx - (mx - viewRef.current.x) * ratio;
    viewRef.current.y = my - (my - viewRef.current.y) * ratio;
    viewRef.current.scale = newScale;

    applyTransform();
  }, [applyTransform]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.addEventListener('wheel', onViewportWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onViewportWheel);
  }, [onViewportWheel]);

  const zoomIn = () => { viewRef.current.scale = Math.min(3, viewRef.current.scale + 0.1); applyTransform(); };
  const zoomOut = () => { viewRef.current.scale = Math.max(0.2, viewRef.current.scale - 0.1); applyTransform(); };
  const resetView = () => {
    if (!viewportRef.current) return;
    const vw = viewportRef.current.clientWidth;
    const vh = viewportRef.current.clientHeight;
    const scale = 0.55;
    viewRef.current = { scale, x: vw / 2 - (STAGE_X + STAGE_W / 2) * scale, y: vh / 4 - STAGE_Y * scale };
    applyTransform();
  };

  // ── Section pointer events ───────────────────────────────────────────────
  const onSectionPointerDown = useCallback((e: React.PointerEvent, sec: Partial<VenueSection>, type: 'move' | 'resize' = 'move') => {
    e.stopPropagation();
    setSelectedId(sec.id!);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = {
      id: sec.id!,
      type,
      startMx: e.clientX,
      startMy: e.clientY,
      origX: sec.mapX || 0,
      origY: sec.mapY || 0,
      origW: sec.mapWidth || 100,
      origH: sec.mapHeight || 100,
    };
  }, []);

  // ── Section management ──────────────────────────────────────────────────
  const handleAddSection = (type: string) => {
    const colorIndex = sections.length % SECTION_COLORS.length;
    const newSection: Partial<VenueSection> = {
      id: `temp-${Date.now()}`,
      eventId,
      name: `Nueva ${type}`,
      sectionType: type as any,
      rows: type === 'table' ? 1 : 5,
      seatsPerRow: type === 'table' ? 4 : 10,
      price: 50,
      color: SECTION_COLORS[colorIndex],
      mapX: STAGE_X + Math.random() * 300 - 150 + STAGE_W / 2,
      mapY: STAGE_Y + STAGE_H + 80 + sections.length * 30,
      mapWidth: type === 'table' ? 80 : 160,
      mapHeight: type === 'table' ? 80 : 100,
      capacity: 0,
    };
    setSections(prev => [...prev, newSection]);
    setSelectedId(newSection.id!);
  };

  const updateSelected = (field: string, value: any) => {
    setSections(prev => prev.map(s => s.id === selectedId ? { ...s, [field]: value } : s));
  };

  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteSelected = () => {
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    setSections(prev => prev.filter(s => s.id !== selectedId));
    setSelectedId(null);
    setShowConfirm(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = sections.map(s => {
        const copy = { ...s };
        if (copy.id?.startsWith('temp-')) delete copy.id;
        return copy;
      });
      const { data } = await api.post(`/events/${eventId}/sections/bulk`, payload);
      toast.success(lang === 'es' ? 'Mapa guardado correctamente' : 'Map saved successfully');
      onSaved(data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving map');
    } finally {
      setSaving(false);
    }
  };

  const selectedSection = sections.find(s => s.id === selectedId);

  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[700px] lg:h-[750px] relative">
      {/* Mobile Tools Toggle */}
      <div className="lg:hidden flex gap-2 mb-2">
        <button 
          onClick={() => setMobileToolsOpen(!mobileToolsOpen)}
          className="flex-1 btn-secondary justify-center py-2.5 text-sm"
        >
          {mobileToolsOpen ? (lang === 'es' ? 'Ocultar Herramientas' : 'Hide Tools') : (lang === 'es' ? 'Ver Herramientas' : 'Show Tools')}
        </button>
      </div>

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <div className={`${mobileToolsOpen ? 'flex' : 'hidden'} lg:flex w-full lg:w-80 flex-col gap-4 shrink-0 overflow-y-auto lg:h-full pb-4 lg:pb-0 z-30`}>
        {/* Tools */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center justify-between">
            {lang === 'es' ? 'Herramientas' : 'Tools'}
            <span className="text-[10px] font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {sections.length} total
            </span>
          </h3>
          <div className="space-y-2">
            <button onClick={() => handleAddSection('seated')} className="w-full btn-secondary text-sm justify-start group">
              <div className="w-8 h-8 rounded bg-orange-100 text-orange-600 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                <HiOutlinePlus className="w-4 h-4" />
              </div>
              <div className="text-left ml-2">
                <p className="font-bold leading-none">{lang === 'es' ? 'Gradería / Bloque' : 'Block Seating'}</p>
                <p className="text-[10px] text-gray-400 mt-1">{lang === 'es' ? 'Filas y sillas en masa' : 'Mass rows and seats'}</p>
              </div>
            </button>
            <button 
              onClick={() => {
                const colorIndex = sections.length % SECTION_COLORS.length;
                const newSection: Partial<VenueSection> = {
                  id: `temp-${Date.now()}`,
                  eventId,
                  name: lang === 'es' ? 'Silla' : 'Seat',
                  sectionType: 'seated',
                  price: 25,
                  color: SECTION_COLORS[colorIndex],
                  mapX: STAGE_X + STAGE_W / 2,
                  mapY: STAGE_Y + STAGE_H + 80,
                  mapWidth: 35,
                  mapHeight: 35,
                  rows: 1,
                  seatsPerRow: 1,
                  capacity: 1,
                };
                setSections(prev => [...prev, newSection]);
                setSelectedId(newSection.id!);
              }}
              className="w-full btn-secondary text-sm justify-start group"
            >
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                <HiOutlinePlus className="w-4 h-4" />
              </div>
              <div className="text-left ml-2">
                <p className="font-bold leading-none">{lang === 'es' ? 'Silla Individual' : 'Single Seat'}</p>
                <p className="text-[10px] text-gray-400 mt-1">{lang === 'es' ? 'Ubicación precisa' : 'Precise location'}</p>
              </div>
            </button>
            <button onClick={() => handleAddSection('table')} className="w-full btn-secondary text-sm justify-start group">
              <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <HiOutlinePlus className="w-4 h-4" />
              </div>
              <div className="text-left ml-2">
                <p className="font-bold leading-none">{lang === 'es' ? 'Mesa' : 'Table'}</p>
                <p className="text-[10px] text-gray-400 mt-1">{lang === 'es' ? 'Circular / VIP' : 'Round / VIP'}</p>
              </div>
            </button>
            <button onClick={() => handleAddSection('standing')} className="w-full btn-secondary text-sm justify-start group">
              <div className="w-8 h-8 rounded bg-green-100 text-green-600 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <HiOutlinePlus className="w-4 h-4" />
              </div>
              <div className="text-left ml-2">
                <p className="font-bold leading-none">{lang === 'es' ? 'Zona General' : 'Standing Area'}</p>
                <p className="text-[10px] text-gray-400 mt-1">{lang === 'es' ? 'Espacio libre' : 'Open space'}</p>
              </div>
            </button>
            <button onClick={() => handleAddSection('vip')} className="w-full btn-secondary text-sm justify-start group">
              <div className="w-8 h-8 rounded bg-purple-100 text-purple-600 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <HiOutlinePlus className="w-4 h-4" />
              </div>
              <div className="text-left ml-2">
                <p className="font-bold leading-none">{lang === 'es' ? 'Zona VIP' : 'VIP Zone'}</p>
                <p className="text-[10px] text-gray-400 mt-1">{lang === 'es' ? 'Exclusividad' : 'Exclusivity'}</p>
              </div>
            </button>

            <div className="pt-2 border-t border-gray-100 mt-2">
              <button 
                onClick={() => {
                  const name = prompt(lang === 'es' ? 'Nombre de la herramienta personalizada:' : 'Custom tool name:');
                  if (name) {
                    const colorIndex = sections.length % SECTION_COLORS.length;
                    const newSection: Partial<VenueSection> = {
                      id: `temp-${Date.now()}`,
                      eventId,
                      name,
                      sectionType: 'standing' as any,
                      price: 50,
                      color: SECTION_COLORS[colorIndex],
                      mapX: STAGE_X + STAGE_W / 2,
                      mapY: STAGE_Y + STAGE_H + 80,
                      mapWidth: 120,
                      mapHeight: 80,
                      capacity: 100,
                    };
                    setSections(prev => [...prev, newSection]);
                    setSelectedId(newSection.id!);
                  }
                }} 
                className="w-full border-2 border-dashed border-primary-200 text-primary-600 hover:border-primary-400 hover:bg-primary-50 rounded-xl py-3 px-4 text-xs font-bold flex flex-col items-center gap-1 transition-all"
              >
                <HiOutlinePlus className="w-5 h-5" />
                {lang === 'es' ? 'CREAR HERRAMIENTA PROPIA' : 'CREATE OWN TOOL'}
              </button>
            </div>
          </div>
        </div>

        {/* Properties */}
        {selectedSection ? (
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">{lang === 'es' ? 'Propiedades de Sección' : 'Section Properties'}</h3>
              <button 
                onClick={handleDeleteSelected} 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all text-xs font-bold border border-red-100"
              >
                <HiOutlineTrash className="w-4 h-4" />
                {lang === 'es' ? 'ELIMINAR' : 'DELETE'}
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('orgSectionName')}</label>
                <input type="text" value={selectedSection.name || ''} onChange={e => updateSelected('name', e.target.value)} className="input text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('orgPrice')}</label>
                  <input type="number" value={selectedSection.price || 0} onChange={e => updateSelected('price', +e.target.value)} className="input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{lang === 'es' ? 'Tipo' : 'Type'}</label>
                  <select value={selectedSection.sectionType} onChange={e => updateSelected('sectionType', e.target.value)} className="input text-sm">
                    <option value="seated">Asientos</option>
                    <option value="standing">General</option>
                    <option value="table">Mesa</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
              </div>
              {selectedSection.sectionType !== 'standing' && (
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                  <p className="text-[10px] text-orange-700 font-bold uppercase mb-2">Configuración de Capacidad</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">FILAS</label>
                      <input type="number" value={selectedSection.rows || 1} onChange={e => updateSelected('rows', +e.target.value)} className="input text-sm h-9" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">SILLAS / FILA</label>
                      <input type="number" value={selectedSection.seatsPerRow || 1} onChange={e => updateSelected('seatsPerRow', +e.target.value)} className="input text-sm h-9" />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 italic leading-tight">
                    {lang === 'es' 
                      ? '* Multiplica filas x sillas para obtener el total de tickets de esta sección.' 
                      : '* Multiply rows x seats to get the total tickets for this section.'}
                  </p>
                </div>
              )}
              {selectedSection.sectionType === 'standing' && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('orgCapacity')}</label>
                  <input type="number" value={selectedSection.capacity || 100} onChange={e => updateSelected('capacity', +e.target.value)} className="input text-sm" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Ancho (px)</label>
                  <input type="number" value={selectedSection.mapWidth || 100} onChange={e => updateSelected('mapWidth', +e.target.value)} className="input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Alto (px)</label>
                  <input type="number" value={selectedSection.mapHeight || 100} onChange={e => updateSelected('mapHeight', +e.target.value)} className="input text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
                <div className="flex flex-wrap gap-2">
                  {SECTION_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => updateSelected('color', color)}
                      className={`w-7 h-7 rounded-full transition-transform ${selectedSection.color === color ? 'ring-2 ring-offset-2 ring-gray-500 scale-110' : 'hover:scale-110'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex-1 flex items-center justify-center text-center text-gray-400">
            <p className="text-sm">{lang === 'es' ? 'Haz clic en un elemento del mapa para editarlo' : 'Click an element to edit it'}</p>
          </div>
        )}

        <button onClick={handleSave} disabled={saving} className="btn-primary py-3 w-full justify-center">
          <HiOutlineSave className="w-5 h-5" />
          {saving ? (lang === 'es' ? 'Guardando...' : 'Saving...') : (lang === 'es' ? 'Guardar Mapa' : 'Save Map')}
        </button>
      </div>

      {/* ── Canvas Viewport ─────────────────────────────────────────── */}
      <div
        ref={viewportRef}
        className="flex-1 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl relative overflow-hidden min-h-[450px]"
        style={{ cursor: 'default', userSelect: 'none', touchAction: 'none' }}
        onPointerDown={onViewportPointerDown}
        onPointerMove={onViewportPointerMove}
        onPointerUp={onViewportPointerUp}
        onPointerLeave={onViewportPointerUp}
        onClick={() => setSelectedId(null)}
      >
        {/* Zoom Controls */}
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1 bg-white rounded-lg shadow border border-gray-200 p-1">
          <button onClick={zoomIn} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-gray-700">
            <HiOutlineZoomIn className="w-4 h-4" />
          </button>
          <button onClick={zoomOut} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-gray-700">
            <HiOutlineZoomOut className="w-4 h-4" />
          </button>
          <button onClick={resetView} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-gray-700 text-[10px] font-bold">
            ⌖
          </button>
        </div>

        {/* Hint */}
        <div className="absolute bottom-3 left-3 z-20 text-[10px] text-gray-400 bg-white/80 rounded px-2 py-1">
          {lang === 'es' ? 'Rueda: zoom · Arrastrar fondo: mover · Arrastra secciones' : 'Wheel: zoom · Drag bg: pan · Drag sections'}
        </div>

        {/* Canvas (transformed) */}
        <div
          ref={canvasRef}
          style={{
            position: 'absolute',
            width: CANVAS_W,
            height: CANVAS_H,
            transformOrigin: '0 0',
            backgroundImage: 'radial-gradient(#d1d5db 1.5px, transparent 1.5px)',
            backgroundSize: '30px 30px',
            willChange: 'transform',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── STAGE (anchor) ─────────────────────────────────────── */}
          <div
            style={{
              position: 'absolute',
              left: STAGE_X,
              top: STAGE_Y,
              width: STAGE_W,
              height: STAGE_H,
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              borderRadius: '8px 8px 50% 50% / 8px 8px 30px 30px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
              pointerEvents: 'none',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div className="w-12 h-1 bg-white/20 rounded-full mb-2" />
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 800, letterSpacing: 5, textTransform: 'uppercase', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              {lang === 'es' ? 'ESCENARIO PRINCIPAL' : 'MAIN STAGE'}
            </span>
          </div>

          {/* ── Sections ───────────────────────────────────────────── */}
          {sections.map(sec => {
            const isSelected = selectedId === sec.id;
            return (
              <div
                key={sec.id}
                id={`sec-${sec.id}`}
                data-section="true"
                onPointerDown={e => { e.stopPropagation(); onSectionPointerDown(e, sec); }}
                onClick={e => { e.stopPropagation(); setSelectedId(sec.id!); }}
                style={{
                  position: 'absolute',
                  left: sec.mapX || 0,
                  top: sec.mapY || (STAGE_Y + STAGE_H + 60),
                  width: sec.mapWidth || 100,
                  height: sec.mapHeight || 100,
                  backgroundColor: sec.color || '#3b82f6',
                  borderRadius: (sec.sectionType === 'table' || (sec.mapWidth === sec.mapHeight && sec.mapWidth < 50)) ? '50%' : 10,
                  cursor: 'move',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: isSelected
                    ? `0 0 0 3px #fff, 0 0 0 6px ${sec.color}, 0 12px 32px rgba(0,0,0,0.3)`
                    : '0 4px 12px rgba(0,0,0,0.15)',
                  outline: 'none',
                  zIndex: isSelected ? 20 : 10,
                  transition: 'box-shadow 0.15s ease',
                  willChange: 'left, top',
                  touchAction: 'none',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 12, textAlign: 'center', padding: '0 6px', pointerEvents: 'none', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                  {sec.name}
                </span>
                <span style={{ fontSize: 10, opacity: 0.9, pointerEvents: 'none' }}>
                  ${sec.price}
                </span>

                {/* Resize Handle */}
                {isSelected && (
                  <div
                    onPointerDown={e => { e.stopPropagation(); onSectionPointerDown(e, sec, 'resize'); }}
                    style={{
                      position: 'absolute',
                      bottom: -8,
                      right: -8,
                      width: 24,
                      height: 24,
                      backgroundColor: '#fff',
                      border: `2px solid ${sec.color}`,
                      borderRadius: '50%',
                      cursor: 'nwse-resize',
                      zIndex: 100,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      touchAction: 'none'
                    }}
                  >
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <HiOutlineTrash className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {lang === 'es' ? '¿Eliminar sección?' : 'Delete section?'}
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                {lang === 'es' 
                  ? 'Esta acción no se puede deshacer. Los asientos asociados también serán eliminados al guardar.' 
                  : 'This action cannot be undone. Associated seats will also be removed upon saving.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 btn-secondary py-2.5 justify-center"
                >
                  {t('orgCancel')}
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl py-2.5 transition-all shadow-lg shadow-red-500/20"
                >
                  {lang === 'es' ? 'Eliminar' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
