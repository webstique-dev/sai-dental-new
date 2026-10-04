import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';

/**
 * Format Date object to local YYYY-MM-DDTHH:mm
 */
export function toLocalISOString(date = new Date()) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Parse YYYY-MM-DDTHH:mm or ISO or Date into date parts
 */
export function parseDateTime(val) {
  let d = val instanceof Date ? val : null;
  if (!d && typeof val === 'string' && val.trim()) {
    // Try YYYY-MM-DDTHH:mm
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
      const [datePart, timePart] = val.split('T');
      const [y, m, day] = datePart.split('-').map((n) => parseInt(n, 10));
      const [h, min] = timePart.split(':').map((n) => parseInt(n, 10));
      d = new Date(y, m - 1, day, h, min, 0, 0);
    } else {
      const parsed = Date.parse(val);
      if (!isNaN(parsed)) d = new Date(parsed);
    }
  }

  if (!d || isNaN(d.getTime())) {
    d = new Date();
  }

  const rawHours = d.getHours();
  const rawMinutes = d.getMinutes();
  const period = rawHours >= 12 ? 'PM' : 'AM';
  let hour12 = rawHours % 12;
  if (hour12 === 0) hour12 = 12;

  return {
    year: d.getFullYear(),
    month: d.getMonth(), // 0-indexed
    day: d.getDate(),
    rawHours,
    hour12,
    minute: rawMinutes,
    period,
    dateObj: d,
  };
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * WebDateTimePicker - Pure Web-Based Date & Time Picker UI
 * Replaces native browser datetime-local popups with a beautiful, responsive,
 * styled React dropdown interface matching the clinic design system.
 */
