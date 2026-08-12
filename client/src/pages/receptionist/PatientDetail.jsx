import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, UserSquare2, Phone, Calendar, Hash, User, ShieldAlert } from 'lucide-react';
import api from '../../api/axios.js';

export default function PatientDetail() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchPatient() {
      try {
        setLoading(true);
        const res = await api.get(`/patients/${id}`);
        setPatient(res.data?.patient);
      } catch (err) {
        setError(err.response?.data?.message || 'Patient not found');
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      fetchPatient();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-sm text-ink-soft">Loading patient profile...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="space-y-4">
        <Link
          to="/reception/patients"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"
        >
          <ArrowLeft size={16} /> Back to Patients
        </Link>
        <div className="card p-6 text-center space-y-3">
          <ShieldAlert size={32} className="mx-auto text-rose-500" />
          <h3 className="font-display text-base font-bold text-ink">{error || 'Patient not found'}</h3>
        </div>
      </div>
    );
  }

  const fullName = [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Unnamed Patient';
  const regDate = patient.registrationDate
    ? new Date(patient.registrationDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'N/A';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top back navigation */}
      <div>
        <Link
          to="/reception/patients"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline mb-2"
        >
          <ArrowLeft size={16} /> Back to Patients Directory
        </Link>
      </div>

      {/* Read-Only Patient Header Card */}
      <div className="card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand-dark">
              <UserSquare2 size={28} />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-ink">{fullName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="badge bg-brand/10 text-brand font-mono text-xs">
                  {patient.opNumber || 'OP-000000'}
                </span>
                <span className="text-xs text-ink-soft">ID: {patient._id}</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-ink-soft">
            Registered on <span className="font-semibold text-ink">{regDate}</span>
            {patient.registeredBy?.name && (
              <span className="block text-[11px]">by {patient.registeredBy.name}</span>
            )}
          </div>
        </div>

        {/* Basic Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs text-ink-soft font-medium">
              <User size={14} /> Age / Sex
            </span>
            <p className="font-semibold text-ink">
              {patient.age ? `${patient.age} yrs` : 'N/A'} {patient.sex ? `/ ${patient.sex}` : ''}
            </p>
          </div>

          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs text-ink-soft font-medium">
              <Phone size={14} /> Phone
            </span>
            <p className="font-semibold text-ink">{patient.phone || 'N/A'}</p>
          </div>

          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs text-ink-soft font-medium">
              <Calendar size={14} /> Date of Birth
            </span>
            <p className="font-semibold text-ink">
              {patient.dateOfBirth
                ? new Date(patient.dateOfBirth).toLocaleDateString()
                : 'N/A'}
            </p>
          </div>

          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs text-ink-soft font-medium">
              <Hash size={14} /> OP Number
            </span>
            <p className="font-semibold text-ink">{patient.opNumber || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Non-clinical additional basic information summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-5 space-y-3">
          <h3 className="font-display text-sm font-bold text-ink border-b border-border pb-2">
            Address & Occupation
          </h3>
          <div className="text-sm space-y-2 text-ink">
            <div>
              <span className="text-xs text-ink-soft block font-medium">Occupation</span>
              <p>{patient.occupation || 'Not provided'}</p>
            </div>
            <div>
              <span className="text-xs text-ink-soft block font-medium">Address</span>
              <p>{patient.address || 'Not provided'}</p>
            </div>
          </div>
        </div>

        <div className="card p-5 space-y-3">
          <h3 className="font-display text-sm font-bold text-ink border-b border-border pb-2">
            Vitals & Habits
          </h3>
          <div className="text-sm space-y-2 text-ink">
            <div className="flex gap-6">
              <div>
                <span className="text-xs text-ink-soft block font-medium">BP</span>
                <p>{patient.vitals?.bp || 'N/A'}</p>
              </div>
              <div>
                <span className="text-xs text-ink-soft block font-medium">RBS</span>
                <p>{patient.vitals?.rbs || 'N/A'}</p>
              </div>
            </div>
            <div>
              <span className="text-xs text-ink-soft block font-medium">Habits</span>
              <p>
                {patient.habits && patient.habits.length > 0
                  ? patient.habits.join(', ')
                  : 'None reported'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
