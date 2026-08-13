import { useState, useEffect, useRef } from 'react';
import { Search, UserSquare2, Phone, Hash, Clock, X, Sparkles, Check } from 'lucide-react';
import api from '../../api/axios.js';

export default function PatientSearchInput({
  selectedPatient = null,
  onSelect = () => {},
  placeholder = 'Hover or type patient name, OP number, or phone...',
  label = 'Select Patient',
  required = false,
  className = '',
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRecentMode, setIsRecentMode] = useState(true);

  const containerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch recent patients dynamically from DB (newest registration first)
  const fetchRecentPatients = async () => {
    try {
      setLoading(true);
      setIsRecentMode(true);
      const res = await api.get('/patients?sortBy=registrationDate&sortOrder=desc&limit=10');
      setPatients(res.data?.patients || []);
    } catch (err) {
      console.error('Failed to load recent patients:', err);
    } finally {
      setLoading(false);
    }
  };

  // Search patients by query
  const searchPatients = async (searchTerm) => {
    try {
      setLoading(true);
      setIsRecentMode(false);
      const res = await api.get(`/patients?search=${encodeURIComponent(searchTerm)}&limit=10`);
      setPatients(res.data?.patients || []);
    } catch (err) {
      console.error('Patient search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger recent fetch when dropdown opens with an empty query
  const handleOpenDropdown = () => {
    setIsOpen(true);
    if (!query.trim()) {
      fetchRecentPatients();
    }
  };

  // Handle typing search
  useEffect(() => {
    if (!isOpen) return;

    if (!query.trim()) {
      fetchRecentPatients();
      return;
    }

    const timer = setTimeout(() => {
      searchPatients(query.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const handleSelectPatient = (patient) => {
    onSelect(patient);
    setQuery('');
    setIsOpen(false);
  };

  const handleClearSelection = () => {
    onSelect(null);
    setQuery('');
    setTimeout(() => {
      handleOpenDropdown();
    }, 100);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-ink-soft mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {selectedPatient ? (
        /* Selected Patient Summary Card */
        <div className="flex items-center justify-between rounded-xl border border-brand bg-brand-light/20 p-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light text-brand-dark font-bold text-sm">
              <UserSquare2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-ink">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </p>
                <span className="badge bg-brand/10 text-brand font-mono text-[11px] font-bold">
                  {selectedPatient.opNumber || 'N/A'}
                </span>
              </div>
              <p className="text-xs text-ink-soft flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1">
                  <Phone size={12} /> {selectedPatient.phone || 'No phone'}
                </span>
                {selectedPatient.age ? <span>• {selectedPatient.age}y</span> : null}
                {selectedPatient.sex ? <span>• {selectedPatient.sex}</span> : null}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClearSelection}
            className="btn-secondary py-1 px-2.5 text-xs font-semibold text-rose-700 border-rose-200 hover:bg-rose-50 flex items-center gap-1"
          >
            <X size={14} /> Change
          </button>
        </div>
      ) : (
        /* Input & Dropdown Container */
        <div
          className="relative"
          onMouseEnter={handleOpenDropdown}
        >
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
            <input
              type="text"
              className="input-field pl-9 pr-8"
              placeholder={placeholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={handleOpenDropdown}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Floating Dropdown Menu */}
          {isOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-border bg-surface shadow-lg max-h-72 overflow-y-auto divide-y divide-border/60 animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="px-3.5 py-2 bg-bg/80 border-b border-border flex items-center justify-between text-[11px] font-semibold text-ink-soft">
                <span className="flex items-center gap-1.5 text-ink font-bold">
                  {isRecentMode ? (
                    <>
                      <Sparkles size={13} className="text-brand" /> Newest / Recently Added Patients
                    </>
                  ) : (
                    <>
                      <Search size={13} className="text-brand" /> Search Results ({patients.length})
                    </>
                  )}
                </span>
                <span className="text-[10px] text-ink-soft font-mono">Sorted by newest</span>
              </div>

              {/* Patient List */}
              {loading ? (
                <div className="p-4 text-center text-xs text-ink-soft">Loading patients...</div>
              ) : patients.length === 0 ? (
                <div className="p-6 text-center space-y-1">
                  <p className="text-xs font-semibold text-ink">No patients found</p>
                  <p className="text-[11px] text-ink-soft">
                    {query ? `No patient matching "${query}"` : 'No registered patients available.'}
                  </p>
                </div>
              ) : (
                patients.map((p) => {
                  const pId = p._id || p.id;
                  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Unnamed Patient';
                  const regDateStr = p.registrationDate || p.createdAt
                    ? new Date(p.registrationDate || p.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })
                    : null;

                  return (
                    <div
                      key={pId}
                      onClick={() => handleSelectPatient(p)}
                      className="p-3 hover:bg-brand-light/30 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg text-brand group-hover:bg-brand-light group-hover:text-brand-dark transition-colors">
                          <UserSquare2 size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-ink text-xs truncate">{fullName}</span>
                            <span className="badge bg-brand/10 text-brand font-mono text-[10px] font-bold shrink-0">
                              {p.opNumber || 'No OP#'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-ink-soft mt-0.5">
                            <span className="flex items-center gap-1 font-mono">
                              <Phone size={11} /> {p.phone || 'No phone'}
                            </span>
                            {p.age ? <span>• {p.age}y</span> : null}
                            {p.sex ? <span>• {p.sex}</span> : null}
                          </div>
                        </div>
                      </div>

                      {regDateStr && (
                        <div className="text-[10px] text-ink-soft shrink-0 text-right font-medium">
                          Reg: <span className="text-ink font-semibold">{regDateStr}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Footer Hint */}
              <div className="px-3 py-1.5 bg-bg/50 text-[10px] text-ink-soft text-center border-t border-border/50">
                {isRecentMode
                  ? 'Showing recent patients • Type to search full clinic directory'
                  : 'Click any patient above to select'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
