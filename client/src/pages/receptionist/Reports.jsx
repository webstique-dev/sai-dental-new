import { useState, useEffect } from 'react';
import {
  FileBarChart, CalendarDays, Wallet, Clock, CheckCircle2, UserCheck, Bell,
  CreditCard, DollarSign, Filter, RefreshCw, AlertCircle, Users
} from 'lucide-react';
import api from '../../api/axios.js';
import StatCard from '../../components/common/StatCard.jsx';
import DatePicker from '../../components/common/DatePicker.jsx';

export default function ReceptionistReports() {
  const getTodayISO = () => new Date().toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState(getTodayISO());
  const [dateTo, setDateTo] = useState(getTodayISO());
  const [activeQuickFilter, setActiveQuickFilter] = useState('today');

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const res = await api.get(`/reports/reception-summary?${params.toString()}`);
      setReportData(res.data || null);
    } catch (err) {
      console.error('Failed to load reception summary report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [dateFrom, dateTo]);

  const handleQuickFilter = (type) => {
    setActiveQuickFilter(type);
    const now = new Date();

    if (type === 'today') {
      const iso = getTodayISO();
      setDateFrom(iso);
      setDateTo(iso);
    } else if (type === 'week') {
      const startOfWeek = new Date(now);
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);

      setDateFrom(startOfWeek.toISOString().split('T')[0]);
      setDateTo(getTodayISO());
    } else if (type === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(startOfMonth.toISOString().split('T')[0]);
      setDateTo(getTodayISO());
    }
  };

  const aptSummary = reportData?.appointmentSummary || { scheduled: 0, checkedIn: 0, completed: 0, cancelled: 0, noShow: 0 };
  const queueSummary = reportData?.queueSummary || { totalWalkIns: 0, totalAppointmentVisits: 0 };
  const paymentsColl = reportData?.paymentsCollected || { totalAmount: 0, byMethod: { Cash: 0, Card: 0, UPI: 0, Other: 0 } };
  const pendingPayments = reportData?.pendingPayments || { count: 0, totalOutstanding: 0 };
  const followUps = reportData?.followUpCompliance || { due: 0, scheduled: 0, completed: 0 };

  const totalApptCount = (aptSummary.scheduled || 0) + (aptSummary.checkedIn || 0) + (aptSummary.completed || 0) + (aptSummary.cancelled || 0) + (aptSummary.noShow || 0);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            <FileBarChart size={26} className="text-brand" /> Reception & Front-Desk Operational Report
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Operational oversight for daily patient flow, front-desk payment collections, queue traffic, and follow-up compliance.
          </p>
        </div>

        <button onClick={fetchReports} className="btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Report Data
        </button>
      </div>

      {/* Date Filter & Quick Range Selectors */}
      <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider flex items-center gap-1">
            <Filter size={14} className="text-brand" /> Quick Select:
          </span>
          <button
            onClick={() => handleQuickFilter('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              activeQuickFilter === 'today'
                ? 'bg-brand text-white border-brand'
                : 'bg-bg text-ink border-border hover:bg-bg/80'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => handleQuickFilter('week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              activeQuickFilter === 'week'
                ? 'bg-brand text-white border-brand'
                : 'bg-bg text-ink border-border hover:bg-bg/80'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => handleQuickFilter('month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              activeQuickFilter === 'month'
                ? 'bg-brand text-white border-brand'
                : 'bg-bg text-ink border-border hover:bg-bg/80'
            }`}
          >
            This Month
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ink-soft">From:</span>
          <DatePicker
            value={dateFrom}
            onChange={(date, dateStr) => {
              setActiveQuickFilter('custom');
              setDateFrom(dateStr);
            }}
            wrapperClassName="w-36"
            inputClassName="py-1 text-xs"
          />
          <span className="text-xs font-semibold text-ink-soft">To:</span>
          <DatePicker
            value={dateTo}
            onChange={(date, dateStr) => {
              setActiveQuickFilter('custom');
              setDateTo(dateStr);
            }}
            wrapperClassName="w-36"
            inputClassName="py-1 text-xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-sm text-ink-soft">Calculating operational report metrics...</div>
      ) : !reportData ? (
        <div className="card p-12 text-center text-sm text-ink-soft">No front-desk activity recorded in this date range.</div>
      ) : (
        <>
          {/* STAT CARDS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Checked-In Patients"
              value={String(aptSummary.checkedIn || 0)}
              sub={`Out of ${totalApptCount} scheduled appointments`}
              icon={UserCheck}
            />
            <StatCard
              title="Front Desk Payments"
              value={`₹${(paymentsColl.totalAmount || 0).toLocaleString()}`}
              sub="Collected at reception desk"
              icon={DollarSign}
            />
            <StatCard
              title="Pending Patient Dues"
              value={`₹${(pendingPayments.totalOutstanding || 0).toLocaleString()}`}
              sub={`${pendingPayments.count} pending invoice balances`}
              icon={Wallet}
            />
            <StatCard
              title="Follow-Ups Due"
              value={String(followUps.due || 0)}
              sub="Recommended return visits"
              icon={Bell}
            />
          </div>

          {/* MAIN BREAKDOWN SECTIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Section 1: Appointment & Queue Traffic Breakdown */}
            <div className="card p-5 space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                  <CalendarDays size={18} className="text-brand" /> Appointment & Queue Traffic Summary
                </h3>
                <span className="badge bg-brand/10 text-brand font-semibold text-xs">
                  Total Traffic: {(queueSummary.totalWalkIns || 0) + (queueSummary.totalAppointmentVisits || 0)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Appointment Status Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Status Breakdown</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between p-2 rounded bg-bg">
                      <span className="text-ink-soft">Scheduled</span>
                      <span className="font-bold text-ink">{aptSummary.scheduled}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                      <span>Checked-In</span>
                      <span>{aptSummary.checkedIn}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-bg">
                      <span className="text-ink-soft">Completed Visits</span>
                      <span className="font-bold text-indigo-700">{aptSummary.completed}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-bg">
                      <span className="text-ink-soft">Cancelled</span>
                      <span className="font-bold text-rose-600">{aptSummary.cancelled}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-bg">
                      <span className="text-ink-soft">No-Show</span>
                      <span className="font-bold text-amber-700">{aptSummary.noShow}</span>
                    </div>
                  </div>
                </div>

                {/* Queue Intake Breakdown */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Queue Intake Method</h4>
                  <div className="card p-4 space-y-3 bg-bg/50 border-border/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-brand" />
                        <span className="text-xs font-semibold text-ink">Walk-In Visits</span>
                      </div>
                      <span className="font-mono font-bold text-sm text-brand">{queueSummary.totalWalkIns}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={16} className="text-indigo-600" />
                        <span className="text-xs font-semibold text-ink">Scheduled Appointments</span>
                      </div>
                      <span className="font-mono font-bold text-sm text-indigo-700">{queueSummary.totalAppointmentVisits}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Payments Collected By Method */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                  <CreditCard size={18} className="text-emerald-600" /> Payments by Method
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2.5 rounded bg-bg font-semibold">
                  <span>Cash Payments</span>
                  <span className="font-mono text-emerald-800">₹{(paymentsColl.byMethod?.Cash || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-2.5 rounded bg-bg font-semibold">
                  <span>Card Payments</span>
                  <span className="font-mono text-indigo-800">₹{(paymentsColl.byMethod?.Card || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-2.5 rounded bg-bg font-semibold">
                  <span>UPI / QR Payments</span>
                  <span className="font-mono text-purple-800">₹{(paymentsColl.byMethod?.UPI || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-2.5 rounded bg-bg font-semibold">
                  <span>Other Methods</span>
                  <span className="font-mono text-slate-800">₹{(paymentsColl.byMethod?.Other || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex justify-between items-center text-xs font-bold text-ink">
                <span>Total Desk Collections:</span>
                <span className="font-mono text-emerald-700 text-sm">₹{(paymentsColl.totalAmount || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Follow-Up Compliance */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <Bell size={18} className="text-brand" /> Follow-Up Schedule Compliance
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <div className="text-[11px] font-semibold text-amber-800">Pending Return Due</div>
                <div className="text-lg font-bold text-amber-900 mt-0.5">{followUps.due}</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <div className="text-[11px] font-semibold text-blue-800">Appointment Booked</div>
                <div className="text-lg font-bold text-blue-900 mt-0.5">{followUps.scheduled}</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="text-[11px] font-semibold text-emerald-800">Completed Visits</div>
                <div className="text-lg font-bold text-emerald-900 mt-0.5">{followUps.completed}</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
