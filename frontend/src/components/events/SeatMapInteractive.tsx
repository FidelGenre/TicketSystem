'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { VenueSection, Seat, SeatStatus } from '@/types';

interface SeatMapInteractiveProps {
  seatMap: (VenueSection & { seats: Seat[] })[];
  selectedSeats: Seat[];
  onToggleSeat: (seat: Seat) => void;
  /** Optional: restrict to just one section */
  filterSectionId?: string;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;

export default function SeatMapInteractive({
  seatMap,
  selectedSeats,
  onToggleSeat,
  filterSectionId,
}: SeatMapInteractiveProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const sections = filterSectionId
    ? seatMap.filter((s) => s.id === filterSectionId)
    : seatMap;

  const isSeatSelected = (id: string) => selectedSeats.some((s) => s.id === id);

  const zoomIn = () => setZoom((z) => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  const zoomOut = () => setZoom((z) => Math.max(z - ZOOM_STEP, MIN_ZOOM));
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // Mouse wheel zoom
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((z) => Math.min(Math.max(z + delta, MIN_ZOOM), MAX_ZOOM));
  }, []);

  // Pan drag
  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    });
  };
  const onMouseUp = () => { isDragging.current = false; };

  // Touch pan
  const touchStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, panX: pan.x, panY: pan.y };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    setPan({
      x: touchStart.current.panX + (t.clientX - touchStart.current.x),
      y: touchStart.current.panY + (t.clientY - touchStart.current.y),
    });
  };

  // Determine seat class
  const seatClass = (seat: Seat) => {
    if (isSeatSelected(seat.id)) return 'seat seat-selected';
    if (seat.status === SeatStatus.SOLD) return 'seat seat-sold';
    if (seat.status === SeatStatus.LOCKED) return 'seat seat-locked';
    return 'seat seat-available';
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Zoom controls row */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-3">
          {sections.map((sec) => (
            <span
              key={sec.id}
              className="section-badge text-[11px]"
              style={{ background: sec.color }}
            >
              {sec.name} — ${Number(sec.price).toFixed(2)}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400 mr-1">Zoom</span>
          <button onClick={zoomOut} className="zoom-btn" style={{ borderRadius: '4px 0 0 4px', width: 28, height: 28, fontSize: '1rem' }}>−</button>
          <button onClick={zoomIn}  className="zoom-btn" style={{ borderRadius: '0 4px 4px 0', width: 28, height: 28, fontSize: '1rem' }}>+</button>
          <button
            onClick={resetView}
            className="ml-1 text-[10px] text-gray-500 underline hover:text-gray-700"
          >reset</button>
        </div>
      </div>

      {/* Map container */}
      <div
        ref={containerRef}
        className="seatmap-container"
        style={{ minHeight: 340, maxHeight: 500, height: '45vw' }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={() => {}}
      >
        {/* Inner scrollable/zoomable content */}
        <div
          className="seatmap-inner p-4"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {sections.map((section) => {
            const rows = Array.from(new Set(section.seats?.map((s) => s.rowLabel) ?? [])).sort();
            return (
              <div key={section.id} className="w-full">
                {/* Section label */}
                <div
                  className="text-center text-[10px] font-bold uppercase tracking-widest mb-1 py-0.5 rounded"
                  style={{ color: section.color, borderBottom: `2px solid ${section.color}` }}
                >
                  {section.name}
                </div>

                {/* Rows */}
                {rows.length > 0 ? (
                  <div className="flex flex-col items-center gap-0.5">
                    {rows.map((row) => {
                      const rowSeats = (section.seats ?? [])
                        .filter((s) => s.rowLabel === row)
                        .sort((a, b) => a.seatNumber - b.seatNumber);
                      return (
                        <div key={row} className="flex items-center gap-0.5">
                          <span className="w-5 text-[9px] text-gray-400 text-right font-mono shrink-0">{row}</span>
                          {rowSeats.map((seat) => (
                            <div key={seat.id} className="relative group">
                              <button
                                className={seatClass(seat)}
                                style={{ width: 18, height: 18, fontSize: '7px', borderRadius: '3px 3px 5px 5px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (seat.status === SeatStatus.AVAILABLE || isSeatSelected(seat.id)) {
                                    onToggleSeat(seat);
                                  }
                                }}
                                onMouseEnter={() => setHoveredSeat(seat.id)}
                                onMouseLeave={() => setHoveredSeat(null)}
                                title={`${section.name} — Fila ${seat.rowLabel}, Asiento ${seat.seatNumber}`}
                                disabled={seat.status === SeatStatus.SOLD}
                              >
                                {seat.seatNumber}
                              </button>
                              {hoveredSeat === seat.id && (
                                <div className="seat-tooltip">
                                  {section.name} {seat.rowLabel}{seat.seatNumber}
                                </div>
                              )}
                            </div>
                          ))}
                          <span className="w-5 text-[9px] text-gray-400 font-mono shrink-0">{row}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-2">Entrada general</p>
                )}
              </div>
            );
          })}

          {/* Stage */}
          <div className="stage w-full max-w-xs mx-auto mt-2" style={{ fontSize: '0.65rem', padding: '0.5rem' }}>
            ESCENARIO
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="seat seat-available w-4 h-4" style={{ width: 16, height: 16 }} /> Disponible</span>
        <span className="flex items-center gap-1"><span className="seat seat-selected w-4 h-4" style={{ width: 16, height: 16 }} /> Seleccionado</span>
        <span className="flex items-center gap-1"><span className="seat seat-sold w-4 h-4" style={{ width: 16, height: 16 }} /> Vendido</span>
        <span className="flex items-center gap-1"><span className="seat seat-locked w-4 h-4" style={{ width: 16, height: 16 }} /> Reservado</span>
      </div>
    </div>
  );
}
