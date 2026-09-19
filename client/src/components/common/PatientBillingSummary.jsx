import { useState, useEffect } from 'react';
import { Receipt, Wallet, CreditCard, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import StatCard from './StatCard.jsx';
import api from '../../api/axios.js';

function getInvoiceStatusBadge(status) {
  switch (status) {
    case 'Paid':
      return { label: 'Paid', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    case 'Partially Paid':
      return { label: 'Partially Paid', color: 'bg-amber-50 text-amber-800 border-amber-200' };
    case 'Pending':
      return { label: 'Pending', color: 'bg-rose-50 text-rose-800 border-rose-200' };
    case 'Refunded':
      return { label: 'Refunded', color: 'bg-purple-50 text-purple-800 border-purple-200' };
    default:
      return { label: status || 'Pending', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
}

function formatReadableDate(dateInput) {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function PatientBillingSummary({
  patientId,
  billing: directBilling,
  showHeader = true,
  className = '',
}) {
  const [fetchedBilling, setFetchedBilling] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch billing data if not directly provided via props
  useEffect(() => {
    if (directBilling) {
      setFetchedBilling(null);
      return;
    }
    if (!patientId) return;

    let isMounted = true;
    async function loadBilling() {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/patients/${patientId}/emr`);
        if (isMounted) {
          setFetchedBilling(res.data?.billing || {
            totalCharges: 0,
            totalPaid: 0,
            totalBalance: 0,
            invoices: [],
          });
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to load billing summary.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadBilling();
    return () => {
      isMounted = false;
    };
  }, [patientId, directBilling]);

  const billing = directBilling || fetchedBilling || {
    totalCharges: 0,
    totalPaid: 0,
    totalBalance: 0,
    invoices: [],
  };

  const invoices = billing.invoices || [];

  if (loading) {
    return (
      <div className={`p-8 text-center text-xs text-ink-soft space-y-2 card ${className}`}>
        <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="font-semibold text-ink">Loading patient financial summary...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 text-center text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl space-y-1 ${className}`}>
        <AlertCircle size={20} className="mx-auto text-rose-600" />
        <p className="font-bold">Unable to retrieve billing records</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header / Summary */}
      {showHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
              <Receipt size={16} className="text-brand" /> Financial & Billing Summary
            </h3>
            <p className="text-xs text-ink-soft">
              Read-only financial overview of charges, collected revenue, and invoice records.
            </p>
          </div>
          <span className="badge bg-slate-100 text-slate-700 font-mono text-xs border border-slate-200">
            {invoices.length} Invoice(s)
          </span>
        </div>
      )}

      {/* Three Summary Figures */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Charges"
          value={`₹${(billing.totalCharges || 0).toLocaleString()}`}
          sub="Cumulative billed amount"
          icon={CreditCard}
          tone="brand"
        />
        <StatCard
          title="Amount Paid"
          value={`₹${(billing.totalPaid || 0).toLocaleString()}`}
          sub="Total received payments"
          icon={CheckCircle2}
          tone="success"
        />
        <div className={billing.totalBalance > 0 ? 'rounded-2xl ring-2 ring-rose-400/50' : ''}>
          <StatCard
            title="Balance Due"
            value={`₹${(billing.totalBalance || 0).toLocaleString()}`}
            sub={billing.totalBalance > 0 ? 'Outstanding patient dues' : 'Fully settled'}
            icon={AlertCircle}
            tone={billing.totalBalance > 0 ? 'danger' : 'success'}
          />
        </div>
      </div>

      {/* Invoices Breakdown Table / Compact List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-border/80 pb-2">
          <h4 className="font-display text-xs font-bold text-ink flex items-center gap-1.5">
            <Receipt size={14} className="text-brand" /> Invoice Records Breakdown
          </h4>
        </div>

        {invoices.length > 0 ? (
          <div className="card bg-surface border-border overflow-hidden shadow-sm">
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto scrollbar-none no-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-bg/50 text-ink-soft font-semibold">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Services / Items</th>
                    <th className="py-2.5 px-4 text-right">Total</th>
                    <th className="py-2.5 px-4 text-right">Paid</th>
                    <th className="py-2.5 px-4 text-right">Balance</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {invoices.map((inv, idx) => {
                    const statusBadge = getInvoiceStatusBadge(inv.paymentStatus);
                    return (
                      <tr key={inv._id || idx} className="hover:bg-bg/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-ink whitespace-nowrap">
                          {formatReadableDate(inv.date)}
                        </td>
                        <td className="py-3 px-4 text-ink-soft max-w-xs truncate" title={inv.itemsSummary}>
                          <span className="text-ink font-medium">{inv.itemsSummary}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-ink">
                          ₹{(inv.total || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                          ₹{(inv.amountPaid || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          <span className={inv.balance > 0 ? 'text-rose-600' : 'text-slate-600'}>
                            ₹{(inv.balance || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className={`badge border text-[10px] font-bold py-0.5 px-2 ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile List View */}
            <div className="sm:hidden divide-y divide-border/60">
              {invoices.map((inv, idx) => {
                const statusBadge = getInvoiceStatusBadge(inv.paymentStatus);
                return (
                  <div key={inv._id || idx} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-semibold text-xs text-ink block">{inv.itemsSummary}</span>
                        <span className="text-[11px] text-ink-soft flex items-center gap-1 mt-0.5">
                          <Calendar size={12} /> {formatReadableDate(inv.date)}
                        </span>
                      </div>
                      <span className={`badge border text-[10px] font-bold py-0.5 px-2 shrink-0 ${statusBadge.color}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-border/50 bg-bg/40 p-2.5 rounded-lg">
                      <div>
                        <span className="text-[10px] text-ink-soft uppercase block font-semibold">Total</span>
                        <span className="font-mono font-bold text-ink">₹{(inv.total || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-soft uppercase block font-semibold">Paid</span>
                        <span className="font-mono font-semibold text-emerald-700">₹{(inv.amountPaid || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-soft uppercase block font-semibold">Balance</span>
                        <span className={`font-mono font-bold ${inv.balance > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                          ₹{(inv.balance || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="card p-8 text-center text-xs text-ink-soft space-y-2 border-dashed bg-bg/20">
            <Receipt size={30} className="mx-auto text-ink-soft/40" />
            <p className="font-semibold text-ink text-sm">No billing history for this patient yet</p>
            <p className="text-xs">Generated invoices and payment receipts will be reflected here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
