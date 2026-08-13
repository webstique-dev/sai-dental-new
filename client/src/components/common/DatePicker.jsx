import React, { forwardRef, useState, useEffect } from 'react';
import ReactDatePicker from 'react-datepicker';
import { Calendar, X, AlertCircle } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';

/**
 * Safely parses Date object, YYYY-MM-DD string, MM/DD/YYYY string, or short date inputs.
 */
export const parseToDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;

    // Format 1: YYYY-MM-DD or YYYY/MM/DD
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(trimmed)) {
      const parts = trimmed.split(/[-/]/);
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day ? d : null;
    }

    // Format 2: MM/DD/YYYY or MM-DD-YYYY or M/D/YYYY
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(trimmed)) {
      const parts = trimmed.split(/[-/]/);
      const month = parseInt(parts[0], 10) - 1;
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day ? d : null;
    }

    // Format 3: MM/DD/YY
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2}$/.test(trimmed)) {
      const parts = trimmed.split(/[-/]/);
      const month = parseInt(parts[0], 10) - 1;
      const day = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      year += year < 50 ? 2000 : 1900;
      const d = new Date(year, month, day);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day ? d : null;
    }

    // Fallback standard parse
    const timestamp = Date.parse(trimmed);
    if (!isNaN(timestamp)) {
      const d = new Date(timestamp);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
};

/**
 * Formats a Date object to YYYY-MM-DD string format.
 */
export const formatToDateString = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Formats a Date object to user-friendly MM/DD/YYYY string format.
 */
export const formatToDisplayString = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
};

/**
 * Custom Input trigger for ReactDatePicker supporting BOTH manual text entry & interactive picker popover.
 */
