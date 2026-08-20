import { useState, useEffect } from 'react';
import {
  FileBarChart, CalendarDays, Wallet, Clock, CheckCircle2, UserCheck, Bell,
  CreditCard, DollarSign, Filter, RefreshCw, AlertCircle, Users, Phone, Globe,
} from 'lucide-react';
import api from '../../api/axios.js';
import StatCard from '../../components/common/StatCard.jsx';
import DatePicker from '../../components/common/DatePicker.jsx';
import { ReportSkeleton } from '../../components/common/TableSkeleton.jsx';

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
      setReportData(res.data);
    } catch (err) {
      console.error('Failed to fetch reception report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [dateFrom, dateTo]);

  const handleQuickRange = (type) => {
    setActiveQuickFilter(type);
    const now = new Date();

    if (type === 'today') {
      setDateFrom(getTodayISO());
      setDateTo(getTodayISO());
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
  const queueSummary = reportData?.queueSummary || { totalWalkIns: 0, totalPhoneBookings: 0, totalOnlineBookings: 0, totalAppointmentVisits: 0 };
  const paymentsColl = reportData?.paymentsCollected || { totalAmount: 0, byMethod: { Cash: 0, Card: 0, UPI: 0, Other: 0 } };
  const pendingPayments = reportData?.pendingPayments || { count: 0, totalOutstanding: 0 };
  const followUps = reportData?.followUpCompliance || { due: 0, scheduled: 0, completed: 0 };

  const totalApptCount = (aptSummary.scheduled || 0) + (aptSummary.checkedIn || 0) + (aptSummary.completed || 0) + (aptSummary.cancelled || 0) + (aptSummary.noShow || 0);

  const totalIntake = (queueSummary.totalWalkIns || 0) + (queueSummary.totalPhoneBookings || 0) + (queueSummary.totalOnlineBookings || 0);
  const walkInPct = totalIntake ? Math.round(((queueSummary.totalWalkIns || 0) / totalIntake) * 100) : 0;
  const phonePct = totalIntake ? Math.round(((queueSummary.totalPhoneBookings || 0) / totalIntake) * 100) : 0;
  const onlinePct = totalIntake ? Math.round(((queueSummary.totalOnlineBookings || 0) / totalIntake) * 100) : 0;

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
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-ink-soft" />
          <span className="text-xs font-bold text-ink">Date Filter:</span>

          <div className="flex items-center gap-1 bg-bg p-1 rounded-xl border border-border">
            <button
              onClick={() => handleQuickRange('today')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeQuickFilter === 'today' ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => handleQuickRange('week')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeQuickFilter === 'week' ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => handleQuickRange('month')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeQuickFilter === 'month' ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
              }`}
            >
              This Month
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <DatePicker
            label=""
            value={dateFrom}
            onChange={(d, str) => {
              setDateFrom(str);
              setActiveQuickFilter('custom');
            }}
          />
          <span className="text-ink-soft">to</span>
          <DatePicker
            label=""
            value={dateTo}
            onChange={(d, str) => {
              setDateTo(str);
              setActiveQuickFilter('custom');
            }}
          />
        </div>
      </div>

      {/* TOP STAT CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Appointments Today"
          value={loading ? '...' : String(totalApptCount)}
          subtitle={`${aptSummary.scheduled} scheduled • ${aptSummary.checkedIn} checked in`}
          icon={CalendarDays}
          trend={aptSummary.completed > 0 ? `${aptSummary.completed} completed` : undefined}
          trendType="neutral"
        />

        <StatCard
          title="Payments Collected"
          value={loading ? '...' : `₹${(paymentsColl.totalAmount || 0).toLocaleString()}`}
          subtitle={`Cash: ₹${(paymentsColl.byMethod?.Cash || 0).toLocaleString()} • Card: ₹${(paymentsColl.byMethod?.Card || 0).toLocaleString()}`}
          icon={Wallet}
          trend="Front Desk Revenue"
          trendType="up"
        />

        <StatCard
          title="Pending Payments"
          value={loading ? '...' : `₹${(pendingPayments.totalOutstanding || 0).toLocaleString()}`}
          subtitle={`${pendingPayments.count || 0} pending invoices`}
          icon={AlertCircle}
          trend={pendingPayments.count > 0 ? 'Action required' : 'All clear'}
          trendType={pendingPayments.count > 0 ? 'down' : 'up'}
        />

        <StatCard
          title="Follow-Up Compliance"
          value={loading ? '...' : String(followUps.due || 0)}
          subtitle={`${followUps.scheduled} scheduled • ${followUps.completed} completed`}
          icon={UserCheck}
          trend="Recall Pipeline"
          trendType="neutral"
        />
      </div>

      {/* MAIN CONTENT BLOCK */}
      {loading ? (
        <ReportSkeleton />
      ) : (
        <div className="space-y-6">
          {/* MAIN BREAKDOWN SECTIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Section 1: Appointment & Queue Traffic Breakdown */}
            <div className="card p-5 space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                  <CalendarDays size={18} className="text-brand" /> Appointment & Queue Traffic Summary
                </h3>
                <span className="badge bg-brand/10 text-brand font-semibold text-xs">
                  Total Traffic: {totalIntake}
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
                        <Users size={16} className="text-brand shrink-0" />
                        <span className="text-xs font-semibold text-ink">Walk-In Visits</span>
                      </div>
                      <span className="font-mono font-bold text-sm text-brand">{queueSummary.totalWalkIns || 0}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone size={16} className="text-indigo-600 shrink-0" />
                        <span className="text-xs font-semibold text-ink">Phone Bookings</span>
                      </div>
                      <span className="font-mono font-bold text-sm text-indigo-700">{queueSummary.totalPhoneBookings || 0}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe size={16} className="text-emerald-600 shrink-0" />
                        <span className="text-xs font-semibold text-ink">Online Bookings</span>
                      </div>
                      <span className="font-mono font-bold text-sm text-emerald-700">{queueSummary.totalOnlineBookings || 0}</span>
                    </div>

                    {/* Visual Channel Distribution Bar */}
                    <div className="pt-2.5 border-t border-border/60 space-y-1.5">
                      <div className="flex justify-between text-[11px] font-semibold text-ink-soft">
                        <span>Channel Distribution</span>
                        <span>{totalIntake} Total Intake</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
                        <div style={{ width: `${walkInPct}%` }} className="bg-brand h-full transition-all" title={`Walk-In: ${walkInPct}%`} />
                        <div style={{ width: `${phonePct}%` }} className="bg-indigo-600 h-full transition-all" title={`Phone: ${phonePct}%`} />
                        <div style={{ width: `${onlinePct}%` }} className="bg-emerald-500 h-full transition-all" title={`Online: ${onlinePct}%`} />
                      </div>
                      <div className="flex justify-between text-[10px] text-ink-soft pt-1">
                        <span className="flex items-center gap-1 font-medium"><span className="h-2 w-2 rounded-full bg-brand inline-block" /> Walk-In ({walkInPct}%)</span>
                        <span className="flex items-center gap-1 font-medium"><span className="h-2 w-2 rounded-full bg-indigo-600 inline-block" /> Phone ({phonePct}%)</span>
                        <span className="flex items-center gap-1 font-medium"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Online ({onlinePct}%)</span>
                      </div>
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
                  <span>Other / Transfers</span>
                  <span className="font-mono text-slate-700">₹{(paymentsColl.byMethod?.Other || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
