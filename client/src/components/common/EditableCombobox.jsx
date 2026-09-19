import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function EditableCombobox({
  value = '',
  onChange,
  options = [],
  placeholder = 'Select or type...',
  required = false,
  className = '',
  inputClassName = '',
  disabled = false,
  id,
  name,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value || '');
  const containerRef = useRef(null);

  useEffect(() => {
    setSearchQuery(value || '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes((searchQuery || '').toLowerCase().trim())
  );

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (onChange) onChange(val);
    setIsOpen(true);
  };

  const handleSelectOption = (opt) => {
    setSearchQuery(opt);
    if (onChange) onChange(opt);
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          id={id}
          name={name}
          disabled={disabled}
          required={required}
          autoComplete="off"
          className={`input-field w-full h-[38px] pr-8 text-xs font-medium py-1.5 ${inputClassName}`}
          placeholder={placeholder}
          value={searchQuery}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onChange={handleInputChange}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (!disabled) setIsOpen((prev) => !prev);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink p-1 transition-colors"
          aria-label="Toggle dropdown"
        >
          <ChevronDown
            size={14}
            className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-surface border border-border rounded-xl shadow-xl py-1 text-xs">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => {
              const isSelected = opt.toLowerCase() === (searchQuery || '').trim().toLowerCase();
              return (
                <button
                  type="button"
                  key={opt}
                  className={`w-full text-left px-3 py-2 hover:bg-brand-light/40 font-semibold flex items-center justify-between transition-colors ${
                    isSelected ? 'bg-brand-light/60 text-brand font-bold' : 'text-ink'
                  }`}
                  onClick={() => handleSelectOption(opt)}
                >
                  <span className="truncate">{opt}</span>
                  {isSelected && <Check size={14} className="text-brand shrink-0 ml-2" />}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-ink-soft italic text-center">
              No matching preset options (custom text will be saved)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
