import { useState, useEffect } from 'react';
import {
  Pill, Plus, Trash2, CheckCircle2, AlertTriangle, Printer, FileText, UserSquare2,
  X, Stethoscope, Phone, Mail, MapPin, Calendar, Hash, Shield, FileCheck
} from 'lucide-react';
import api from '../../../api/axios.js';
import { openPrescriptionPDFWindow } from '../../../utils/prescriptionPdfGenerator.js';

export default function PrescriptionsTab({ consultation, isReadOnly = false }) {
  const consultationId = consultation?._id || consultation?.id;
  const patient = consultation?.patient || {};
  const patientId = patient?._id || patient?.id;
  const doctor = consultation?.doctor || {};

  const [prescriptions, setPrescriptions] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [clinicSettings, setClinicSettings] = useState({
    clinicName: 'Sai Dental Clinic & Super-Specialty Center',
    address: '123 Healthcare Avenue, Medical District, City',
    phone: '+91 98765 43210',
    email: 'contact@sai-dentalclinic.com',
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Print Modal State
  const [printingRx, setPrintingRx] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Dynamic Medicine Rows State
  const [medicines, setMedicines] = useState([
    { medicine: 'Amoxicillin 500mg', dosage: '1 capsule', frequency: '1-0-1 (BD)', duration: '5 days', instructions: 'After meals with water' },
    { medicine: 'Paracetamol 650mg', dosage: '1 tablet', frequency: '1-1-1 (TDS)', duration: '3 days', instructions: 'SOS / For pain' },
  ]);

  // Notifications
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch prescriptions, diagnoses & clinic settings
  const fetchData = async () => {
    if (!consultationId) return;
    try {
      setLoading(true);
      const [rxRes, diagRes, settingsRes] = await Promise.all([
        api.get(`/prescriptions?consultation=${consultationId}`),
        api.get(`/diagnoses?consultation=${consultationId}`).catch(() => ({ data: { diagnoses: [] } })),
        api.get('/clinic-settings').catch(() => ({ data: {} })),
      ]);

      setPrescriptions(rxRes.data?.prescriptions || []);
      setDiagnoses(diagRes.data?.diagnoses || []);

      if (settingsRes.data?.settings) {
        setClinicSettings((prev) => ({ ...prev, ...settingsRes.data.settings }));
      }
    } catch (err) {
      console.error('Failed to load prescription data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [consultationId]);

  const handleAddRow = () => {
    if (isReadOnly) return;
    setMedicines([
      ...medicines,
      { medicine: '', dosage: '', frequency: '', duration: '', instructions: '' },
    ]);
  };

  const handleRemoveRow = (index) => {
    if (isReadOnly || medicines.length === 1) return;
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleRowChange = (index, field, value) => {
    if (isReadOnly) return;
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  const handleSavePrescription = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    const validMedicines = medicines.filter((m) => m.medicine && m.medicine.trim());
    if (validMedicines.length === 0) {
      setErrorMessage('Please add at least one medicine name.');
      return;
    }

    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const payload = {
        consultation: consultationId,
        patient: patientId,
        medicines: validMedicines,
      };

      const res = await api.post('/prescriptions', payload);
      setSuccessMessage('Prescription recorded successfully!');

      // Reset form
      setMedicines([
        { medicine: '', dosage: '', frequency: '', duration: '', instructions: '' },
      ]);

      fetchData();
      if (res.data?.prescription) {
        setPrintingRx(res.data.prescription);
        setShowPrintModal(true);
      }
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to create prescription.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPrintModal = (rx) => {
    setPrintingRx(rx);
    setShowPrintModal(true);
  };

  const handleGeneratePDFWindow = (rxToPrint) => {
    const rxObj = rxToPrint || printingRx;
    if (!rxObj) return;
    openPrescriptionPDFWindow({
      rx: rxObj,
      consultation,
      clinicSettings,
      diagnoses,
    });
  };

  const triggerBrowserPrint = () => {
    if (printingRx) {
      openPrescriptionPDFWindow(
        {
          rx: printingRx,
          consultation,
          clinicSettings,
          diagnoses,
        },
        true
      );
    } else {
      window.print();
    }
  };

  const patientFullName = [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Patient';
  const attendingDoctorName = printingRx?.recordedBy?.name || doctor.name || 'Medical Practitioner';
  const doctorSpecialization = printingRx?.recordedBy?.specialization || doctor.specialization || 'BDS, MDS - Dental Specialist';

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-800 border border-rose-200">
          <AlertTriangle size={18} className="text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* FORM: REPEATABLE MEDICINES PRESCRIPTION FORM (Hidden when read-only) */}
      {!isReadOnly && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
                <Pill size={18} className="text-brand" /> Issue New Prescription (Rx)
              </h3>
              <p className="text-xs text-ink-soft">
                Add medicine items with dosage, frequency, duration, and instructions.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddRow}
              className="btn-secondary text-xs flex items-center gap-1"
            >
              <Plus size={14} /> Add Medicine Row
            </button>
          </div>

          <form onSubmit={handleSavePrescription} className="space-y-4">
            <div className="space-y-2 border border-border rounded-xl p-3 bg-bg/30 max-h-72 overflow-y-auto">
              <div className="grid grid-cols-12 gap-2 text-xs font-bold text-ink-soft uppercase px-1 pb-1 border-b border-border/50">
                <span className="col-span-4">Medicine Name *</span>
                <span className="col-span-2">Dosage</span>
                <span className="col-span-2">Frequency</span>
                <span className="col-span-2">Duration</span>
                <span className="col-span-2">Action</span>
              </div>

              {medicines.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                  <div className="col-span-4">
                    <input
                      type="text"
                      className="input-field py-1.5 text-xs"
                      placeholder="Medicine Name (e.g. Amoxicillin)"
                      value={item.medicine}
                      onChange={(e) => handleRowChange(idx, 'medicine', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      className="input-field py-1.5 text-xs"
                      placeholder="Dosage (500mg)"
                      value={item.dosage}
                      onChange={(e) => handleRowChange(idx, 'dosage', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      className="input-field py-1.5 text-xs"
                      placeholder="Freq (1-0-1)"
                      value={item.frequency}
                      onChange={(e) => handleRowChange(idx, 'frequency', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      className="input-field py-1.5 text-xs"
                      placeholder="Duration (5 days)"
                      value={item.duration}
                      onChange={(e) => handleRowChange(idx, 'duration', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-between gap-1">
                    <input
                      type="text"
                      className="input-field py-1.5 text-xs"
                      placeholder="Instructions (After food)"
                      value={item.instructions}
                      onChange={(e) => handleRowChange(idx, 'instructions', e.target.value)}
                    />
                    <button
                      type="button"
                      disabled={medicines.length === 1}
                      onClick={() => handleRemoveRow(idx)}
                      className="p-1 text-ink-soft hover:text-rose-600 disabled:opacity-30 shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={submitting} className="btn-primary">
                <Pill size={16} />
                <span>{submitting ? 'Saving Prescription...' : 'Issue Prescription'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SAVED PRESCRIPTIONS LIST */}
      <div className="card p-5 space-y-4">
        <div className="border-b border-border pb-3 flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-bold text-ink">
              Prescription History ({prescriptions.length})
            </h3>
            <p className="text-xs text-ink-soft">
              Medical prescriptions recorded for this visit. Click Print Prescription for print-ready A4 document.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center text-xs text-ink-soft">Loading prescriptions...</div>
        ) : prescriptions.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-soft space-y-2">
            <Pill size={28} className="mx-auto text-ink-soft/40" />
            <p className="font-semibold text-ink">No prescriptions issued for this consultation yet.</p>
            <p>Fill out the form above to add medicine items.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {prescriptions.map((rx) => {
              const rxId = rx._id || rx.id;
              const dateStr = rx.createdAt
                ? new Date(rx.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
                : 'N/A';

              return (
                <div
                  key={rxId}
                  className="rounded-2xl border border-border p-5 bg-surface shadow-sm space-y-4 font-sans"
                >
                  {/* Rx Header Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-3 gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-xl font-black text-brand tracking-tighter">Rx</span>
                        <span className="text-xs font-bold text-ink">Medical Prescription</span>
                      </div>
                      <p className="text-[11px] text-ink-soft">
                        Issued by: <strong>Dr. {rx.recordedBy?.name || doctor.name}</strong>{' '}
                        {rx.recordedBy?.specialization ? `(${rx.recordedBy.specialization})` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-right">
                      <span className="text-xs font-semibold text-ink mr-1">{dateStr}</span>
                      {/* <button
                        type="button"
                        onClick={() => handleOpenPrintModal(rx)}
                        className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                      >
                        <FileText size={14} /> View PDF
                      </button> */}
                      <button
                        type="button"
                        onClick={() => openPrescriptionPDFWindow({ rx, consultation, clinicSettings, diagnoses }, true)}
                        className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
                      >
                        <Printer size={14} /> Print
                      </button>
                    </div>
                  </div>

                  {/* Medicines Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft">
                        <tr>
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">Medicine Name</th>
                          <th className="px-3 py-2">Dosage</th>
                          <th className="px-3 py-2">Frequency</th>
                          <th className="px-3 py-2">Duration</th>
                          <th className="px-3 py-2">Instructions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {rx.medicines?.map((m, idx) => (
                          <tr key={idx} className="hover:bg-bg/40">
                            <td className="px-3 py-2.5 font-bold text-ink-soft">{idx + 1}</td>
                            <td className="px-3 py-2.5 font-bold text-ink">{m.medicine}</td>
                            <td className="px-3 py-2.5 text-ink-soft">{m.dosage || '—'}</td>
                            <td className="px-3 py-2.5 font-mono text-brand font-bold">{m.frequency || '—'}</td>
                            <td className="px-3 py-2.5 text-ink-soft">{m.duration || '—'}</td>
                            <td className="px-3 py-2.5 text-ink-soft italic">{m.instructions || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PRINT PREVIEW MODAL & PRINTABLE A4 MEDICAL PRESCRIPTION TEMPLATE */}
      {showPrintModal && printingRx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-2 sm:p-4 overflow-hidden no-print-bg">
          <div className="card max-w-4xl w-full max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header (Hidden on print) */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 bg-surface shrink-0 no-print">
              <div className="flex items-center gap-2">
                <Printer size={20} className="text-brand" />
                <h3 className="font-display text-base font-bold text-ink">Print Preview — Medical Prescription</h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={triggerBrowserPrint}
                  className="btn-primary py-1.5 px-3.5 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Printer size={15} /> Print
                </button>
                <button
                  onClick={() => handleGeneratePDFWindow(printingRx)}
                  className="btn-secondary py-1.5 px-3.5 text-xs font-bold flex items-center gap-1.5"
                >
                  <FileText size={15} /> View PDF
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-bg transition-colors"
                  title="Close preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">

              {/* PRINTABLE A4 PRESCRIPTION CONTENT */}
              <div id="printable-prescription" className="bg-white text-slate-900 p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-md font-sans text-xs space-y-6 max-w-3xl mx-auto">
                {/* 1. CLINIC BRANDING HEADER */}
                <div className="border-b-2 border-slate-900 pb-5">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xl">
                          <Stethoscope size={24} />
                        </div>
                        <div>
                          <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                            {clinicSettings.clinicName}
                          </h1>
                          <p className="text-[11px] font-bold text-teal-700 tracking-wide uppercase">
                            Center for Digital Dentistry & Super-Specialty Oral Care
                          </p>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 pt-1">
                        {clinicSettings.address}
                      </p>
                    </div>

                    <div className="text-right text-[11px] text-slate-600 space-y-0.5">
                      <p className="font-bold text-slate-900">Phone: {clinicSettings.phone}</p>
                      <p>Email: {clinicSettings.email}</p>
                      <p className="text-[10px] text-slate-500 font-medium">Reg No: KDC-84920 / Lic: 2026-DNT</p>
                    </div>
                  </div>
                </div>

                {/* 2. DOCTOR DETAILS & RX METADATA BAR */}
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200 bg-slate-50 p-4 rounded-xl">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Dr. {attendingDoctorName}
                    </h3>
                    <p className="text-[11px] font-semibold text-teal-700">{doctorSpecialization}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Dental Surgeon & Clinical Consultant</p>
                  </div>

                  <div className="text-right space-y-0.5">
                    <p className="text-xs font-bold text-slate-900">
                      Date: <span className="font-mono">{new Date(printingRx.createdAt || Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </p>
                    <p className="text-[11px] font-mono font-semibold text-slate-700">
                      Rx Ref: RX-{(patient.opNumber || '0000').replace(/[^0-9]/g, '')}-{(printingRx._id || '000000').slice(-6).toUpperCase()}
                    </p>
                  </div>
                </div>

                {/* 3. PATIENT DEMOGRAPHICS & VITALS BOX */}
                <div className="border border-slate-300 rounded-xl p-4 bg-white space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Patient Name</span>
                      <span className="font-extrabold text-slate-900 text-sm">{patientFullName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">OP Number</span>
                      <span className="font-mono font-bold text-teal-700 text-xs">{patient.opNumber || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Age / Gender</span>
                      <span className="font-bold text-slate-800">
                        {patient.age !== undefined && patient.age !== null ? `${patient.age} yrs` : 'N/A'} {patient.sex ? `/ ${patient.sex}` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Phone</span>
                      <span className="font-mono font-semibold text-slate-800">{patient.phone || 'N/A'}</span>
                    </div>
                  </div>

                  {(patient.vitals?.bp || patient.vitals?.rbs || patient.address) && (
                    <div className="pt-2 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                      {patient.vitals?.bp && (
                        <div>
                          <span className="text-slate-500">BP:</span> <strong className="text-slate-800">{patient.vitals.bp}</strong>
                        </div>
                      )}
                      {patient.vitals?.rbs && (
                        <div>
                          <span className="text-slate-500">RBS:</span> <strong className="text-slate-800">{patient.vitals.rbs}</strong>
                        </div>
                      )}
                      {patient.address && (
                        <div className="col-span-2">
                          <span className="text-slate-500">Address:</span> <span className="text-slate-800 font-medium">{patient.address}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. DIAGNOSES & CLINICAL NOTES (If available) */}
                {diagnoses.length > 0 && (
                  <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 text-xs space-y-1">
                    <span className="text-[10px] font-bold uppercase text-amber-900 block">Clinical Diagnosis / Findings:</span>
                    <div className="flex flex-wrap gap-2">
                      {diagnoses.map((d, i) => (
                        <span key={i} className="font-semibold text-slate-900 bg-white px-2 py-0.5 rounded border border-amber-300">
                          {d.diagnosis} {d.relatedTeeth?.length > 0 ? `(Teeth: #${d.relatedTeeth.join(', #')})` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. PRESCRIBED MEDICINES TABLE */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 border-b-2 border-teal-600 pb-1">
                    <span className="text-2xl font-black text-teal-700 italic font-serif">Rx</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Prescribed Medications</span>
                  </div>

                  <div className="overflow-hidden border border-slate-300 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-300">
                        <tr>
                          <th className="py-2.5 px-3 w-8 text-center border-r border-slate-300">#</th>
                          <th className="py-2.5 px-3 border-r border-slate-300">Medicine Name & Strength</th>
                          <th className="py-2.5 px-3 w-24 border-r border-slate-300">Dosage</th>
                          <th className="py-2.5 px-3 w-28 border-r border-slate-300">Frequency</th>
                          <th className="py-2.5 px-3 w-24 border-r border-slate-300">Duration</th>
                          <th className="py-2.5 px-3">Instructions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-800">
                        {printingRx.medicines?.map((m, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="py-3 px-3 text-center font-bold text-slate-500 border-r border-slate-200">{idx + 1}</td>
                            <td className="py-3 px-3 font-bold text-slate-900 border-r border-slate-200">
                              {m.medicine}
                            </td>
                            <td className="py-3 px-3 font-medium border-r border-slate-200">{m.dosage || '1 Tab'}</td>
                            <td className="py-3 px-3 font-mono font-bold text-teal-800 border-r border-slate-200">
                              {m.frequency || '1-0-1'}
                            </td>
                            <td className="py-3 px-3 font-medium border-r border-slate-200">{m.duration || '5 Days'}</td>
                            <td className="py-3 px-3 italic text-slate-700">{m.instructions || 'After food'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 6. GENERAL ADVICE & PRECAUTIONS */}
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-[11px] space-y-1">
                  <span className="font-bold text-slate-900 block uppercase text-[10px]">General Post-Treatment Instructions & Advice:</span>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                    <li>Take all prescribed medicines at specified intervals as directed.</li>
                    <li>Complete the full course of antibiotics even if symptoms resolve earlier.</li>
                    <li>Rinse mouth gently with warm salt water 3-4 times daily after meals.</li>
                    <li>Avoid hot, hard, sticky, or crunchy food items for 24-48 hours.</li>
                  </ul>
                </div>

                {/* 7. DOCTOR SIGNATURE & FOOTER BAR */}
                <div className="pt-8 flex justify-between items-end border-t border-slate-300">
                  <div className="text-[10px] text-slate-500 space-y-0.5">
                    <p className="font-bold text-slate-700">Sai Dental Clinic — Patient Care Services</p>
                    <p>Emergency Contact: {clinicSettings.phone}</p>
                    <p className="italic">This is a valid computerized medical prescription.</p>
                  </div>

                  <div className="text-center space-y-1">
                    <div className="h-12 w-44 border-b border-slate-900 mx-auto flex items-end justify-center pb-1">
                      <span className="text-[10px] font-semibold text-slate-400 italic">Signature / Stamp</span>
                    </div>
                    <p className="font-bold text-xs text-slate-900">Dr. {attendingDoctorName}</p>
                    <p className="text-[10px] text-slate-600">{doctorSpecialization}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT CSS STYLES */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          /* Hide all UI elements except #printable-prescription */
          body * {
            visibility: hidden !important;
          }
          #printable-prescription, #printable-prescription * {
            visibility: visible !important;
          }
          #printable-prescription {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 12mm 16mm !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print, .no-print-bg {
            display: none !important;
            background: transparent !important;
          }
        }
      `}</style>
    </div>
  );
}

