'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function fmt(d: Date) {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

export default function DatePicker({ value, onChange, placeholder = 'Pick a date' }: DatePickerProps) {
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ month: (value ?? today).getMonth(), year: (value ?? today).getFullYear() });
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Position the portal dropdown under the button
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropHeight = 320;
    const top = spaceBelow >= dropHeight
      ? rect.bottom + window.scrollY + 8
      : rect.top + window.scrollY - dropHeight - 8;
    setDropdownStyle({
      position: 'absolute',
      top,
      left: rect.left + window.scrollX,
      width: rect.width,
      zIndex: 99999,
    });
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        dropRef.current && !dropRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const firstDay = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const prevMonth = () => setView(v => v.month === 0 ? { month: 11, year: v.year - 1 } : { month: v.month - 1, year: v.year });
  const nextMonth = () => setView(v => v.month === 11 ? { month: 0, year: v.year + 1 } : { month: v.month + 1, year: v.year });
  const select = (day: number) => { onChange(new Date(view.year, view.month, day)); setOpen(false); };
  const isSelected = (day: number) => value && value.getDate() === day && value.getMonth() === view.month && value.getFullYear() === view.year;
  const isToday = (day: number) => today.getDate() === day && today.getMonth() === view.month && today.getFullYear() === view.year;

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const dropdown = (
    <div ref={dropRef} style={dropdownStyle} className="glass-card rounded-2xl shadow-2xl p-4 animate-[scaleIn_0.2s_ease-out] bg-[var(--card)]">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="ui-btn p-1.5 rounded-lg hover:bg-[var(--muted)] transition-all duration-300 hover:scale-110">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-bold text-sm gradient-text">{MONTHS[view.month]} {view.year}</span>
        <button onClick={nextMonth} className="ui-btn p-1.5 rounded-lg hover:bg-[var(--muted)] transition-all duration-300 hover:scale-110">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map(d => <div key={d} className="text-center text-xs font-semibold opacity-40 py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => (
          <div key={i} className="flex items-center justify-center">
            {day ? (
              <button
                onClick={() => select(day)}
                className={`ui-btn w-8 h-8 rounded-full text-sm font-medium transition-all duration-300 hover:scale-110
                  ${isSelected(day) ? 'bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white shadow-lg scale-110' :
                    isToday(day) ? 'border-2 border-[var(--primary)] text-[var(--primary)] font-bold' :
                    'hover:bg-[var(--muted)]'}`}
              >
                {day}
              </button>
            ) : <div className="w-8 h-8" />}
          </div>
        ))}
      </div>
      {value && (
        <button onClick={() => { onChange(null); setOpen(false); }}
          className="mt-3 w-full text-xs text-center opacity-50 hover:opacity-80 transition-all duration-300 py-1 hover:scale-105">
          Clear date
        </button>
      )}
    </div>
  );

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-300 text-sm font-medium
          ${open ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/30 shadow-lg' : 'border-[var(--border)]'}
          bg-[var(--muted)]/65 hover:border-[var(--primary)]/60`}
      >
        <span className={value ? '' : 'opacity-40'}>{value ? fmt(value) : placeholder}</span>
        <svg className={`w-4 h-4 opacity-50 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>
      {open && mounted && createPortal(dropdown, document.body)}
    </div>
  );
}
