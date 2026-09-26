import { useState } from 'react';
import { Wallet, DollarSign, Eye, RefreshCcw, ChevronDown, ChevronUp, Printer } from 'lucide-react';
import { TableSkeleton } from './TableSkeleton.jsx';
import { formatPatientFullName } from '../../utils/formatters.js';
import { openBillPrintWindow } from '../../utils/billPdfGenerator.js';

const DEFAULT_STATUS_CLASSES = {
  Paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Partially Paid': 'bg-amber-100 text-amber-800 border-amber-200',
  Pending: 'bg-rose-100 text-rose-800 border-rose-200',
  Refunded: 'bg-blue-100 text-blue-800 border-blue-200',
};

export default function InvoiceList({
  invoices = [],
  loading = false,
  allowPayment = true,
  allowRefund = false,
  onRecordPayment = () => {},
  onRefund = () => {},
  onViewDetail = () => {},
  statusBadgeClasses = DEFAULT_STATUS_CLASSES,
}) {
  const [expandedInvId, setExpandedInvId] = useState(null);

  if (loading) {
    return <TableSkeleton rows={5} cols={9} />;
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="p-12 text-center space-y-3">
        <Wallet size={36} className="mx-auto text-ink-soft/40" />
        <p className="font-display text-base font-semibold text-ink">No Invoices Found</p>
        <p className="text-xs text-ink-soft">Try adjusting search or status filter parameters.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View (≥768px) */}
      <div className="hidden md:block overflow-x-auto scrollbar-none no-scrollbar">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5">OP #</th>
              <th className="px-5 py-3.5">Patient</th>
              <th className="px-5 py-3.5">Doctor</th>
              <th className="px-5 py-3.5">Date</th>
              <th className="px-5 py-3.5 text-right">Total (₹)</th>
              <th className="px-5 py-3.5 text-right">Paid (₹)</th>
              <th className="px-5 py-3.5 text-right">Balance (₹)</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.map((inv) => {
              const invId = inv._id || inv.id;
              const patientName = formatPatientFullName(inv.patient) || 'Unknown Patient';
              const docName = inv.doctor ? `Dr. ${inv.doctor.name}` : 'Unassigned';
              const dateStr = inv.createdAt
                ? new Date(inv.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'N/A';

              const canPay = allowPayment && inv.paymentStatus !== 'Paid' && inv.paymentStatus !== 'Refunded' && inv.balance > 0;
              const canRefund = allowRefund && inv.paymentStatus !== 'Refunded' && (inv.amountPaid > 0 || inv.paymentStatus === 'Paid');

              return (
                <tr key={invId} className="hover:bg-bg/60 transition-colors">
                  <td className="px-5 py-4 font-mono font-bold text-brand whitespace-nowrap">
                    {inv.opNumber || '—'}
                  </td>

                  <td className="px-5 py-4 font-bold text-ink whitespace-nowrap text-sm">
                    {patientName}
                  </td>

                  <td className="px-5 py-4 text-ink-soft whitespace-nowrap">
                    {docName}
                  </td>

                  <td className="px-5 py-4 font-mono text-ink-soft whitespace-nowrap">
                    {dateStr}
                  </td>

                  <td className="px-5 py-4 text-right font-bold text-ink whitespace-nowrap text-sm">
                    ₹{(inv.total || 0).toLocaleString()}
                  </td>

                  <td className="px-5 py-4 text-right font-bold text-emerald-700 whitespace-nowrap text-sm">
                    ₹{(inv.amountPaid || 0).toLocaleString()}
                  </td>

                  <td className="px-5 py-4 text-right font-bold text-rose-700 whitespace-nowrap text-sm">
                    ₹{(inv.balance || 0).toLocaleString()}
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap">
                    <span
                      className={`badge font-bold border text-[10px] ${
                        statusBadgeClasses[inv.paymentStatus] || 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {inv.paymentStatus}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right whitespace-nowrap space-x-1.5">
                    <button
                      onClick={() => onViewDetail(inv)}
                      title="View Invoice Details"
                      className="inline-flex items-center gap-1 rounded-xl border border-border px-2.5 py-1 text-[11px] font-semibold text-ink-soft hover:bg-bg hover:text-ink"
                    >
                      <Eye size={13} /> View
                    </button>

                    <button
                      onClick={() => openBillPrintWindow({ invoice: inv }, true)}
                      title="Print Bill / Invoice"
                      className="inline-flex items-center gap-1 rounded-xl border border-border px-2.5 py-1 text-[11px] font-semibold text-ink-soft hover:border-brand/50 hover:text-brand hover:bg-bg"
                    >
                      <Printer size={13} /> Print
                    </button>

                    {canPay && (
                      <button
                        onClick={() => onRecordPayment(inv)}
                        title="Record Payment"
                        className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                      >
                        <DollarSign size={13} /> Pay
                      </button>
                    )}

                    {canRefund && (
                      <button
                        onClick={() => onRefund(inv)}
                        title="Issue Refund (Admin Only)"
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-300 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-800 hover:bg-rose-100"
                      >
                        <RefreshCcw size={13} /> Refund
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Collapsible Cards View (<768px down to 320px) */}
      <div className="block md:hidden divide-y divide-border">
        {invoices.map((inv) => {
          const invId = inv._id || inv.id;
          const patientName = formatPatientFullName(inv.patient) || 'Unknown Patient';
          const docName = inv.doctor ? `Dr. ${inv.doctor.name}` : 'Unassigned';
          const dateStr = inv.createdAt
            ? new Date(inv.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'N/A';

          const canPay = allowPayment && inv.paymentStatus !== 'Paid' && inv.paymentStatus !== 'Refunded' && inv.balance > 0;
          const canRefund = allowRefund && inv.paymentStatus !== 'Refunded' && (inv.amountPaid > 0 || inv.paymentStatus === 'Paid');
          const isExpanded = expandedInvId === invId;

          return (
            <div key={invId} className="p-4 space-y-3 hover:bg-bg/40 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-ink text-sm truncate">{patientName}</span>
                    {inv.opNumber && (
                      <span className="text-brand font-mono font-bold text-xs">#{inv.opNumber}</span>
                    )}
                  </div>
                  <div className="text-xs text-ink-soft">{docName} • {dateStr}</div>
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedInvId(isExpanded ? null : invId)}
                  className="p-1.5 rounded-lg border border-border text-ink-soft hover:text-ink hover:bg-bg shrink-0 mt-0.5"
                >
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span
                  className={`badge font-bold border text-[10px] ${
                    statusBadgeClasses[inv.paymentStatus] || 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {inv.paymentStatus}
                </span>
                <span className="font-mono font-bold text-ink text-xs">₹{(inv.total || 0).toLocaleString()}</span>
              </div>

              {isExpanded && (
                <div className="pt-2 border-t border-border/70 space-y-3 text-xs animate-in fade-in duration-150">
                  <div className="grid grid-cols-3 gap-2 text-ink-soft bg-bg/50 p-2.5 rounded-xl border border-border text-center text-[11px]">
                    <div>
                      <span className="block text-[10px] font-semibold uppercase text-ink-soft">Total</span>
                      <span className="font-bold text-ink text-xs">₹{(inv.total || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold uppercase text-ink-soft">Paid</span>
                      <span className="font-bold text-emerald-700 text-xs">₹{(inv.amountPaid || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold uppercase text-ink-soft">Balance</span>
                      <span className="font-bold text-rose-700 text-xs">₹{(inv.balance || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => onViewDetail(inv)}
                      className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-bg hover:text-ink"
                    >
                      <Eye size={14} /> Details
                    </button>

                    <button
                      onClick={() => openBillPrintWindow({ invoice: inv }, true)}
                      className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-ink-soft hover:border-brand/50 hover:text-brand hover:bg-bg"
                    >
                      <Printer size={14} /> Print Bill
                    </button>

                    {canPay && (
                      <button
                        onClick={() => onRecordPayment(inv)}
                        className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                      >
                        <DollarSign size={14} /> Pay
                      </button>
                    )}

                    {canRefund && (
                      <button
                        onClick={() => onRefund(inv)}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100"
                      >
                        <RefreshCcw size={14} /> Refund
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
