const Appointment = require('../models/Appointment');
const QueueEntry = require('../models/QueueEntry');
const Patient = require('../models/Patient');
const FollowUp = require('../models/FollowUp');
const Consultation = require('../models/Consultation');
const Invoice = require('../models/Invoice');
const TreatmentPlan = require('../models/TreatmentPlan');
const ToothRecord = require('../models/ToothRecord');
const User = require('../models/User');

function getTodayDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

function parseDateRange(dateFrom, dateTo) {
  const end = dateTo ? new Date(dateTo) : new Date();
  end.setHours(23, 59, 59, 999);

  let start;
  if (dateFrom) {
    start = new Date(dateFrom);
  } else {
    // Default to last 30 days
    start = new Date();
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

// GET /api/reports/reception-summary?dateFrom=&dateTo=
async function getReceptionSummary(req, res, next) {
  try {
    const { dateFrom, dateTo } = req.query;

    let start, end;
    if (dateFrom || dateTo) {
      const parsed = parseDateRange(dateFrom, dateTo);
      start = parsed.start;
      end = parsed.end;
    } else {
      const today = getTodayDateRange();
      start = today.start;
      end = today.end;
    }

    // 1. Appointment Summary (counts by Appointment.status within date range)
    const scheduled = await Appointment.countDocuments({
      date: { $gte: start, $lte: end },
      status: 'Scheduled',
    });
    const checkedIn = await Appointment.countDocuments({
      date: { $gte: start, $lte: end },
      status: { $in: ['Checked In', 'Checked-In'] },
    });
    const completed = await Appointment.countDocuments({
      date: { $gte: start, $lte: end },
      status: 'Completed',
    });
    const cancelled = await Appointment.countDocuments({
      date: { $gte: start, $lte: end },
      status: 'Cancelled',
    });
    const noShow = await Appointment.countDocuments({
      date: { $gte: start, $lte: end },
      status: { $in: ['No-Show', 'No Show'] },
    });

    const appointmentSummary = {
      scheduled,
      checkedIn,
      completed,
      cancelled,
      noShow,
    };

    // 2. Queue Summary / Intake Breakdown across Walk-In, Phone Booking, and Online Booking
    const walkInAppts = await Appointment.countDocuments({
      date: { $gte: start, $lte: end },
      type: { $in: ['Walk-In', 'Walk-in', 'walk_in'] },
    });
    const walkInQueue = await QueueEntry.countDocuments({
      date: { $gte: start, $lte: end },
      type: { $in: ['Walk-in', 'walk_in', 'Walk In', 'Walk-In'] },
    });
    const totalWalkIns = Math.max(walkInAppts, walkInQueue);

    const totalPhoneBookings = await Appointment.countDocuments({
      date: { $gte: start, $lte: end },
      type: { $in: ['Phone Booking', 'Appointment', 'appointment'] }, // Map legacy Appointment entries to Phone Booking
    });

    const totalOnlineBookings = await Appointment.countDocuments({
      date: { $gte: start, $lte: end },
      type: 'Online Booking',
    });

    const queueSummary = {
      totalWalkIns,
      totalPhoneBookings,
      totalOnlineBookings,
      totalAppointmentVisits: totalWalkIns + totalPhoneBookings + totalOnlineBookings,
    };

    // 3. Payments Collected (summed from Invoice.payments within date range)
    const invoicesWithPayments = await Invoice.find({
      'payments.date': { $gte: start, $lte: end },
    });

    let totalAmount = 0;
    const byMethod = {
      Cash: 0,
      Card: 0,
      UPI: 0,
      Other: 0,
    };

    invoicesWithPayments.forEach((inv) => {
      (inv.payments || []).forEach((p) => {
        if (p.date && p.date >= start && p.date <= end && p.type !== 'refund') {
          const amt = p.amount || 0;
          totalAmount += amt;
          const m = p.method || 'Cash';
          if (byMethod[m] !== undefined) {
            byMethod[m] += amt;
          } else {
            byMethod.Other += amt;
          }
        }
      });
    });

    const paymentsCollected = {
      totalAmount,
      byMethod,
    };

    // 4. Pending Payments
    const pendingInvoices = await Invoice.find({
      paymentStatus: { $in: ['Pending', 'Partially Paid'] },
      createdAt: { $gte: start, $lte: end },
    });

    const totalOutstanding = pendingInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);

    const pendingPayments = {
      count: pendingInvoices.length,
      totalOutstanding,
    };

    // 5. Follow-Up Compliance (counts by status within date range)
    const due = await FollowUp.countDocuments({
      recommendedDate: { $gte: start, $lte: end },
      status: 'Pending',
    });
    const scheduledFollowUps = await FollowUp.countDocuments({
      recommendedDate: { $gte: start, $lte: end },
      status: 'Scheduled',
    });
    const completedFollowUps = await FollowUp.countDocuments({
      recommendedDate: { $gte: start, $lte: end },
      status: 'Completed',
    });

    const followUpCompliance = {
      due,
      scheduled: scheduledFollowUps,
      completed: completedFollowUps,
    };

    return res.json({
      dateFrom: start,
      dateTo: end,
      appointmentSummary,
      queueSummary,
      paymentsCollected,
      pendingPayments,
      followUpCompliance,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/clinic-performance?dateFrom=&dateTo=
async function getClinicPerformance(req, res, next) {
  try {
    const { dateFrom, dateTo } = req.query;
    const { start, end } = parseDateRange(dateFrom, dateTo);

    const totalPatients = await Patient.countDocuments();
    const newPatients = await Patient.countDocuments({
      createdAt: { $gte: start, $lte: end },
    });

    // Returning patients = patients with > 1 consultation total
    const returningAgg = await Consultation.aggregate([
      { $group: { _id: '$patient', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: 'returningCount' },
    ]);
    const returningPatients = returningAgg[0]?.returningCount || 0;

    const appointments = await Appointment.countDocuments({
      createdAt: { $gte: start, $lte: end },
    });

    const completedConsultations = await Consultation.countDocuments({
      status: 'Completed',
      createdAt: { $gte: start, $lte: end },
    });

    const cancelledAppointments = await Appointment.countDocuments({
      status: 'Cancelled',
      createdAt: { $gte: start, $lte: end },
    });

    const noShows = await Appointment.countDocuments({
      status: 'No-Show',
      createdAt: { $gte: start, $lte: end },
    });

    return res.json({
      dateFrom: start,
      dateTo: end,
      totalPatients,
      newPatients,
      returningPatients,
      appointments,
      completedConsultations,
      cancelledAppointments,
      noShows,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/financial?dateFrom=&dateTo=
async function getFinancialReport(req, res, next) {
  try {
    const { dateFrom, dateTo } = req.query;
    const { start, end } = parseDateRange(dateFrom, dateTo);

    const invoices = await Invoice.find({
      createdAt: { $gte: start, $lte: end },
    });

    let totalRevenue = 0;
    let pendingPaymentsTotal = 0;
    let treatmentRevenue = 0;

    const paymentMethodBreakdown = {
      Cash: 0,
      Card: 0,
      UPI: 0,
      Other: 0,
    };

    const dailyRevenueMap = {};

    invoices.forEach((inv) => {
      totalRevenue += inv.amountPaid || 0;
      pendingPaymentsTotal += inv.balance || 0;
      treatmentRevenue += inv.totalAmount || 0;

      // Payments breakdown
      (inv.payments || []).forEach((p) => {
        const method = p.method || 'Cash';
        if (paymentMethodBreakdown[method] !== undefined) {
          paymentMethodBreakdown[method] += p.amount || 0;
        } else {
          paymentMethodBreakdown.Other += p.amount || 0;
        }
      });

      // Daily revenue accumulation
      const dateKey = new Date(inv.createdAt).toISOString().split('T')[0];
      if (!dailyRevenueMap[dateKey]) {
        dailyRevenueMap[dateKey] = { date: dateKey, revenue: 0, invoiceCount: 0 };
      }
      dailyRevenueMap[dateKey].revenue += inv.amountPaid || 0;
      dailyRevenueMap[dateKey].invoiceCount += 1;
    });

    const dailyRevenue = Object.values(dailyRevenueMap).sort((a, b) => (a.date > b.date ? 1 : -1));

    return res.json({
      dateFrom: start,
      dateTo: end,
      totalRevenue,
      pendingPaymentsTotal,
      treatmentRevenue,
      paymentMethodBreakdown,
      dailyRevenue,
      totalInvoicesCount: invoices.length,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/treatment-analytics?dateFrom=&dateTo=
async function getTreatmentAnalytics(req, res, next) {
  try {
    const { dateFrom, dateTo } = req.query;
    const { start, end } = parseDateRange(dateFrom, dateTo);

    const plans = await TreatmentPlan.find({
      createdAt: { $gte: start, $lte: end },
    });

    const specificCounts = {
      RCT: 0,
      Crown: 0,
      Filling: 0,
      Extraction: 0,
      Implant: 0,
    };

    const treatmentMap = {};

    plans.forEach((p) => {
      const name = p.treatment || 'General';
      const nameLower = name.toLowerCase();

      if (nameLower.includes('rct') || nameLower.includes('root canal')) {
        specificCounts.RCT += 1;
      }
      if (nameLower.includes('crown') || nameLower.includes('bridge')) {
        specificCounts.Crown += 1;
      }
      if (nameLower.includes('filling') || nameLower.includes('composite') || nameLower.includes('restoration')) {
        specificCounts.Filling += 1;
      }
      if (nameLower.includes('extraction') || nameLower.includes('removal')) {
        specificCounts.Extraction += 1;
      }
      if (nameLower.includes('implant')) {
        specificCounts.Implant += 1;
      }

      if (!treatmentMap[name]) {
        treatmentMap[name] = { treatment: name, count: 0, estimatedRevenue: 0 };
      }
      treatmentMap[name].count += 1;
      treatmentMap[name].estimatedRevenue += p.estimatedCost || 0;
    });

    const rankedTreatments = Object.values(treatmentMap).sort((a, b) => b.count - a.count);

    return res.json({
      dateFrom: start,
      dateTo: end,
      specificCounts,
      rankedTreatments,
      totalTreatmentsPlanned: plans.length,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/doctor-analytics?doctorId=&dateFrom=&dateTo=
async function getDoctorAnalytics(req, res, next) {
  try {
    const { doctorId, dateFrom, dateTo } = req.query;
    const { start, end } = parseDateRange(dateFrom, dateTo);

    const doctorFilter = { role: 'doctor' };
    if (doctorId) {
      doctorFilter._id = doctorId;
    }

    const doctors = await User.find(doctorFilter).select('name email specialization role');

    const doctorAnalyticsList = await Promise.all(
      doctors.map(async (doc) => {
        const docId = doc._id;

        // Consultations count
        const consultationsCount = await Consultation.countDocuments({
          doctor: docId,
          createdAt: { $gte: start, $lte: end },
        });

        // Unique patients handled
        const uniquePatients = await Consultation.distinct('patient', {
          doctor: docId,
          createdAt: { $gte: start, $lte: end },
        });

        // Treatments recorded by doctor
        const treatmentsCount = await TreatmentPlan.countDocuments({
          recordedBy: docId,
          createdAt: { $gte: start, $lte: end },
        });

        // Follow-ups assigned to doctor
        const followUpsCount = await FollowUp.countDocuments({
          doctor: docId,
          createdAt: { $gte: start, $lte: end },
        });

        return {
          doctorId: docId,
          doctorName: doc.name,
          specialization: doc.specialization || 'General Dentistry',
          email: doc.email,
          patientsHandled: uniquePatients.length,
          consultationsCount,
          treatmentsCount,
          followUpsCount,
        };
      })
    );

    return res.json({
      dateFrom: start,
      dateTo: end,
      doctors: doctorAnalyticsList,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/admin-overview (Admin Overview Dashboard Stats)
async function getAdminOverview(req, res, next) {
  try {
    const { start: startToday, end: endToday } = getTodayDateRange();

    // 1. Today's Appointments across all doctors today
    const todaysAppointments = await Appointment.countDocuments({
      date: { $gte: startToday, $lte: endToday },
    });

    // 2. Active Patients: Defined as total registered patients in the clinic database
    const activePatients = await Patient.countDocuments();

    // 3. Revenue This Month: sum of Invoice.amountPaid for invoices created in current calendar month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthInvoices = await Invoice.find({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    });

    const revenueThisMonth = monthInvoices.reduce((acc, inv) => acc + (inv.amountPaid || 0), 0);

    // 4. Doctors On Duty: Count of active doctor staff accounts in system.
    // Tradeoff note: We count active doctor accounts (status !== 'inactive').
    const doctorsOnDuty = await User.countDocuments({
      role: 'doctor',
      status: { $ne: 'inactive' },
    });

    return res.json({
      todaysAppointments,
      activePatients,
      revenueThisMonth,
      doctorsOnDuty,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getReceptionSummary,
  getClinicPerformance,
  getFinancialReport,
  getTreatmentAnalytics,
  getDoctorAnalytics,
  getAdminOverview,
};
