import { Wallet, DollarSign, Eye, RefreshCcw } from 'lucide-react';

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
  if (loading) {
    return <div className="p-8 text-center text-sm text-ink-soft">Loading billing invoices...</div>;
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
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-border bg-bg/50 font-semibold text-ink-soft uppercase tracking-wider">
          <tr>
            <th className="px-4 py-3">OP #</th>
            <th className="px-4 py-3">Patient</th>
            <th className="px-4 py-3">Doctor</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3 text-right">Total (₹)</th>
            <th className="px-4 py-3 text-right">Paid (₹)</th>
            <th className="px-4 py-3 text-right">Balance (₹)</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {invoices.map((inv) => {
            const invId = inv._id || inv.id;
            const patientName = inv.patient
              ? `${inv.patient.firstName || ''} ${inv.patient.lastName || ''}`.trim()
              : 'Unknown Patient';
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
                <td className="px-4 py-3 font-mono font-bold text-brand whitespace-nowrap">
                  {inv.opNumber || '—'}
                </td>

                <td className="px-4 py-3 font-bold text-ink whitespace-nowrap">
                  {patientName}
                </td>

                <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                  {docName}
                </td>

                <td className="px-4 py-3 font-mono text-ink-soft whitespace-nowrap">
                  {dateStr}
                </td>

                <td className="px-4 py-3 text-right font-bold text-ink whitespace-nowrap">
                  ₹{(inv.total || 0).toLocaleString()}
                </td>

                <td className="px-4 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                  ₹{(inv.amountPaid || 0).toLocaleString()}
                </td>

                <td className="px-4 py-3 text-right font-bold text-rose-700 whitespace-nowrap">
                  ₹{(inv.balance || 0).toLocaleString()}
                </td>

                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`badge border text-[10px] ${
                      statusBadgeClasses[inv.paymentStatus] || 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {inv.paymentStatus}
                  </span>
                </td>

                <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                  <button
                    onClick={() => onViewDetail(inv)}
                    title="View Invoice Details"
                    className="inline-flex items-center gap-1 rounded-lg border border-border p-1.5 text-[11px] font-semibold text-ink-soft hover:bg-bg hover:text-ink"
                  >
                    <Eye size={13} /> View
                  </button>

                  {canPay && (
                    <button
                      onClick={() => onRecordPayment(inv)}
                      title="Record Payment"
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 p-1.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      <DollarSign size={13} /> Pay
                    </button>
                  )}

                  {canRefund && (
                    <button
                      onClick={() => onRefund(inv)}
                      title="Issue Refund (Admin Only)"
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 p-1.5 text-[11px] font-semibold text-rose-800 hover:bg-rose-100"
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
  );
}
