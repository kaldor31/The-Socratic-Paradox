import { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarPickerProps {
  value: string;
  onChange: (date: string) => void;
  maxDate?: string;
  locale?: string;
}

function localDate(d = new Date()) {
  return d.toLocaleDateString('en-CA');
}

export function CalendarPicker({ value, onChange, maxDate, locale }: CalendarPickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    setViewDate(value);
  }, [value]);

  const selected = new Date(`${value}T00:00:00`);
  const view = new Date(`${viewDate}T00:00:00`);
  const year = view.getFullYear();
  const month = view.getMonth();

  const monthName = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(view);
  const selectedLabel = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(selected);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;

  const daysOfWeek = Array.from({ length: 7 }, (_, i) => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
    // 4 Jan 2021 is Monday
    return fmt.format(new Date(2021, 0, 4 + i));
  });

  const shiftMonth = (delta: number) => {
    const d = new Date(view);
    d.setMonth(d.getMonth() + delta);
    setViewDate(localDate(d));
  };

  const handleDayClick = (day: number) => {
    const d = new Date(year, month, day);
    const dateStr = localDate(d);
    if (maxDate && dateStr > maxDate) return;
    onChange(dateStr);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="btn-secondary gap-3 pr-4 font-serif"
      >
        <CalendarIcon size={18} className="text-accent-gold" />
        <span className="hidden sm:inline">{selectedLabel}</span>
        <span className="sm:hidden">{value}</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-marble-700 bg-marble-800 p-4 shadow-panel">
          <div className="mb-3 flex items-center justify-between">
            <button onClick={() => shiftMonth(-1)} className="btn-secondary p-2">
              <ChevronLeft size={18} />
            </button>
            <span className="font-serif font-semibold text-ink">{monthName}</span>
            <button onClick={() => shiftMonth(1)} className="btn-secondary p-2">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {daysOfWeek.map(d => (
              <div key={d} className="py-1 text-xs font-medium text-ink-dim">
                {d}
              </div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const dateStr = localDate(new Date(year, month, day));
              const isSelected = dateStr === value;
              const isDisabled = maxDate ? dateStr > maxDate : false;
              return (
                <button
                  key={day}
                  disabled={isDisabled}
                  onClick={() => handleDayClick(day)}
                  className={`rounded-lg py-1.5 text-sm transition-colors ${
                    isSelected
                      ? 'bg-accent-gold font-semibold text-marble-midnight'
                      : isDisabled
                      ? 'cursor-not-allowed text-ink-dim'
                      : 'text-ink hover:bg-marble-700'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
