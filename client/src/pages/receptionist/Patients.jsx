import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, UserPlus, ChevronLeft, ChevronRight, Eye, UserSquare2 } from 'lucide-react';
import api from '../../api/axios.js';
import { useSocketEvent } from '../../context/SocketContext.jsx';
import { TableSkeleton } from '../../components/common/TableSkeleton.jsx';

export default function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPatients = async (query = '', pageNum = 1) => {
    try {
      setLoading(true);
      const res = await api.get(`/patients?search=${encodeURIComponent(query)}&page=${pageNum}&limit=10`);
      setPatients(res.data?.patients || []);
      setTotalPages(res.data?.totalPages || 1);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error('Failed to fetch patients:', err);
    } finally {
      setLoading(false);
    }
  };

  useSocketEvent('PATIENT_CREATED', () => {
    fetchPatients(search, page);
  });

  useSocketEvent('PATIENT_UPDATED', () => {
    fetchPatients(search, page);
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients(search, page);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, page]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header and top action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Patients Directory</h2>
          <p className="text-sm text-ink-soft">Search, view, and register clinic OP records</p>
        </div>
        <Link to="/reception/patients/register" className="btn-primary shrink-0">
          <UserPlus size={18} />
          <span>Register New Patient</span>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="card p-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Search by Patient Name, Phone Number, or OP Number..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Patient List Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : patients.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <UserSquare2 size={36} className="mx-auto text-ink-soft/50" />
            <p className="font-display text-base font-semibold text-ink">No patients found</p>
            <p className="text-sm text-ink-soft">
              {search ? 'Try adjusting your search criteria.' : 'Get started by registering a new patient.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-bg/50 text-xs font-semibold text-ink-soft uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">OP Number</th>
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5">Phone</th>
                  <th className="px-5 py-3.5">Age / Sex</th>
                  <th className="px-5 py-3.5">Patient Type</th>
                  <th className="px-5 py-3.5">Registration Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {patients.map((p) => {
                  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Unnamed Patient';
                  const regDate = p.registrationDate
                    ? new Date(p.registrationDate).toLocaleDateString()
                    : 'N/A';
                  const isChild = p.patientType === 'child' || (p.age !== undefined && p.age !== null && Number(p.age) < 12);

                  return (
                    <tr
                      key={p._id}
                      onClick={() => navigate(`/reception/patients/${p._id}`)}
                      className="hover:bg-bg/60 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-4 font-mono font-semibold text-brand">
                        {p.opNumber || '—'}
                      </td>
                      <td className="px-5 py-4 font-medium text-ink">
                        {fullName}
                      </td>
                      <td className="px-5 py-4 text-ink-soft font-mono">
                        {p.phone || '—'}
                      </td>
                      <td className="px-5 py-4 text-ink-soft">
                        {p.age ? `${p.age}y` : '—'} {p.sex ? `/ ${p.sex}` : ''}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`badge font-semibold text-xs border px-2 py-0.5 ${
                          isChild
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}>
                          {isChild ? 'Child' : 'Adult'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-ink-soft">
                        {regDate}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          to={`/reception/patients/${p._id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline p-1"
                        >
                          <Eye size={16} /> View Profile
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3.5 text-sm">
            <span className="text-xs text-ink-soft">
              Showing <span className="font-semibold text-ink">{patients.length}</span> of{' '}
              <span className="font-semibold text-ink">{total}</span> patients
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn-secondary px-2.5 py-1 text-xs"
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="text-xs font-medium text-ink px-2">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="btn-secondary px-2.5 py-1 text-xs"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