const CustomInputTrigger = forwardRef(
  (
    {
      value,
      onClick,
      onChange,
      onBlur,
      onDateSelect,
      placeholder,
      disabled,
      error,
      icon: Icon = Calendar,
      onClear,
      isClearable,
      id,
      name,
      ariaDescribedBy,
      inputClassName = '',
      ...props
    },
    ref
  ) => {
    const [inputValue, setInputValue] = useState(value || '');

    // Synchronize local input text when value prop changes (e.g., date selected from calendar popover)
    useEffect(() => {
      setInputValue(value || '');
    }, [value]);

    const handleInputChange = (e) => {
      const typedText = e.target.value;
      setInputValue(typedText);

      // Call outer react-datepicker input change if present
      onChange?.(e);

      // If user types a valid date string, update state seamlessly
      const parsed = parseToDate(typedText);
      if (parsed) {
        const dateStr = formatToDateString(parsed);
        onDateSelect?.(parsed, dateStr, e);
      } else if (typedText.trim() === '') {
        onDateSelect?.(null, '', e);
      }
    };

    const handleInputBlur = (e) => {
      onBlur?.(e);

      // On blur, validate typed text: if valid date, format it; if invalid, revert to last valid selected date
      if (inputValue.trim() === '') {
        onDateSelect?.(null, '', e);
        return;
      }

      const parsed = parseToDate(inputValue);
      if (parsed) {
        const dateStr = formatToDateString(parsed);
        onDateSelect?.(parsed, dateStr, e);
      } else {
        // Revert to original prop value on invalid input to prevent broken state
        setInputValue(value || '');
      }
    };

    return (
      <div className="relative flex items-center w-full">
        {Icon && (
          <div
            onClick={disabled ? undefined : onClick}
            className="absolute left-3 text-slate-400 cursor-pointer flex items-center justify-center hover:text-teal-600 transition-colors"
          >
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          {...props}
          id={id}
          name={name}
          ref={ref}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onClick={disabled ? undefined : onClick}
          disabled={disabled}
          placeholder={placeholder || 'MM/DD/YYYY or Select date'}
          aria-invalid={!!error}
          aria-describedby={ariaDescribedBy}
          className={`
            w-full rounded-xl border bg-white text-sm font-medium text-slate-800 transition-all duration-150
            placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400
            ${Icon ? 'pl-9' : 'pl-3.5'}
            ${isClearable && inputValue && !disabled ? 'pr-9' : 'pr-3.5'}
            py-2
            ${
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 text-red-900'
                : 'border-slate-200 hover:border-slate-300 focus:border-teal-600 focus:ring-teal-600/20'
            }
            ${inputClassName}
          `}
        />

        {isClearable && inputValue && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setInputValue('');
              onClear?.();
            }}
            aria-label="Clear date"
            className="absolute right-3 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }
);

CustomInputTrigger.displayName = 'CustomInputTrigger';

/**
 * Reusable, clean, self-contained DatePicker component wrapping `react-datepicker`.
 * Features interactive selection for month, year, and specific days as well as manual text entry.
 */
export const DatePicker = forwardRef(
  (
    {
      selected,
      value,
      onChange,
      startDate,
      endDate,
      selectsRange = false,
      label,
      helperText,
      error,
      isRequired = false,
      isClearable = true,
      placeholder = selectsRange ? 'Select date range' : 'MM/DD/YYYY or Select date',
      dateFormat = selectsRange ? 'MMM d, yyyy' : 'MM/dd/yyyy',
      disabled = false,
      minDate,
      maxDate,
      showTimeSelect = false,
      showMonthDropdown = true,
      showYearDropdown = true,
      dropdownMode = 'select',
      scrollableYearDropdown = true,
      yearDropdownItemNumber = 100,
      icon = Calendar,
      id,
      name,
      wrapperClassName = '',
      inputClassName = '',
      popperPlacement = 'bottom-start',
      ...restProps
    },
    ref
  ) => {
    const inputId = id || (name ? `datepicker-${name}` : undefined);
    const helperId = inputId ? `${inputId}-helper` : undefined;
    const errorId = inputId ? `${inputId}-error` : undefined;

    // Handle flexible input values (Date object or YYYY-MM-DD/MM/DD/YYYY string)
    const effectiveSelected = parseToDate(selected !== undefined ? selected : value);
    const effectiveStartDate = parseToDate(startDate);
    const effectiveEndDate = parseToDate(endDate);

    const handleChange = (dateOrRange, event) => {
      if (!onChange) return;

      if (selectsRange) {
        // Date range mode
        const [start, end] = Array.isArray(dateOrRange) ? dateOrRange : [null, null];
        const startStr = formatToDateString(start);
        const endStr = formatToDateString(end);
        onChange([start, end], [startStr, endStr], event);
      } else {
        // Single date mode
        const dateStr = formatToDateString(dateOrRange);
        onChange(dateOrRange, dateStr, event);
      }
    };

    const handleClear = () => {
      if (selectsRange) {
        onChange([null, null], ['', '']);
      } else {
        onChange(null, '');
      }
    };

    return (
      <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
        {/* Label */}
        {label && (
          <label htmlFor={inputId} className="text-sm font-semibold text-slate-700 flex items-center gap-1">
            {label}
            {isRequired && <span className="text-red-500">*</span>}
          </label>
        )}

        {/* DatePicker Field */}
        <ReactDatePicker
          ref={ref}
          selected={effectiveSelected}
          onChange={handleChange}
          startDate={effectiveStartDate}
          endDate={effectiveEndDate}
          selectsRange={selectsRange}
          dateFormat={dateFormat}
          disabled={disabled}
          minDate={parseToDate(minDate)}
          maxDate={parseToDate(maxDate)}
          showTimeSelect={showTimeSelect}
          showMonthDropdown={showMonthDropdown}
          showYearDropdown={showYearDropdown}
          dropdownMode={dropdownMode}
          scrollableYearDropdown={scrollableYearDropdown}
          yearDropdownItemNumber={yearDropdownItemNumber}
          popperPlacement={popperPlacement}
          customInput={
            <CustomInputTrigger
              id={inputId}
              name={name}
              disabled={disabled}
              error={error}
              icon={icon}
              isClearable={isClearable}
              onClear={handleClear}
              onDateSelect={(date, dateStr, event) => handleChange(date, event)}
              placeholder={placeholder}
              inputClassName={inputClassName}
              ariaDescribedBy={error ? errorId : helperText ? helperId : undefined}
            />
          }
          calendarClassName="custom-react-datepicker"
          {...restProps}
        />

        {/* Error or Helper Text */}
        {error ? (
          <div id={errorId} className="flex items-center gap-1 text-xs text-red-600 font-medium mt-0.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-slate-500 mt-0.5">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';

export default DatePicker;
