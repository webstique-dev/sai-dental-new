import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

/**
 * SplitTimeInput Component
 * Renders two editable text inputs for Hour (01-12) and Minute (00-59),
 * separated by a colon, plus an AM/PM toggle button pair.
 * Designed to visually match DatePicker.jsx with identical icon, border, radius, and focus rings.
 */
export default function SplitTimeInput({
  label = 'Time',
  value = '',
  onChange = () => {},
  className = '',
  inputClassName = '',
}) {
  const parseInitialTime = (val) => {
    if (val && typeof val === 'string' && val.trim()) {
      const clean = val.trim().toUpperCase();
      const isPM = clean.includes('PM');
      const isAM = clean.includes('AM');
      const digitsOnly = clean.replace(/[^0-9:]/g, '');
      const parts = digitsOnly.split(':');

      if (parts.length >= 1 && parts[0] !== '') {
        let rawH = parseInt(parts[0], 10);
        let m = parts.length >= 2 ? parseInt(parts[1], 10) : 0;
        if (isNaN(m) || m < 0 || m > 59) m = 0;

        let period = 'AM';
        let h12 = rawH;

        if (isPM) {
          period = 'PM';
          if (rawH > 12) h12 = rawH - 12;
        } else if (isAM) {
          period = 'AM';
          if (rawH === 0) h12 = 12;
        } else {
          // 24-hour format string (e.g., "14:30" or "09:15")
          if (rawH >= 12) {
            period = 'PM';
            h12 = rawH === 12 ? 12 : rawH - 12;
          } else {
            period = 'AM';
            h12 = rawH === 0 ? 12 : rawH;
          }
        }

        if (isNaN(h12) || h12 < 1) h12 = 12;
        if (h12 > 12) h12 = 12;

        return {
          hour: String(h12).padStart(2, '0'),
          minute: String(m).padStart(2, '0'),
          period,
        };
      }
    }

    // Default to exact current system time
    const now = new Date();
    let rawHours = now.getHours();
    let mins = now.getMinutes();
    const period = rawHours >= 12 ? 'PM' : 'AM';
    let h12 = rawHours % 12 === 0 ? 12 : rawHours % 12;

    return {
      hour: String(h12).padStart(2, '0'),
      minute: String(mins).padStart(2, '0'),
      period,
    };
  };

  const [timeState, setTimeState] = useState(() => parseInitialTime(value));

  useEffect(() => {
    if (value) {
      const parsed = parseInitialTime(value);
      setTimeState(parsed);
    }
  }, [value]);

  const emitChange = (hStr, mStr, pStr) => {
    let hNum = parseInt(hStr, 10);
    if (isNaN(hNum) || hNum < 1) hNum = 12;
    if (hNum > 12) hNum = 12;

    let mNum = parseInt(mStr, 10);
    if (isNaN(mNum) || mNum < 0) mNum = 0;
    if (mNum > 59) mNum = 59;

    let h24 = hNum;
    if (pStr === 'PM' && hNum < 12) h24 += 12;
    if (pStr === 'AM' && hNum === 12) h24 = 0;

    const time24 = `${String(h24).padStart(2, '0')}:${String(mNum).padStart(2, '0')}`;
    const time12 = `${String(hNum).padStart(2, '0')}:${String(mNum).padStart(2, '0')} ${pStr}`;

    onChange(time12, time24);
  };

  const handleHourChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    const updated = { ...timeState, hour: val };
    setTimeState(updated);
  };

  const handleHourBlur = () => {
    let num = parseInt(timeState.hour, 10);
    if (isNaN(num) || num < 1) num = 12;
    if (num > 12) num = 12;
    const padded = String(num).padStart(2, '0');
    const updated = { ...timeState, hour: padded };
    setTimeState(updated);
    emitChange(padded, updated.minute, updated.period);
  };

  const handleMinuteChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    const updated = { ...timeState, minute: val };
    setTimeState(updated);
  };

  const handleMinuteBlur = () => {
    let num = parseInt(timeState.minute, 10);
    if (isNaN(num) || num < 0) num = 0;
    if (num > 59) num = 59;
    const padded = String(num).padStart(2, '0');
    const updated = { ...timeState, minute: padded };
    setTimeState(updated);
    emitChange(updated.hour, padded, updated.period);
  };

  const handlePeriodToggle = (p) => {
    const updated = { ...timeState, period: p };
    setTimeState(updated);
    emitChange(updated.hour, updated.minute, p);
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
          {label}
        </label>
      )}

      <div
        className={`relative flex items-center justify-between w-full rounded-xl border bg-white text-sm font-medium text-slate-800 transition-all duration-150 border-slate-200 hover:border-slate-300 focus-within:border-[#1E64EA] focus-within:ring-2 focus-within:ring-[#1E64EA]/20 pl-9 pr-2 py-1.5 ${inputClassName}`}
      >
        {/* Left Clock Icon (identical placement to DatePicker's Calendar icon) */}
        <div className="absolute left-3 text-slate-400 flex items-center justify-center pointer-events-none">
          <Clock className="w-4 h-4 text-[#1E64EA]" />
        </div>

        {/* Hour & Minute Inputs */}
        <div className="flex items-center gap-1">
          <input
            type="text"
            autoComplete="off"
            inputMode="numeric"
            maxLength={2}
            value={timeState.hour}
            onChange={handleHourChange}
            onBlur={handleHourBlur}
            className="w-8 text-center font-mono font-bold text-xs text-[#0B1A2E] bg-slate-50 hover:bg-slate-100 focus:bg-blue-50 focus:text-[#1E64EA] rounded-md outline-none py-1 border border-slate-200/80 focus:border-[#1E64EA] transition-all"
            placeholder="09"
            aria-label="Hour"
          />
          <span className="font-mono font-extrabold text-slate-400 text-xs select-none px-0.5">:</span>
          <input
            type="text"
            autoComplete="off"
            inputMode="numeric"
            maxLength={2}
            value={timeState.minute}
            onChange={handleMinuteChange}
            onBlur={handleMinuteBlur}
            className="w-8 text-center font-mono font-bold text-xs text-[#0B1A2E] bg-slate-50 hover:bg-slate-100 focus:bg-blue-50 focus:text-[#1E64EA] rounded-md outline-none py-1 border border-slate-200/80 focus:border-[#1E64EA] transition-all"
            placeholder="00"
            aria-label="Minute"
          />
        </div>

        {/* AM / PM Toggle Pair */}
        <div className="flex items-center bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/70 ml-auto gap-0.5">
          <button
            type="button"
            onClick={() => handlePeriodToggle('AM')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider transition-all ${
              timeState.period === 'AM'
                ? 'bg-gradient-to-r from-[#1E64EA] to-[#2090F0] text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => handlePeriodToggle('PM')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider transition-all ${
              timeState.period === 'PM'
                ? 'bg-gradient-to-r from-[#1E64EA] to-[#2090F0] text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
            }`}
          >
            PM
          </button>
        </div>
      </div>
    </div>
  );
}