export default function DateTimePicker({
  value = '',
  onChange = () => {},
  max = toLocalISOString(),
  min,
  disabled = false,
  className = '',
  buttonClassName = '',
  accent = 'amber', // 'amber' | 'blue' | 'indigo' | 'emerald'
  placeholder = 'Select date & time',
  align = 'left', // 'left' | 'right'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse current value
  const parsedValue = useMemo(() => parseDateTime(value), [value]);

  // Calendar View month & year (can browse other months without changing selected date yet)
  const [viewYear, setViewYear] = useState(() => parsedValue.year);
  const [viewMonth, setViewMonth] = useState(() => parsedValue.month);

  // Sync viewing month/year whenever value or isOpen changes
  useEffect(() => {
    if (isOpen) {
      setViewYear(parsedValue.year);
      setViewMonth(parsedValue.month);
    }
  }, [isOpen, parsedValue.year, parsedValue.month]);

  // Max and Min date boundaries
  const maxDate = useMemo(() => (max ? parseDateTime(max).dateObj : null), [max]);
  const minDate = useMemo(() => (min ? parseDateTime(min).dateObj : null), [min]);

  // Close on outside click or escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Build current date and emit update
  const emitDateTime = (y, m, d, h12, minVal, p) => {
    let h24 = h12;
    if (p === 'PM' && h12 < 12) h24 = h12 + 12;
    if (p === 'AM' && h12 === 12) h24 = 0;

    let targetDate = new Date(y, m, d, h24, minVal, 0, 0);

    // Clamp against maxDate
    if (maxDate && targetDate.getTime() > maxDate.getTime()) {
      targetDate = new Date(maxDate.getTime());
    }
    // Clamp against minDate
    if (minDate && targetDate.getTime() < minDate.getTime()) {
      targetDate = new Date(minDate.getTime());
    }

    const isoStr = toLocalISOString(targetDate);
    onChange(isoStr);
  };

  // Month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    // Check if next month is beyond maxDate year/month
    if (maxDate) {
      const nextDate = new Date(viewYear, viewMonth + 1, 1);
      const maxMonthStart = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
      if (nextDate.getTime() > maxMonthStart.getTime()) return;
    }

    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Check if Next Month navigation should be disabled
  const isNextMonthDisabled = useMemo(() => {
    if (!maxDate) return false;
    const nextMonthStart = new Date(viewYear, viewMonth + 1, 1);
    const maxMonthStart = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    return nextMonthStart.getTime() > maxMonthStart.getTime();
  }, [maxDate, viewYear, viewMonth]);

  // Generate days grid
  const calendarDays = useMemo(() => {
    const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    const days = [];

    // Leading days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        month: viewMonth - 1,
        year: viewMonth === 0 ? viewYear - 1 : viewYear,
        isCurrentMonth: false,
      });
    }

    // Days in current month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      days.push({
        day: d,
        month: viewMonth,
        year: viewYear,
        isCurrentMonth: true,
      });
    }

    // Trailing days to fill 35 or 42 grid slots
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        month: viewMonth + 1,
        year: viewMonth === 11 ? viewYear + 1 : viewYear,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  // Day selection
  const handleSelectDay = (cell) => {
    const candidate = new Date(
      cell.year,
      cell.month,
      cell.day,
      parsedValue.rawHours,
      parsedValue.minute
    );

    // Don't allow future dates if maxDate is set
    if (maxDate) {
      const dayStart = new Date(cell.year, cell.month, cell.day, 0, 0, 0);
      const maxDayStart = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate(), 0, 0, 0);
      if (dayStart.getTime() > maxDayStart.getTime()) return;
    }

    if (minDate) {
      const dayEnd = new Date(cell.year, cell.month, cell.day, 23, 59, 59);
      const minDayEnd = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate(), 23, 59, 59);
      if (dayEnd.getTime() < minDayEnd.getTime()) return;
    }

    if (!cell.isCurrentMonth) {
      setViewMonth(cell.month < 0 ? 11 : cell.month > 11 ? 0 : cell.month);
      setViewYear(cell.year);
    }

    emitDateTime(
      cell.year,
      cell.month < 0 ? 11 : cell.month > 11 ? 0 : cell.month,
      cell.day,
      parsedValue.hour12,
      parsedValue.minute,
      parsedValue.period
    );
  };

  // Time part modifications
  const handleHourChange = (newHour12) => {
    let h = parseInt(newHour12, 10);
    if (isNaN(h) || h < 1) h = 1;
    if (h > 12) h = 12;
    emitDateTime(
      parsedValue.year,
      parsedValue.month,
      parsedValue.day,
      h,
      parsedValue.minute,
      parsedValue.period
    );
  };

  const handleMinuteChange = (newMin) => {
    let m = parseInt(newMin, 10);
    if (isNaN(m) || m < 0) m = 0;
    if (m > 59) m = 59;
    emitDateTime(
      parsedValue.year,
      parsedValue.month,
      parsedValue.day,
      parsedValue.hour12,
      m,
      parsedValue.period
    );
  };

  const handlePeriodChange = (newPeriod) => {
    emitDateTime(
      parsedValue.year,
      parsedValue.month,
      parsedValue.day,
      parsedValue.hour12,
      parsedValue.minute,
      newPeriod
    );
  };

  // Quick action shortcuts
  const handleSetNow = () => {
    const now = new Date();
    onChange(toLocalISOString(now));
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  };

  const handleSetPresetTime = (h12, minVal, p) => {
    emitDateTime(
      parsedValue.year,
      parsedValue.month,
      parsedValue.day,
      h12,
      minVal,
      p
    );
  };

  // Theme color styles
  const accentClasses = {
    amber: {
      btnActive: 'bg-amber-50 border-amber-300 text-amber-950 ring-2 ring-amber-300/60 shadow-xs',
      btnIdle: 'bg-white border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50/50',
      icon: 'text-amber-600',
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      daySelected: 'bg-amber-500 text-white font-bold shadow-xs hover:bg-amber-600',
      dayHover: 'hover:bg-amber-100 hover:text-amber-900',
      dayToday: 'ring-1.5 ring-amber-500 font-bold text-amber-900',
      toggleActive: 'bg-amber-500 text-white shadow-xs font-bold',
      headerBg: 'bg-amber-50/70 border-amber-200/80',
      primaryBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs',
    },
    blue: {
      btnActive: 'bg-blue-50 border-blue-300 text-blue-950 ring-2 ring-blue-300/60 shadow-xs',
      btnIdle: 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/50',
      icon: 'text-[#1E64EA]',
      badge: 'bg-blue-100 text-blue-800 border-blue-300',
      daySelected: 'bg-[#1E64EA] text-white font-bold shadow-xs hover:bg-blue-600',
      dayHover: 'hover:bg-blue-100 hover:text-blue-900',
      dayToday: 'ring-1.5 ring-[#1E64EA] font-bold text-blue-900',
      toggleActive: 'bg-[#1E64EA] text-white shadow-xs font-bold',
      headerBg: 'bg-blue-50/70 border-blue-200/80',
      primaryBtn: 'bg-[#1E64EA] hover:bg-blue-700 text-white shadow-xs',
    },
  }[accent] || {
    btnActive: 'bg-amber-50 border-amber-300 text-amber-950 ring-2 ring-amber-300/60 shadow-xs',
    btnIdle: 'bg-white border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50/50',
    icon: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    daySelected: 'bg-amber-500 text-white font-bold shadow-xs hover:bg-amber-600',
    dayHover: 'hover:bg-amber-100 hover:text-amber-900',
    dayToday: 'ring-1.5 ring-amber-500 font-bold text-amber-900',
    toggleActive: 'bg-amber-500 text-white shadow-xs font-bold',
    headerBg: 'bg-amber-50/70 border-amber-200/80',
    primaryBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs',
  };

  // Formatted trigger label
  const formattedTrigger = useMemo(() => {
    const pad = (n) => String(n).padStart(2, '0');
    const d = parsedValue.day;
    const m = MONTH_NAMES_SHORT[parsedValue.month] || '';
    const y = parsedValue.year;
    const h = pad(parsedValue.hour12);
    const minStr = pad(parsedValue.minute);
    const p = parsedValue.period;

    return `${pad(d)}-${pad(parsedValue.month + 1)}-${y}  ${h}:${minStr} ${p}`;
  }, [parsedValue]);

  // Today tracker for highlighting current day
  const today = useMemo(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
    };
  }, []);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer select-none ${
          isOpen ? accentClasses.btnActive : accentClasses.btnIdle
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${buttonClassName}`}
        title="Open web calendar & time picker"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <CalendarIcon size={13} className={accentClasses.icon} />
        <span className="font-mono text-[11px] font-bold tracking-tight text-slate-800">
          {formattedTrigger}
        </span>
        <ChevronDown
          size={12}
          className={`text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-slate-700' : ''
          }`}
        />
      </button>

      {/* Floating Web Date & Time Popover */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } top-full mt-1.5 z-50 w-[300px] sm:w-[320px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-3.5 text-slate-800 animate-in fade-in-50 zoom-in-95 duration-150`}
          role="dialog"
          aria-label="Date and Time Picker"
        >
          {/* Header: Month & Year Navigator */}
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                title="Previous month"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1 text-xs font-bold text-slate-900">
                <span>{MONTH_NAMES[viewMonth]}</span>
                <span className="text-slate-500 font-medium">{viewYear}</span>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                disabled={isNextMonthDisabled}
                className={`p-1 rounded-lg transition-colors ${
                  isNextMonthDisabled
                    ? 'opacity-30 cursor-not-allowed text-slate-300'
                    : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
                title="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* "Now" Quick Action */}
            <button
              type="button"
              onClick={handleSetNow}
              className="flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200/80 transition-colors"
              title="Set to current date and time"
            >
              <RotateCcw size={10} />
              <span>Now</span>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEK_DAYS.map((wd) => (
              <span
                key={wd}
                className="text-[10px] font-bold text-slate-400 select-none py-0.5"
              >
                {wd}
              </span>
            ))}
          </div>

          {/* Calendar Days Matrix */}
          <div className="grid grid-cols-7 gap-1 text-center mb-3">
            {calendarDays.map((cell, idx) => {
              const isSelected =
                cell.year === parsedValue.year &&
                cell.month === parsedValue.month &&
                cell.day === parsedValue.day;

              const isCurrentDay =
                cell.year === today.year &&
                cell.month === today.month &&
                cell.day === today.day;

              // Check if future date
              let isFuture = false;
              if (maxDate) {
                const cellDay = new Date(cell.year, cell.month, cell.day, 0, 0, 0);
                const maxDay = new Date(
                  maxDate.getFullYear(),
                  maxDate.getMonth(),
                  maxDate.getDate(),
                  0,
                  0,
                  0
                );
                if (cellDay.getTime() > maxDay.getTime()) {
                  isFuture = true;
                }
              }

              return (
                <button
                  key={`${cell.year}-${cell.month}-${cell.day}-${idx}`}
                  type="button"
                  disabled={isFuture}
                  onClick={() => handleSelectDay(cell)}
                  className={`h-7 w-7 sm:h-8 sm:w-8 mx-auto flex items-center justify-center rounded-lg text-xs transition-all duration-100 select-none ${
                    isSelected
                      ? accentClasses.daySelected
                      : isFuture
                      ? 'text-slate-300 cursor-not-allowed opacity-40'
                      : !cell.isCurrentMonth
                      ? 'text-slate-400 hover:bg-slate-100/70'
                      : `text-slate-700 font-medium ${accentClasses.dayHover}`
                  } ${
                    isCurrentDay && !isSelected
                      ? accentClasses.dayToday
                      : ''
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Time Picker Section */}
          <div className="pt-2.5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Clock size={13} className={accentClasses.icon} />
                <span>Time</span>
              </div>
              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                {String(parsedValue.hour12).padStart(2, '0')}:
                {String(parsedValue.minute).padStart(2, '0')} {parsedValue.period}
              </span>
            </div>

            {/* Time Controls: Hour + Minute Steppers / Dropdowns & AM/PM Toggle */}
            <div className="flex items-center justify-between gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
              {/* Hour Dropdown */}
              <div className="flex items-center gap-1">
                <label className="text-[10px] font-bold text-slate-400">Hr</label>
                <select
                  value={parsedValue.hour12}
                  onChange={(e) => handleHourChange(e.target.value)}
                  className="bg-white border border-slate-200 text-xs font-mono font-bold text-slate-800 rounded-lg px-1.5 py-1 focus:ring-2 focus:ring-amber-400 outline-none cursor-pointer"
                  aria-label="Hour"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>

              <span className="font-mono font-bold text-slate-400">:</span>

              {/* Minute Dropdown */}
              <div className="flex items-center gap-1">
                <label className="text-[10px] font-bold text-slate-400">Min</label>
                <select
                  value={parsedValue.minute}
                  onChange={(e) => handleMinuteChange(e.target.value)}
                  className="bg-white border border-slate-200 text-xs font-mono font-bold text-slate-800 rounded-lg px-1.5 py-1 focus:ring-2 focus:ring-amber-400 outline-none cursor-pointer"
                  aria-label="Minute"
                >
                  {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>

              {/* AM / PM Toggle */}
              <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handlePeriodChange('AM')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider transition-all leading-none ${
                    parsedValue.period === 'AM'
                      ? accentClasses.toggleActive
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodChange('PM')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider transition-all leading-none ${
                    parsedValue.period === 'PM'
                      ? accentClasses.toggleActive
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  PM
                </button>
              </div>
            </div>

            {/* Quick Time Presets */}
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 mr-0.5">Presets:</span>
              <button
                type="button"
                onClick={() => handleSetPresetTime(9, 0, 'AM')}
                className="text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded transition-colors"
              >
                09:00 AM
              </button>
              <button
                type="button"
                onClick={() => handleSetPresetTime(11, 30, 'AM')}
                className="text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded transition-colors"
              >
                11:30 AM
              </button>
              <button
                type="button"
                onClick={() => handleSetPresetTime(2, 0, 'PM')}
                className="text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded transition-colors"
              >
                02:00 PM
              </button>
              <button
                type="button"
                onClick={() => handleSetPresetTime(5, 0, 'PM')}
                className="text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded transition-colors"
              >
                05:00 PM
              </button>
            </div>
          </div>

          {/* Popover Footer: Done / Close button */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[170px]">
              {formattedTrigger}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition-all ${accentClasses.primaryBtn}`}
            >
              <Check size={12} />
              <span>Done</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
