'use client';

import { useState, useEffect, useRef } from 'react';
import { HiOutlineClock } from 'react-icons/hi';

interface ReservationTimerProps {
  /** Duration in seconds (default: 600 = 10 min) */
  durationSeconds?: number;
  /** Called when timer hits 0 */
  onExpire: () => void;
}

export default function ReservationTimer({
  durationSeconds = 600,
  onExpire,
}: ReservationTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (secondsLeft <= 0) {
      onExpireRef.current();
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const pct = (secondsLeft / durationSeconds) * 100;
  const isUrgent = secondsLeft < 120; // < 2 min → red

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className={`reservation-timer${isUrgent ? ' urgent' : ''}`}>
      <HiOutlineClock className="timer-icon shrink-0 w-5 h-5 text-primary-500" />
      <div className="flex flex-col gap-0.5 shrink-0">
        <span className="timer-text">Su reservación expirará en:</span>
        <span className={`timer-countdown${isUrgent ? ' !text-red-600' : ''}`}>
          {mm}m {ss}s
        </span>
      </div>
      <div className="timer-bar-wrap">
        <div
          className={`timer-bar${isUrgent ? ' urgent' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
