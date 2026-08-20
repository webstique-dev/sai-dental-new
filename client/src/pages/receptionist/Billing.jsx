import { useState, useEffect } from 'react';
import {
  Wallet, Plus, Search, Trash2, X, Clock, Calendar,
  FileText, DollarSign, CreditCard, ChevronRight, User, Stethoscope, Eye, Filter, RefreshCw,
  Banknote, QrCode, Building2, Tag, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import api from '../../api/axios.js';
import PatientSearchInput from '../../components/common/PatientSearchInput.jsx';
import DatePicker from '../../components/common/DatePicker.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';

const STATUS_BADGE_CLASSES = {
  Paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Partially Paid': 'bg-amber-100 text-amber-800 border-amber-200',
  Pending: 'bg-rose-100 text-rose-800 border-rose-200',
  Refunded: 'bg-blue-100 text-blue-800 border-blue-200',
};

export default function Billing() {
  const { showSuccess, showError } = useNotification();
  const [errorMessage, setErrorMessage] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'all'

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modals
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [activePaymentInvoice, setActivePaymentInvoice] = useState(null);
  const [showConfirmSettlement, setShowConfirmSettlement] = useState(false);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  // Generate Invoice Form state
  const [patientSearch, setPatientSearch] = useState('');
  const [patientOptions, setPatientOptions] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [items, setItems] = useState([
    { service: 'General Consultation', treatment: 'Dental Exam', quantity: 1, unitPrice: 500 },
  ]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);

  // Record Payment Form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentDiscount, setPaymentDiscount] = useState(0);

  const [catalogItems, setCatalogItems] = useState([]);

  // Fetch doctors & catalog items
  const fetchDoctors = async () => {
    try {
      const [docRes, catRes] = await Promise.all([
        api.get('/users/doctors'),
        api.get('/treatments?active=true').catch(() => ({ data: { treatments: [] } })),
      ]);
      const docs = docRes.data?.doctors || [];
      setDoctors(docs);
      setCatalogItems(catRes.data?.treatments || []);
      if (docs.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(docs[0]._id || docs[0].id);
      }
    } catch (err) {
      console.error('Failed to load doctors:', err);
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (doctorFilter) params.append('doctor', doctorFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const res = await api.get(`/invoices?${params.toString()}`);
      setInvoices(res.data?.invoices || []);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, doctorFilter, dateFrom, dateTo]);

  // Handle Tab Change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'pending') {
      setStatusFilter('Pending');
    } else {
      setStatusFilter('');
    }
  };

  // Helper: Short summary of procedures
  const getProceduresSummary = (inv) => {
    if (!inv.items || inv.items.length === 0) return 'General Dental Consultation';
    const list = inv.items.map((i) => i.service || i.treatment).filter(Boolean);
    if (list.length === 0) return 'General Dental Consultation';
    if (list.length <= 2) return list.join(', ');
    return `${list.slice(0, 2).join(', ')} (+${list.length - 2} more)`;
  };

  // Live patient search inside Generate Invoice Modal
  useEffect(() => {
    if (!patientSearch || patientSearch.trim().length < 2) {
      setPatientOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/patients?search=${encodeURIComponent(patientSearch)}&limit=5`);
        setPatientOptions(res.data?.patients || []);
      } catch (err) {
        console.error('Patient search error:', err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  // Live calculations for Generate Invoice
  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0), 0);
  const computedTotal = Math.max(0, subtotal - (Number(discount) || 0) + (Number(tax) || 0));

  const handleAddItem = () => {
    setItems([...items, { service: '', treatment: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const resetGenerateModal = () => {
    setSelectedPatient(null);
    setPatientSearch('');
    setPatientOptions([]);
    setSelectedDoctorId(doctors[0]?._id || doctors[0]?.id || '');
    setItems([{ service: 'General Consultation', treatment: 'Dental Exam', quantity: 1, unitPrice: 500 }]);
    setDiscount(0);
    setTax(0);
    setErrorMessage('');
    setShowGenerateModal(false);
  };

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      const msg = 'Please search and select a patient.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    const validItems = items.filter((i) => i.service && i.service.trim());
    if (validItems.length === 0) {
      const msg = 'At least one valid line item is required.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    try {
      const payload = {
        patient: selectedPatient._id || selectedPatient.id,
        doctor: selectedDoctorId || undefined,
        opNumber: selectedPatient.opNumber || '',
        items: validItems,
        discount: Number(discount) || 0,
        tax: Number(tax) || 0,
      };

      await api.post('/invoices', payload);
      showSuccess('Invoice generated successfully!');
      resetGenerateModal();
      fetchInvoices();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to generate invoice.';
      setErrorMessage(msg);
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const openPaymentModal = (inv) => {
    setActivePaymentInvoice(inv);
    setPaymentDiscount(inv.discount || 0);
    setPaymentAmount(inv.balance > 0 ? inv.balance : inv.total || '');
    setPaymentMethod('Cash');
    setShowConfirmSettlement(false);
    setErrorMessage('');
  };

  const handlePaymentClick = (e) => {
    e.preventDefault();
    const amt = Number(paymentAmount);
    if (!amt || amt <= 0) {
      const msg = 'Please enter a valid payment amount.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    setErrorMessage('');

    // Compute expected remaining balance
    const itemsSubtotal = (activePaymentInvoice.items || []).reduce(
      (sum, item) => sum + (item.quantity || 1) * (item.unitPrice || 0),
      0
    );
    const netTotal = Math.max(0, itemsSubtotal - (Number(paymentDiscount) || 0) + (activePaymentInvoice.tax || 0));
    const alreadyPaid = activePaymentInvoice.amountPaid || 0;
    const remainingBalance = Math.max(0, netTotal - alreadyPaid - amt);

    if (remainingBalance === 0) {
      setShowConfirmSettlement(true);
    } else {
      executeRecordPayment();
    }
  };

  const executeRecordPayment = async () => {
    if (!activePaymentInvoice) return;
    setSubmitting(true);
    setErrorMessage('');
    try {
      const invId = activePaymentInvoice._id || activePaymentInvoice.id;
      await api.post(`/invoices/${invId}/payments`, {
        amount: Number(paymentAmount),
        method: paymentMethod,
        discount: Number(paymentDiscount) || 0,
      });

      showSuccess(`Payment of ₹${paymentAmount} recorded successfully!`);
      setActivePaymentInvoice(null);
      setShowConfirmSettlement(false);
      fetchInvoices();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to record payment.';
      setErrorMessage(msg);
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const pendingBillsCount = invoices.filter((i) => i.paymentStatus === 'Pending' || i.paymentStatus === 'Partially Paid').length;

  return (
    <>
      <div className="space-y-6">
        {/* Header & Primary Action */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
              <Wallet size={22} className="text-brand" /> Billing & Payments
            </h2>
            <p className="text-sm text-ink-soft">Process doctor-closed consultation bills, generate invoices, and record payments</p>
          </div>

          <button
            onClick={() => {
              resetGenerateModal();
              setShowGenerateModal(true);
            }}
            className="btn-primary shrink-0 text-xs"
          >
            <Plus size={18} />
            <span>Generate Manual Invoice</span>
          </button>
        </div>

        {/* Section / Tab Switcher */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 bg-surface border border-border p-1 rounded-2xl w-fit">
            <button
              onClick={() => handleTabChange('pending')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'pending'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-ink-soft hover:text-ink hover:bg-bg'
              }`}
            >
              <Clock size={16} />
              <span>Pending Bills</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'pending' ? 'bg-white text-rose-700' : 'bg-rose-100 text-rose-800'}`}>
                {pendingBillsCount}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'all'
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-ink-soft hover:text-ink hover:bg-bg'
              }`}
            >
              <FileText size={16} />
              <span>All Invoices & Bills</span>
            </button>
          </div>

          <button
            onClick={fetchInvoices}
            className="btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh List
          </button>
        </div>

        {/* Filters Bar: Search, Doctor, Date Range, Status */}
        <div className="card p-4 grid grid-cols-1 gap-3 sm:grid-cols-4 bg-surface text-xs">
          {/* Patient Search */}
          <div className="relative sm:col-span-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              className="input-field pl-9 py-1.5 text-xs"
              placeholder="Search by Patient Name, Phone Number, or OP Number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Doctor Filter */}
          <div>
            <select
              className="input-field py-1.5 text-xs"
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
            >
              <option value="">All Doctors</option>
              {doctors.map((d) => (
                <option key={d._id || d.id} value={d._id || d.id}>
                  Dr. {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <DatePicker
              label=""
              value={dateFrom}
              onChange={(d, str) => setDateFrom(str)}
            />
            <span className="text-ink-soft font-semibold">to</span>
            <DatePicker
              label=""
              value={dateTo}
              onChange={(d, str) => setDateTo(str)}
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              className="input-field py-1.5 text-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid">Paid</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>
        </div>

        {/* INVOICE & PENDING BILLS LIST TABLE */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-ink-soft">Loading billing records...</div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Wallet size={36} className="mx-auto text-ink-soft/50" />
              <p className="font-display text-base font-semibold text-ink">
                {activeTab === 'pending' ? 'No pending bills found' : 'No invoices found'}
              </p>
              <p className="text-xs text-ink-soft">
                {search || statusFilter || doctorFilter || dateFrom || dateTo
                  ? 'Try clearing or adjusting your search filters.'
                  : 'Pending bills generated by doctors upon closing consultations will appear here.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Patient Details</th>
                    <th className="px-5 py-3.5">OP Number</th>
                    <th className="px-5 py-3.5">Attending Doctor</th>
                    <th className="px-5 py-3.5">Visit Date</th>
                    <th className="px-5 py-3.5">Procedures Summary</th>
                    <th className="px-5 py-3.5">Amount Due</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((inv) => {
                    const invId = inv._id || inv.id;
                    const patient = inv.patient || {};
                    const patientName = [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Patient';
                    const docName = inv.doctor ? `Dr. ${inv.doctor.name}` : 'Unassigned Doctor';
                    const visitDateStr = inv.createdAt
                      ? new Date(inv.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'N/A';
                    const procSummary = getProceduresSummary(inv);
                    const amountDue = inv.balance ?? (inv.total - (inv.amountPaid || 0));

                    return (
                      <tr key={invId} className="hover:bg-bg/40 transition-colors">
                        {/* Patient Details */}
                        <td className="px-5 py-4">
                          <div className="font-bold text-ink text-sm">{patientName}</div>
                          {patient.phone && (
                            <div className="text-[11px] text-ink-soft">{patient.phone}</div>
                          )}
                        </td>

                        {/* OP Number */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-brand text-xs">
                            {inv.opNumber || patient.opNumber || '—'}
                          </span>
                        </td>

                        {/* Doctor */}
                        <td className="px-5 py-4 whitespace-nowrap font-medium text-ink">
                          {docName}
                        </td>

                        {/* Visit Date */}
                        <td className="px-5 py-4 whitespace-nowrap text-ink">
                          <div className="font-semibold">{visitDateStr}</div>
                          <div className="text-[10px] text-ink-soft font-mono">ID: {invId.slice(-6).toUpperCase()}</div>
                        </td>

                        {/* Procedures (Short Summary) */}
                        <td className="px-5 py-4 max-w-xs font-medium text-ink">
                          {procSummary}
                        </td>

                        {/* Amount Due */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-rose-600 text-sm">
                            ₹{amountDue?.toLocaleString() || 0}
                          </div>
                          {inv.amountPaid > 0 && (
                            <div className="text-[10px] text-emerald-700 font-medium">
                              Paid: ₹{inv.amountPaid.toLocaleString()}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`badge border ${STATUS_BADGE_CLASSES[inv.paymentStatus] || 'bg-slate-100 text-slate-800'}`}>
                            {inv.paymentStatus}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedInvoiceDetail(inv)}
                              title="View Invoice Details"
                              className="btn-secondary text-xs py-1.5 px-2.5"
                            >
                              <Eye size={14} /> View
                            </button>

                            {inv.paymentStatus !== 'Paid' && inv.paymentStatus !== 'Refunded' && (
                              <button
                                onClick={() => openPaymentModal(inv)}
                                className="btn-primary text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 font-bold"
                              >
                                <DollarSign size={14} /> Collect Payment
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* VIEW INVOICE DETAILS MODAL */}
      {selectedInvoiceDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden">
          <div className="card w-full max-w-lg max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 bg-surface shrink-0">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <FileText size={18} className="text-brand" /> Invoice #{selectedInvoiceDetail._id?.slice(-6).toUpperCase()}
              </h3>
              <button onClick={() => setSelectedInvoiceDetail(null)} className="rounded-lg p-1 hover:bg-bg">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-bg border border-border">
                <div>
                  <span className="text-[10px] font-bold uppercase text-ink-soft block">Patient</span>
                  <span className="font-bold text-ink">
                    {selectedInvoiceDetail.patient?.firstName} {selectedInvoiceDetail.patient?.lastName}
                  </span>
                  <span className="text-xs text-brand font-mono font-bold block">{selectedInvoiceDetail.opNumber || selectedInvoiceDetail.patient?.opNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-ink-soft block">Attending Doctor</span>
                  <span className="font-bold text-ink">
                    {selectedInvoiceDetail.doctor ? `Dr. ${selectedInvoiceDetail.doctor.name}` : 'Unassigned'}
                  </span>
                  <span className="text-xs text-ink-soft block">
                    {selectedInvoiceDetail.createdAt ? new Date(selectedInvoiceDetail.createdAt).toLocaleDateString() : ''}
                  </span>
                </div>
              </div>

              {/* Itemized Procedures Breakdown (Read-Only) */}
              <div className="space-y-2">
                <h4 className="font-bold text-ink uppercase tracking-wider text-[11px]">Itemized Treatment Procedures</h4>
                <div className="card overflow-hidden border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft">
                      <tr>
                        <th className="px-3 py-2">Procedure / Tooth</th>
                        <th className="px-3 py-2 text-right">Charges</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(selectedInvoiceDetail.items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 font-medium text-ink">{item.service || item.treatment}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-ink">₹{item.unitPrice?.toLocaleString() || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment History Log */}
              {selectedInvoiceDetail.payments && selectedInvoiceDetail.payments.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-ink uppercase tracking-wider text-[11px]">Payment History</h4>
                  <div className="space-y-1 text-[11px]">
                    {selectedInvoiceDetail.payments.map((p, idx) => (
                      <div key={idx} className="flex justify-between p-2 rounded-lg bg-bg border border-border font-medium">
                        <div>
                          <span className="font-bold text-emerald-800">{p.method} Payment</span>
                          <span className="text-ink-soft text-[10px] block">
                            {new Date(p.date).toLocaleString()} • Staff: {p.recordedBy?.name || 'Reception Staff'}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-700">₹{p.amount?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary Totals */}
              <div className="p-3 rounded-xl bg-bg border border-border space-y-1.5 text-xs">
                <div className="flex justify-between font-semibold">
                  <span>Total Charges:</span>
                  <span className="font-mono text-ink">₹{selectedInvoiceDetail.total?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between text-emerald-800 font-semibold">
                  <span>Amount Paid:</span>
                  <span className="font-mono">₹{selectedInvoiceDetail.amountPaid?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-bold border-t border-border/60 pt-1.5 text-sm">
                  <span>Balance Due:</span>
                  <span className="font-mono">₹{selectedInvoiceDetail.balance?.toLocaleString() || 0}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0">
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => setSelectedInvoiceDetail(null)}
              >
                Close
              </button>
              {selectedInvoiceDetail.paymentStatus !== 'Paid' && selectedInvoiceDetail.paymentStatus !== 'Refunded' && (
                <button
                  type="button"
                  className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  onClick={() => {
                    const inv = selectedInvoiceDetail;
                    setSelectedInvoiceDetail(null);
                    openPaymentModal(inv);
                  }}
                >
                  <DollarSign size={14} /> Collect Payment
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GENERATE MANUAL INVOICE MODAL */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden">
          <div className="card w-full max-w-lg max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 bg-surface shrink-0">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <Plus size={18} className="text-brand" /> Generate Manual Invoice
              </h3>
              <button onClick={resetGenerateModal} className="rounded-lg p-1 hover:bg-bg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGenerateInvoice} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3.5 text-xs">
                {errorMessage && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200">
                    <X size={16} className="text-rose-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <PatientSearchInput
                  selectedPatient={selectedPatient}
                  onSelect={(p) => {
                    setSelectedPatient(p);
                    setErrorMessage('');
                  }}
                  required
                />

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Attending Doctor</label>
                  <select
                    className="input-field text-xs"
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map((d) => (
                      <option key={d._id || d.id} value={d._id || d.id}>
                        Dr. {d.name} ({d.specialization || 'Dental Specialist'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-ink-soft">Line Items *</label>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Item
                    </button>
                  </div>

                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-bg p-2 rounded-xl border border-border">
                      <div className="col-span-6">
                        <input
                          type="text"
                          className="input-field py-1 text-xs"
                          placeholder="Item / Procedure Name"
                          value={item.service}
                          onChange={(e) => handleItemChange(idx, 'service', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          className="input-field py-1 text-xs text-center font-mono"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          min="0"
                          className="input-field py-1 text-xs font-mono"
                          placeholder="Price ₹"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-ink-soft hover:text-rose-600 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-bg border border-border space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-ink-soft">Subtotal:</span>
                    <span className="font-mono font-bold text-ink">₹{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center font-bold text-ink border-t border-border/60 pt-1.5 text-sm">
                    <span>Total Amount:</span>
                    <span className="font-mono text-brand">₹{computedTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0">
                <button type="button" className="btn-secondary text-xs" onClick={resetGenerateModal}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary text-xs">
                  {submitting ? 'Generating...' : 'Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COLLECT PAYMENT & BILL SETTLEMENT MODAL */}
      {activePaymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden">
          <div className="card w-full max-w-lg max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 bg-surface shrink-0">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <DollarSign size={20} className="text-emerald-600" /> Collect Payment & Settle Bill
              </h3>
              <button onClick={() => setActivePaymentInvoice(null)} className="rounded-lg p-1 hover:bg-bg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePaymentClick} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3.5 text-xs">
                {errorMessage && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200">
                    <X size={16} className="text-rose-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Patient & Doctor Visit Header */}
                <div className="p-3.5 rounded-xl bg-bg border border-border grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-ink-soft block">Patient</span>
                    <span className="font-bold text-ink text-sm">
                      {activePaymentInvoice.patient?.firstName} {activePaymentInvoice.patient?.lastName}
                    </span>
                    <span className="text-xs text-brand font-mono font-bold block">{activePaymentInvoice.opNumber || activePaymentInvoice.patient?.opNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-ink-soft block">Doctor</span>
                    <span className="font-bold text-ink text-xs">
                      {activePaymentInvoice.doctor ? `Dr. ${activePaymentInvoice.doctor.name}` : 'Unassigned'}
                    </span>
                    <span className="text-[11px] text-ink-soft block mt-0.5">
                      Visit: {activePaymentInvoice.createdAt ? new Date(activePaymentInvoice.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>

                {/* Read-Only Itemized Charges Table pulled directly from Treatment Record */}
                <div className="space-y-1.5">
                  <span className="font-bold text-ink uppercase tracking-wider text-[11px]">Itemized Treatment Record (Read-Only)</span>
                  <div className="card overflow-hidden border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft">
                        <tr>
                          <th className="px-3 py-2">Procedure / Tooth</th>
                          <th className="px-3 py-2 text-right">Charges</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(activePaymentInvoice.items || []).map((item, idx) => (
                          <tr key={idx} className="bg-surface">
                            <td className="px-3 py-2 font-medium text-ink">{item.service || item.treatment}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-ink">₹{item.unitPrice?.toLocaleString() || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Optional Discount / Adjustment Field */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1 flex items-center gap-1">
                      <Tag size={13} className="text-amber-600" /> Discount / Adjustment (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="input-field text-xs font-mono"
                      placeholder="0"
                      value={paymentDiscount}
                      onChange={(e) => setPaymentDiscount(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Payment Amount (₹) *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      className="input-field text-xs font-mono font-bold text-emerald-800 text-sm"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div>
                  <label className="block font-semibold text-ink-soft mb-1.5">Payment Method *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'Cash', label: 'Cash', icon: Banknote },
                      { id: 'Card', label: 'Card', icon: CreditCard },
                      { id: 'UPI', label: 'UPI / QR', icon: QrCode },
                      { id: 'Other', label: 'Other', icon: Building2 },
                    ].map((method) => {
                      const Icon = method.icon;
                      const isSelected = paymentMethod === method.id;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setPaymentMethod(method.id)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm'
                              : 'bg-bg border-border text-ink-soft hover:bg-surface hover:text-ink'
                          }`}
                        >
                          <Icon size={16} className={isSelected ? 'text-emerald-600' : 'text-ink-soft'} />
                          <span>{method.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Settlement Summary & Expected Status */}
                {(() => {
                  const itemsSub = (activePaymentInvoice.items || []).reduce((sum, i) => sum + (i.quantity || 1) * (i.unitPrice || 0), 0);
                  const discVal = Number(paymentDiscount) || 0;
                  const netTot = Math.max(0, itemsSub - discVal + (activePaymentInvoice.tax || 0));
                  const curPaid = activePaymentInvoice.amountPaid || 0;
                  const payAmt = Number(paymentAmount) || 0;
                  const newBalance = Math.max(0, netTot - curPaid - payAmt);
                  const expectedStatus = newBalance === 0 ? 'Paid' : payAmt > 0 ? 'Partially Paid' : 'Pending';

                  return (
                    <div className="p-3 rounded-xl bg-bg border border-border space-y-1 text-xs">
                      <div className="flex justify-between text-ink-soft">
                        <span>Original Charges Subtotal:</span>
                        <span className="font-mono">₹{itemsSub.toLocaleString()}</span>
                      </div>
                      {discVal > 0 && (
                        <div className="flex justify-between text-amber-700 font-medium">
                          <span>Discount Applied:</span>
                          <span className="font-mono">-₹{discVal.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold">
                        <span>Net Total:</span>
                        <span className="font-mono">₹{netTot.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-emerald-800 font-semibold">
                        <span>Already Paid:</span>
                        <span className="font-mono">₹{curPaid.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold text-ink border-t border-border/60 pt-1">
                        <span>Current Payment:</span>
                        <span className="font-mono text-emerald-700">₹{payAmt.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center font-bold border-t border-border/60 pt-1 text-sm">
                        <span>Remaining Balance:</span>
                        <span className={`font-mono ${newBalance === 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          ₹{newBalance.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1 text-[11px]">
                        <span className="text-ink-soft">Resulting Bill Status:</span>
                        <span className={`badge border ${STATUS_BADGE_CLASSES[expectedStatus]}`}>
                          {expectedStatus}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="flex items-center justify-end gap-2 px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-bg/50 shrink-0">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setActivePaymentInvoice(null)}
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  {submitting ? 'Confirming...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM FULL SETTLEMENT DIALOG */}
      {showConfirmSettlement && activePaymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden">
          <div className="card w-full max-w-sm flex flex-col bg-surface p-5 space-y-4 shadow-xl text-xs">
            <div className="flex items-center gap-3 text-emerald-700">
              <CheckCircle2 size={28} className="shrink-0" />
              <div>
                <h4 className="font-display font-bold text-sm text-ink">Confirm Full Settlement</h4>
                <p className="text-ink-soft">This payment will fully clear the balance for this bill.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1 text-emerald-900 font-medium">
              <div className="flex justify-between">
                <span>Collecting:</span>
                <span className="font-mono font-bold text-emerald-800">₹{paymentAmount}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="font-bold">{paymentMethod}</span>
              </div>
              <div className="flex justify-between border-t border-emerald-200/60 pt-1">
                <span>Status update to:</span>
                <span className="badge bg-emerald-100 text-emerald-800 border-emerald-300 font-bold">Paid</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                className="btn-secondary py-1.5 text-xs"
                onClick={() => setShowConfirmSettlement(false)}
              >
                Back
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={executeRecordPayment}
                className="btn-primary py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {submitting ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
