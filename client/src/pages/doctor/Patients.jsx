import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UserSquare2, Search, Filter, Calendar, Eye, ArrowUpDown, ChevronLeft, ChevronRight,
  RefreshCw, X, Stethoscope, Clock, Shield
} from 'lucide-react';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';
import DatePicker from '../../components/common/DatePicker.jsx';

export default function DoctorPatients() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Filters & Query State
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [lastVisitFrom, setLastVisitFrom] = useState('');
  const [lastVisitTo, setLastVisitTo] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [sort, setSort] = useState('lastVisit');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Data State
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [doctorsList, setDoctorsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch doctors list if caller is admin
  useEffect(() => {
    if (isAdmin) {
      api.get('/users?role=doctor')
        .then((res) => setDoctorsList(res.data?.users || []))
        .catch((err) => console.error('Failed to load doctors list:', err));
    }
  }, [isAdmin]);

  // Fetch patients list from extended backend endpoint
  const fetchPatients = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);
      params.append('sort', sort);
      params.append('sortOrder', sortOrder);

      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      if (lastVisitFrom) params.append('lastVisitFrom', lastVisitFrom);
      if (lastVisitTo) params.append('lastVisitTo', lastVisitTo);
      if (isAdmin && doctorId) params.append('doctorId', doctorId);

      const res = await api.get(`/patients?${params.toString()}`);
      const data = res.data || {};
      setPatients(data.patients || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to load doctor patients list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [debouncedSearch, lastVisitFrom, lastVisitTo, doctorId, sort, sortOrder, page]);

  const handleSortToggle = (field) => {
    if (sort === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setLastVisitFrom('');
    setLastVisitTo('');
    setDoctorId('');
    setSort('lastVisit');
    setSortOrder('desc');
    setPage(1);
  };

  const hasActiveFilters = debouncedSearch || lastVisitFrom || lastVisitTo || doctorId;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            <UserSquare2 size={26} className="text-brand" /> Patient Directory & Records
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Search patient records, inspect visit histories, and access unified Electronic Medical Records (EMR).
          </p>
        </div>

        <button onClick={fetchPatients} className="btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh List
        </button>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="card p-4 space-y-3 bg-surface">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              className="input-field pl-9 py-2 text-xs"
              placeholder="Search by Patient Name, Phone Number, or OP Number..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-medium self-end sm:self-auto"
            >
              <X size={13} /> Reset Filters
            </button>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <DatePicker
              label="Last Visit From"
              value={lastVisitFrom}
              onChange={(date, dateStr) => {
                setLastVisitFrom(dateStr);
                setPage(1);
              }}
              inputClassName="py-1 text-xs"
            />
          </div>

          <div>
            <DatePicker
              label="Last Visit To"
              value={lastVisitTo}
              onChange={(date, dateStr) => {
                setLastVisitTo(dateStr);
                setPage(1);
              }}
              inputClassName="py-1 text-xs"
            />
          </div>

          {isAdmin && (
            <div>
              <label className="block font-semibold text-ink-soft mb-1">Doctor Filter</label>
              <select
                className="input-field py-1.5 text-xs font-semibold"
                value={doctorId}
                onChange={(e) => {
                  setDoctorId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Doctors</option>
                {doctorsList.map((doc) => (
                  <option key={doc._id || doc.id} value={doc._id || doc.id}>
                    Dr. {doc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-semibold text-ink-soft mb-1">Sort By</label>
            <select
              className="input-field py-1.5 text-xs font-semibold"
              value={sort}
              onChange={(e) => handleSortToggle(e.target.value)}
            >
              <option value="lastVisit">Last Visit Date</option>
              <option value="name">Patient Name</option>
              <option value="registrationDate">Registration Date</option>
            </select>
          </div>
        </div>
      </div>

      {/* PATIENTS TABLE & RESPONSIVE CARDS */}
      <div className="card overflow-hidden">
        {/* DESKTOP / TABLET TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="border-b border-border bg-bg/60 font-semibold text-ink-soft text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">
                  <button
                    onClick={() => handleSortToggle('name')}
                    className="flex items-center gap-1 hover:text-ink"
                  >
                    Patient Name <ArrowUpDown size={13} />
                  </button>
                </th>
                <th className="px-5 py-3.5">OP Number</th>
                <th className="px-5 py-3.5">Age / Sex</th>
                <th className="px-5 py-3.5">Phone</th>
                <th className="px-5 py-3.5">
                  <button
                    onClick={() => handleSortToggle('lastVisit')}
                    className="flex items-center gap-1 hover:text-ink"
                  >
                    Last Visit <ArrowUpDown size={13} />
                  </button>
                </th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-5 py-4"><div className="h-4 w-32 bg-bg rounded" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-20 bg-bg rounded" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-16 bg-bg rounded" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 bg-bg rounded" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-28 bg-bg rounded" /></td>
                    <td className="px-5 py-4 text-right"><div className="h-6 w-16 bg-bg rounded ml-auto" /></td>
                  </tr>
                ))
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-ink-soft space-y-2">
                    <UserSquare2 size={32} className="mx-auto text-ink-soft/40" />
                    <p className="font-semibold text-ink text-sm">No patients found</p>
                    <p className="text-xs">Try adjusting your search criteria or resetting filters.</p>
                  </td>
                </tr>
              ) : (
                patients.map((p) => {
                  const pId = p._id || p.id;
                  const pName = `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unnamed Patient';
                  const lastVisitStr = p.lastVisitDate
                    ? new Date(p.lastVisitDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : null;

                  return (
                    <tr key={pId} className="hover:bg-bg/60 transition-colors group">
                      {/* Name */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-bold text-ink text-sm group-hover:text-brand transition-colors">
                          {pName}
                        </div>
                      </td>

                      {/* OP Number */}
                      <td className="px-5 py-4 whitespace-nowrap font-mono font-bold text-brand">
                        {p.opNumber || '—'}
                      </td>

                      {/* Age / Sex */}
                      <td className="px-5 py-4 whitespace-nowrap text-ink-soft font-medium">
                        {p.age !== undefined && p.age !== null ? `${p.age} yrs` : '—'} / {p.sex || '—'}
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-4 whitespace-nowrap font-mono text-ink-soft">
                        {p.phone || '—'}
                      </td>

                      {/* Last Visit */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {lastVisitStr ? (
                          <div>
                            <span className="font-bold text-ink">{lastVisitStr}</span>
                            {p.lastVisitDoctor?.name && (
                              <span className="text-[11px] block text-ink-soft">
                                Dr. {p.lastVisitDoctor.name}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-ink-soft/40 italic">Never Seen</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <Link
                          to={`/doctor/patients/${pId}`}
                          className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 font-semibold"
                        >
                          <Eye size={14} /> View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE STACKED CARD VIEW */}
        <div className="block md:hidden divide-y divide-border">
          {loading ? (
            <div className="p-6 text-center text-xs text-ink-soft animate-pulse">Loading patients directory...</div>
          ) : patients.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-soft space-y-2">
              <UserSquare2 size={28} className="mx-auto text-ink-soft/40" />
              <p className="font-semibold text-ink">No patients found</p>
            </div>
          ) : (
            patients.map((p) => {
              const pId = p._id || p.id;
              const pName = `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unnamed Patient';
              const lastVisitStr = p.lastVisitDate
                ? new Date(p.lastVisitDate).toLocaleDateString()
                : 'Never Seen';

              return (
                <div key={pId} className="p-4 space-y-3 bg-surface">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-ink text-sm">{pName}</h4>
                      <span className="text-xs font-mono font-bold text-brand">OP: {p.opNumber || 'N/A'}</span>
                    </div>
                    <Link
                      to={`/doctor/patients/${pId}`}
                      className="btn-secondary text-xs py-1 px-3 inline-flex items-center gap-1 font-semibold"
                    >
                      <Eye size={13} /> View
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-bg p-2.5 rounded-lg border border-border">
                    <div>
                      <span className="text-ink-soft text-[10px] block">Age / Sex:</span>
                      <span className="font-semibold text-ink">{p.age ? `${p.age}y` : '—'} {p.sex ? `/ ${p.sex}` : ''}</span>
                    </div>
                    <div>
                      <span className="text-ink-soft text-[10px] block">Phone:</span>
                      <span className="font-mono font-semibold text-ink">{p.phone || '—'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-ink-soft text-[10px] block">Last Visit:</span>
                      <span className="font-semibold text-ink">{lastVisitStr}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* PAGINATION FOOTER */}
        {!loading && patients.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-border bg-bg/40 text-xs">
            <div className="text-ink-soft font-medium">
              Showing <span className="font-bold text-ink">{patients.length}</span> of{' '}
              <span className="font-bold text-ink">{total}</span> Patients
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1 disabled:opacity-30"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <span className="font-bold text-ink px-1">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1 disabled:opacity-30"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
