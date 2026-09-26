import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Pill, Check, ChevronDown } from 'lucide-react';
import { capitalizeWords } from '../../utils/formatters';

export default function MedicineSuggestionInput({
  value = '',
  dosage = '',
  onChange = () => {},
  onSelect = () => {},
  suggestions = [],
  placeholder = 'e.g. Augmentin',
  required = false,
  disabled = false,
  className = '',
  inputClassName = '',
  id,
  name,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownCoords, setDropdownCoords] = useState(null);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const listRef = useRef(null);

  // Calculate and update position relative to viewport (Fixed positioning via Portal)
  const updateDropdownPosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    // Check if element is in viewport
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedHeight = 220;
    const showAbove = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    setDropdownCoords({
      top: showAbove ? undefined : rect.bottom + 4,
      bottom: showAbove ? window.innerHeight - rect.top + 4 : undefined,
      left: rect.left,
      width: Math.max(rect.width, 240),
    });
  }, []);

  // Update position on open, scroll, or resize
  useEffect(() => {
    if (!isOpen) return;

    updateDropdownPosition();

    const handleScrollOrResize = () => {
      updateDropdownPosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updateDropdownPosition]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      const inContainer = containerRef.current && containerRef.current.contains(e.target);
      const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);

      if (!inContainer && !inDropdown) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchWords = useMemo(() => {
    return (value || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  }, [value]);

  const filteredSuggestions = useMemo(() => {
    if (!Array.isArray(suggestions) || suggestions.length === 0) return [];
    if (searchWords.length === 0) {
      // If empty query, show top common suggestions
      return suggestions.slice(0, 15);
    }

    // Match if all search terms are found in name or dosage or combined display
    return suggestions
      .filter((item) => {
        const nameLower = (item.name || '').toLowerCase();
        const dosageLower = (item.dosage || '').toLowerCase();
        const combined = `${nameLower} ${dosageLower}`;

        return searchWords.every((word) => combined.includes(word));
      })
      .slice(0, 25);
  }, [suggestions, searchWords]);

  const handleInputChange = (e) => {
    const raw = e.target.value;
    const formatted = capitalizeWords(raw);
    onChange(formatted);
    setIsOpen(true);
    setHighlightedIndex(-1);
    updateDropdownPosition();
  };

  const handleSelect = (item) => {
    onSelect(item);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        updateDropdownPosition();
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev + 1 >= filteredSuggestions.length ? 0 : prev + 1;
        scrollToItem(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev - 1 < 0 ? filteredSuggestions.length - 1 : prev - 1;
        scrollToItem(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        e.preventDefault();
        handleSelect(filteredSuggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const scrollToItem = (index) => {
    if (!listRef.current) return;
    const listChildren = listRef.current.children;
    if (listChildren[index]) {
      listChildren[index].scrollIntoView({ block: 'nearest' });
    }
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          disabled={disabled}
          required={required}
          autoComplete="off"
          className={`input-field w-full text-xs font-medium py-1.5 px-2.5 ${inputClassName}`}
          placeholder={placeholder}
          value={value}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              updateDropdownPosition();
            }
          }}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        {value && (
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                setIsOpen((prev) => !prev);
                if (!isOpen) updateDropdownPosition();
              }
            }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-ink-soft/60 hover:text-ink p-1 transition-colors"
            title="Toggle suggestions"
          >
            <ChevronDown
              size={13}
              className={`transition-transform duration-150 ${isOpen ? 'rotate-180 text-brand' : ''}`}
            />
          </button>
        )}
      </div>

      {/* PORTAL FLOATING SUGGESTIONS POPUP (Rendered directly into body to avoid overflow clipping) */}
      {isOpen && !disabled && dropdownCoords && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownCoords.top !== undefined ? `${dropdownCoords.top}px` : undefined,
            bottom: dropdownCoords.bottom !== undefined ? `${dropdownCoords.bottom}px` : undefined,
            left: `${dropdownCoords.left}px`,
            width: `${dropdownCoords.width}px`,
            zIndex: 99999,
          }}
          className="max-h-56 overflow-y-auto scrollbar-none no-scrollbar bg-surface border border-border rounded-xl shadow-2xl py-1 text-xs divide-y divide-border/30 animate-in fade-in zoom-in-95 duration-100"
        >
          <div ref={listRef} className="divide-y divide-border/20">
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((item, idx) => {
                const isSelected =
                  item.name.toLowerCase() === (value || '').trim().toLowerCase() &&
                  (!item.dosage || !dosage || item.dosage.toLowerCase() === dosage.trim().toLowerCase());
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    type="button"
                    key={`${item.name}-${item.dosage}-${idx}`}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isHighlighted
                        ? 'bg-brand-light/70 text-brand'
                        : isSelected
                        ? 'bg-brand-light/40 text-brand font-semibold'
                        : 'hover:bg-bg text-ink'
                    }`}
                    onMouseDown={(e) => {
                      // Prevent input blur before click fires
                      e.preventDefault();
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelect(item)}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Pill
                        size={13}
                        className={isSelected || isHighlighted ? 'text-brand shrink-0' : 'text-ink-soft/60 shrink-0'}
                      />
                      <div className="min-w-0 flex-1 flex flex-wrap items-baseline gap-1.5">
                        <span className="font-bold text-ink truncate text-xs">
                          {item.name}
                        </span>
                        {item.dosage ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold font-mono rounded bg-brand/10 text-brand border border-brand/20">
                            {item.dosage}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {isSelected && <Check size={14} className="text-brand shrink-0 ml-1" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2.5 text-ink-soft text-[11px] text-center italic space-y-1">
                <p>No matching preset medicines</p>
                <p className="text-[10px] text-brand font-medium not-italic">
                  &ldquo;{value}&rdquo; will be saved and added to future suggestions
                </p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
