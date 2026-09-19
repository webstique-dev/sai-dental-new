const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const QueueEntry = require('../models/QueueEntry');
const Patient = require('../models/Patient');
const FollowUp = require('../models/FollowUp');
const Consultation = require('../models/Consultation');
const Invoice = require('../models/Invoice');
const TreatmentPlan = require('../models/TreatmentPlan');
const User = require('../models/User');

function normalizePaymentMethod(methodStr) {
  if (!methodStr) return 'Cash';
  const m = String(methodStr).toUpperCase();
  if (m.includes('UPI') || m.includes('QR') || m.includes('GPAY') || m.includes('PHONEPE') || m.includes('PAYTM')) return 'UPI';
  if (m.includes('CARD') || m.includes('DEBIT') || m.includes('CREDIT') || m.includes('POS')) return 'Card';
  if (m.includes('CASH')) return 'Cash';
  if (m.includes('BANK') || m.includes('NEFT') || m.includes('RTGS') || m.includes('TRANSFER')) return 'Bank Transfer';
  return 'Other';
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

function getTodayDateRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Resolves the doctor ID scope based on authenticated user session and role.
 * - If authenticated as a Doctor: STRICTLY forces filtering by the doctor's own _id.
 * - If Admin / Superadmin / Receptionist: Allows filtering by query parameter doctorId if provided.
 */
function resolveDoctorScope(req) {
  if (req.user && req.user.role === 'doctor') {
    return req.user._id ? req.user._id.toString() : req.user.id;
  }
  if (req.query && req.query.doctorId) {
    return req.query.doctorId.toString();
  }
  return null;
}

// GET /api/reports/reception-summary?dateFrom=&dateTo=&doctorId=
async function getReceptionSummary(req, res, next) {
  try {
    const { dateFrom, dateTo } = req.query;
    const effectiveDoctorId = resolveDoctorScope(req);

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

    const aptFilter = { date: { $gte: start, $lte: end } };
    if (effectiveDoctorId) {
      aptFilter.doctor = effectiveDoctorId;
    }

    // 1. Appointment Summary
    const scheduled = await Appointment.countDocuments({
      ...aptFilter,
      status: 'Scheduled',
    });
    const checkedIn = await Appointment.countDocuments({
      ...aptFilter,
      status: { $in: ['Checked In', 'Checked-In'] },
    });
    const inConsultation = await Appointment.countDocuments({
      ...aptFilter,
      status: 'In Consultation',
    });
    const completed = await Appointment.countDocuments({
      ...aptFilter,
      status: 'Completed',
    });
    const cancelled = await Appointment.countDocuments({
      ...aptFilter,
      status: 'Cancelled',
    });
    const noShow = await Appointment.countDocuments({
      ...aptFilter,
      status: { $in: ['No-Show', 'No Show', 'Missed'] },
    });

    const appointmentSummary = {
      scheduled,
      checkedIn,
      inConsultation,
      completed,
      cancelled,
      noShow,
    };

    // 2. Intake Breakdown
    const walkInAppts = await Appointment.countDocuments({
      ...aptFilter,
      type: { $in: ['Walk-In', 'Walk-in', 'walk_in'] },
    });

    let walkInQueue = 0;
    if (effectiveDoctorId) {
      walkInQueue = await QueueEntry.countDocuments({
        doctor: effectiveDoctorId,
        date: { $gte: start, $lte: end },
        type: { $in: ['Walk-in', 'walk_in', 'Walk In', 'Walk-In'] },
      });
    } else {
      walkInQueue = await QueueEntry.countDocuments({
        date: { $gte: start, $lte: end },
        type: { $in: ['Walk-in', 'walk_in', 'Walk In', 'Walk-In'] },
      });
    }
    const totalWalkIns = Math.max(walkInAppts, walkInQueue);

    const totalPhoneBookings = await Appointment.countDocuments({
      ...aptFilter,
      type: { $in: ['Phone Booking', 'Appointment', 'appointment'] },
    });

    const totalOnlineBookings = await Appointment.countDocuments({
      ...aptFilter,
      type: 'Online Booking',
    });

    const queueSummary = {
      totalWalkIns,
      totalPhoneBookings,
      totalOnlineBookings,
      totalAppointmentVisits: totalWalkIns + totalPhoneBookings + totalOnlineBookings,
    };

    // 3. Payments Collected in Range
    const invoiceQuery = {
      $or: [
        { 'payments.date': { $gte: start, $lte: end } },
        { createdAt: { $gte: start, $lte: end } },
      ],
    };
    if (effectiveDoctorId) {
      invoiceQuery.doctor = effectiveDoctorId;
    }

    const invoices = await Invoice.find(invoiceQuery);

    let totalAmount = 0;
    let totalInvoicedPeriod = 0;
    let totalDiscountPeriod = 0;
    const byMethod = {
      Cash: 0,
      Card: 0,
      UPI: 0,
      'Bank Transfer': 0,
      Other: 0,
    };

    invoices.forEach((inv) => {
      if (inv.createdAt >= start && inv.createdAt <= end) {
        totalInvoicedPeriod += inv.total || 0;
        totalDiscountPeriod += inv.discount || 0;
      }

      (inv.payments || []).forEach((p) => {
        const pDate = p.date ? new Date(p.date) : inv.createdAt;
        if (pDate >= start && pDate <= end && p.type !== 'refund') {
          const amt = Number(p.amount) || 0;
          totalAmount += amt;
          const methodKey = normalizePaymentMethod(p.method);
          byMethod[methodKey] = (byMethod[methodKey] || 0) + amt;
        }
      });
    });

    const paymentsCollected = {
      totalAmount,
      totalInvoiced: totalInvoicedPeriod,
      totalDiscount: totalDiscountPeriod,
      byMethod,
    };

    // 4. Pending Payments
    const pendingQuery = {
      paymentStatus: { $in: ['Pending', 'Partially Paid'] },
      balance: { $gt: 0 },
    };
    if (effectiveDoctorId) {
      pendingQuery.doctor = effectiveDoctorId;
    }

    const pendingInvoices = await Invoice.find(pendingQuery);
    const totalOutstanding = pendingInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);

    const pendingPayments = {
      count: pendingInvoices.length,
      totalOutstanding,
    };

    // 5. Follow-Up Compliance
    const followUpQuery = {
      recommendedDate: { $gte: start, $lte: end },
    };
    if (effectiveDoctorId) {
      followUpQuery.doctor = effectiveDoctorId;
    }

    const due = await FollowUp.countDocuments({
      ...followUpQuery,
      status: 'Pending',
    });
    const scheduledFollowUps = await FollowUp.countDocuments({
      ...followUpQuery,
      status: 'Scheduled',
    });
    const completedFollowUps = await FollowUp.countDocuments({
      ...followUpQuery,
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
      doctorId: effectiveDoctorId,
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

// GET /api/reports/clinic-performance?dateFrom=&dateTo=&doctorId=
async function getClinicPerformance(req, res, next) {
  try {
    const { dateFrom, dateTo } = req.query;
    const { start, end } = parseDateRange(dateFrom, dateTo);
    const effectiveDoctorId = resolveDoctorScope(req);

    let totalPatients = 0;
    let newPatients = 0;
    let returningPatients = 0;

    if (effectiveDoctorId) {
      const docPatientIds = await Consultation.distinct('patient', { doctor: effectiveDoctorId });
      totalPatients = docPatientIds.length;

      // Patients whose FIRST consultation with this doctor fell within [start, end]
      const priorPatientIds = await Consultation.distinct('patient', {
        doctor: effectiveDoctorId,
        createdAt: { $lt: start },
      });
      const priorSet = new Set(priorPatientIds.map((id) => (id ? id.toString() : '')));

      const periodPatientIds = await Consultation.distinct('patient', {
        doctor: effectiveDoctorId,
        createdAt: { $gte: start, $lte: end },
      });
      newPatients = periodPatientIds.filter((id) => id && !priorSet.has(id.toString())).length;

      // Returning patients for this doctor (>1 consultation with this doctor)
      const docObjId = mongoose.Types.ObjectId.isValid(effectiveDoctorId)
        ? new mongoose.Types.ObjectId(effectiveDoctorId)
        : effectiveDoctorId;

      const returningAgg = await Consultation.aggregate([
        { $match: { doctor: docObjId } },
        { $group: { _id: '$patient', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $count: 'returningCount' },
      ]);
      returningPatients = returningAgg[0]?.returningCount || 0;
    } else {
      totalPatients = await Patient.countDocuments();
      newPatients = await Patient.countDocuments({
        createdAt: { $gte: start, $lte: end },
      });

      const returningAgg = await Consultation.aggregate([
        { $group: { _id: '$patient', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $count: 'returningCount' },
      ]);
      returningPatients = returningAgg[0]?.returningCount || 0;
    }

    const aptFilter = { date: { $gte: start, $lte: end } };
    const consultFilter = { createdAt: { $gte: start, $lte: end } };
    if (effectiveDoctorId) {
      aptFilter.doctor = effectiveDoctorId;
      consultFilter.doctor = effectiveDoctorId;
    }

    const appointments = await Appointment.countDocuments(aptFilter);

    const completedConsultations = await Consultation.countDocuments({
      ...consultFilter,
      status: 'Completed',
    });

    const inProgressConsultations = await Consultation.countDocuments({
      ...consultFilter,
      status: 'In Progress',
    });

    const cancelledAppointments = await Appointment.countDocuments({
      ...aptFilter,
      status: 'Cancelled',
    });

    const noShows = await Appointment.countDocuments({
      ...aptFilter,
      status: { $in: ['No-Show', 'No Show', 'Missed'] },
    });

    // Timing Analytics: Average consultation duration & average patient wait time
    const consultationsWithTimings = await Consultation.find({
      ...consultFilter,
      startedAt: { $exists: true, $ne: null },
    }).populate('queueEntry');

    let totalDurationMs = 0;
    let durationCount = 0;
    let totalWaitMs = 0;
    let waitCount = 0;

    consultationsWithTimings.forEach((c) => {
      if (c.startedAt && c.closedAt) {
        const dur = new Date(c.closedAt) - new Date(c.startedAt);
        if (dur > 0 && dur < 24 * 60 * 60 * 1000) {
          totalDurationMs += dur;
          durationCount += 1;
        }
      }

      const checkIn = c.checkInTime || c.queueEntry?.checkInTime || c.queueEntry?.checked_in_at || c.createdAt;
      if (c.startedAt && checkIn) {
        const wait = new Date(c.startedAt) - new Date(checkIn);
        if (wait > 0 && wait < 24 * 60 * 60 * 1000) {
          totalWaitMs += wait;
          waitCount += 1;
        }
      }
    });

    const avgConsultationMinutes = durationCount > 0 ? Math.round(totalDurationMs / durationCount / 60000) : 0;
    const avgWaitMinutes = waitCount > 0 ? Math.round(totalWaitMs / waitCount / 60000) : 0;

    // Intake breakdown
    const walkIns = await Appointment.countDocuments({
      ...aptFilter,
      type: { $in: ['Walk-In', 'Walk-in', 'walk_in'] },
    });
    const phoneBookings = await Appointment.countDocuments({
      ...aptFilter,
      type: { $in: ['Phone Booking', 'Appointment', 'appointment'] },
    });
    const onlineBookings = await Appointment.countDocuments({
      ...aptFilter,
      type: 'Online Booking',
    });

    return res.json({
      dateFrom: start,
      dateTo: end,
      doctorId: effectiveDoctorId,
      totalPatients,
      newPatients,
      returningPatients,
      appointments,
      completedConsultations,
      inProgressConsultations,
      cancelledAppointments,
      noShows,
      avgConsultationMinutes,
      avgWaitMinutes,
      intakeChannels: {
        walkIns,
        phoneBookings,
        onlineBookings,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/financial?dateFrom=&dateTo=&doctorId=
async function getFinancialReport(req, res, next) {
  try {
    const { dateFrom, dateTo } = req.query;
    const { start, end } = parseDateRange(dateFrom, dateTo);
    const effectiveDoctorId = resolveDoctorScope(req);

    const invoiceFilter = {
      createdAt: { $gte: start, $lte: end },
    };
    if (effectiveDoctorId) {
      invoiceFilter.doctor = effectiveDoctorId;
    }

    const invoices = await Invoice.find(invoiceFilter)
      .populate('patient', 'firstName lastName opNumber phone')
      .populate('doctor', 'name specialization')
      .sort({ createdAt: -1 });

    let grossSubtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let totalInvoiced = 0;
    let totalRevenue = 0;
    let pendingPaymentsTotal = 0;

    let paidCount = 0;
    let partiallyPaidCount = 0;
    let pendingCount = 0;

    const paymentMethodBreakdown = {
      Cash: 0,
      UPI: 0,
      Card: 0,
      'Bank Transfer': 0,
      Other: 0,
    };

    const dailyRevenueMap = {};
    const pendingInvoicesList = [];

    invoices.forEach((inv) => {
      const invTotal = inv.total || 0;
      const invPaid = inv.amountPaid || 0;
      const invBalance = inv.balance || 0;
      const invDiscount = inv.discount || 0;
      const invTax = inv.tax || 0;

      totalInvoiced += invTotal;
      totalRevenue += invPaid;
      pendingPaymentsTotal += invBalance;
      totalDiscount += invDiscount;
      totalTax += invTax;

      // Calculate gross subtotal from items
      const sub = (inv.items || []).reduce((s, it) => s + (it.quantity || 1) * (it.unitPrice || 0), 0);
      grossSubtotal += sub || (invTotal + invDiscount - invTax);

      // Payment status counts
      if (inv.paymentStatus === 'Paid') paidCount += 1;
      else if (inv.paymentStatus === 'Partially Paid') partiallyPaidCount += 1;
      else pendingCount += 1;

      // Pending invoices list
      if (invBalance > 0) {
        pendingInvoicesList.push({
          id: inv._id,
          opNumber: inv.opNumber || inv.patient?.opNumber || '—',
          patientName: inv.patient ? `${inv.patient.firstName || ''} ${inv.patient.lastName || ''}`.trim() : 'Patient',
          doctorName: inv.doctor?.name ? `Dr. ${inv.doctor.name}` : 'Clinic Doctor',
          total: invTotal,
          amountPaid: invPaid,
          balance: invBalance,
          date: inv.createdAt,
          paymentStatus: inv.paymentStatus || 'Pending',
        });
      }

      // Payments method breakdown
      (inv.payments || []).forEach((p) => {
        const method = normalizePaymentMethod(p.method);
        if (paymentMethodBreakdown[method] !== undefined) {
          paymentMethodBreakdown[method] += p.amount || 0;
        } else {
          paymentMethodBreakdown.Other += p.amount || 0;
        }
      });

      // Daily revenue accumulation
      const dateKey = new Date(inv.createdAt).toISOString().split('T')[0];
      if (!dailyRevenueMap[dateKey]) {
        dailyRevenueMap[dateKey] = {
          date: dateKey,
          invoiced: 0,
          collected: 0,
          invoiceCount: 0,
        };
      }
      dailyRevenueMap[dateKey].invoiced += invTotal;
      dailyRevenueMap[dateKey].collected += invPaid;
      dailyRevenueMap[dateKey].invoiceCount += 1;
    });

    const dailyRevenue = Object.values(dailyRevenueMap).sort((a, b) => (a.date > b.date ? 1 : -1));

    return res.json({
      dateFrom: start,
      dateTo: end,
      doctorId: effectiveDoctorId,
      totalInvoiced,
      grossSubtotal,
      totalDiscount,
      totalTax,
      totalRevenue,
      pendingPaymentsTotal,
      invoiceCounts: {
        total: invoices.length,
        paid: paidCount,
        partiallyPaid: partiallyPaidCount,
        pending: pendingCount,
      },
      paymentMethodBreakdown,
      dailyRevenue,
      pendingInvoicesList: pendingInvoicesList.slice(0, 50),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/treatment-analytics?dateFrom=&dateTo=&doctorId=
async function getTreatmentAnalytics(req, res, next) {
  try {
    const { dateFrom, dateTo } = req.query;
    const { start, end } = parseDateRange(dateFrom, dateTo);
    const effectiveDoctorId = resolveDoctorScope(req);

    const planFilter = { createdAt: { $gte: start, $lte: end } };
    const invFilter = { createdAt: { $gte: start, $lte: end } };
    if (effectiveDoctorId) {
      planFilter.recordedBy = effectiveDoctorId;
      invFilter.doctor = effectiveDoctorId;
    }

    const [plans, invoices] = await Promise.all([
      TreatmentPlan.find(planFilter),
      Invoice.find(invFilter),
    ]);

    const specificCounts = {
      RCT: 0,
      Crown: 0,
      Filling: 0,
      Extraction: 0,
      Implant: 0,
      Cleaning: 0,
    };

    const treatmentMap = {};

    // 1. Process Treatment Plans
    plans.forEach((p) => {
      const name = p.treatment || 'General';
      const nameLower = name.toLowerCase();

      if (nameLower.includes('rct') || nameLower.includes('root canal')) specificCounts.RCT += 1;
      if (nameLower.includes('crown') || nameLower.includes('bridge') || nameLower.includes('cap')) specificCounts.Crown += 1;
      if (nameLower.includes('filling') || nameLower.includes('composite') || nameLower.includes('restoration')) specificCounts.Filling += 1;
      if (nameLower.includes('extraction') || nameLower.includes('removal')) specificCounts.Extraction += 1;
      if (nameLower.includes('implant')) specificCounts.Implant += 1;
      if (nameLower.includes('clean') || nameLower.includes('scaling') || nameLower.includes('polishing')) specificCounts.Cleaning += 1;

      if (!treatmentMap[name]) {
        treatmentMap[name] = { treatment: name, count: 0, totalRevenue: 0 };
      }
      treatmentMap[name].count += 1;
      treatmentMap[name].totalRevenue += p.estimatedCost || 0;
    });

    // 2. Process Performed Procedures from Invoices
    invoices.forEach((inv) => {
      (inv.items || []).forEach((it) => {
        const name = it.service || it.treatment || 'Dental Procedure';
        const nameLower = name.toLowerCase();

        if (nameLower.includes('rct') || nameLower.includes('root canal')) specificCounts.RCT += (it.quantity || 1);
        if (nameLower.includes('crown') || nameLower.includes('bridge') || nameLower.includes('cap')) specificCounts.Crown += (it.quantity || 1);
        if (nameLower.includes('filling') || nameLower.includes('composite') || nameLower.includes('restoration')) specificCounts.Filling += (it.quantity || 1);
        if (nameLower.includes('extraction') || nameLower.includes('removal')) specificCounts.Extraction += (it.quantity || 1);
        if (nameLower.includes('implant')) specificCounts.Implant += (it.quantity || 1);
        if (nameLower.includes('clean') || nameLower.includes('scaling') || nameLower.includes('polishing')) specificCounts.Cleaning += (it.quantity || 1);

        if (!treatmentMap[name]) {
          treatmentMap[name] = { treatment: name, count: 0, totalRevenue: 0 };
        }
        const qty = it.quantity || 1;
        const lineTotal = qty * (it.unitPrice || 0);
        treatmentMap[name].count += qty;
        treatmentMap[name].totalRevenue += lineTotal;
      });
    });

    const rankedTreatments = Object.values(treatmentMap).sort((a, b) => b.count - a.count);

    return res.json({
      dateFrom: start,
      dateTo: end,
      doctorId: effectiveDoctorId,
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
    const { dateFrom, dateTo } = req.query;
    const { start, end } = parseDateRange(dateFrom, dateTo);
    const effectiveDoctorId = resolveDoctorScope(req);

    const doctorFilter = { role: 'doctor' };
    if (effectiveDoctorId) {
      doctorFilter._id = effectiveDoctorId;
    }

    const doctors = await User.find(doctorFilter).select('name email specialization role');

    const doctorAnalyticsList = await Promise.all(
      doctors.map(async (doc) => {
        const docId = doc._id;

        // Consultations count & timing
        const consultations = await Consultation.find({
          doctor: docId,
          createdAt: { $gte: start, $lte: end },
        });

        const consultationsCount = consultations.length;
        const completedConsultations = consultations.filter((c) => c.status === 'Completed').length;

        let totalDurationMs = 0;
        let durCount = 0;
        consultations.forEach((c) => {
          if (c.startedAt && c.closedAt) {
            const dur = new Date(c.closedAt) - new Date(c.startedAt);
            if (dur > 0 && dur < 24 * 60 * 60 * 1000) {
              totalDurationMs += dur;
              durCount += 1;
            }
          }
        });
        const avgConsultationMinutes = durCount > 0 ? Math.round(totalDurationMs / durCount / 60000) : 0;

        // Unique patients handled
        const uniquePatients = await Consultation.distinct('patient', {
          doctor: docId,
          createdAt: { $gte: start, $lte: end },
        });

        // Invoices & Revenue generated by doctor
        const doctorInvoices = await Invoice.find({
          doctor: docId,
          createdAt: { $gte: start, $lte: end },
        });
        const revenueGenerated = doctorInvoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
        const billedAmount = doctorInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

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
          completedConsultations,
          avgConsultationMinutes,
          revenueGenerated,
          billedAmount,
          treatmentsCount,
          followUpsCount,
        };
      })
    );

    return res.json({
      dateFrom: start,
      dateTo: end,
      doctorId: effectiveDoctorId,
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
    const effectiveDoctorId = resolveDoctorScope(req);

    const aptFilter = { date: { $gte: startToday, $lte: endToday } };
    if (effectiveDoctorId) {
      aptFilter.doctor = effectiveDoctorId;
    }

    const todaysAppointments = await Appointment.countDocuments(aptFilter);

    let activePatients = 0;
    if (effectiveDoctorId) {
      const pIds = await Consultation.distinct('patient', { doctor: effectiveDoctorId });
      activePatients = pIds.length;
    } else {
      activePatients = await Patient.countDocuments();
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthInvoiceFilter = {
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    };
    if (effectiveDoctorId) {
      monthInvoiceFilter.doctor = effectiveDoctorId;
    }

    const monthInvoices = await Invoice.find(monthInvoiceFilter);
    const revenueThisMonth = monthInvoices.reduce((acc, inv) => acc + (inv.amountPaid || 0), 0);

    const doctorsOnDuty = effectiveDoctorId ? 1 : await User.countDocuments({
      role: 'doctor',
      status: { $ne: 'inactive' },
    });

    return res.json({
      todaysAppointments,
      activePatients,
      revenueThisMonth,
      doctorsOnDuty,
      doctorId: effectiveDoctorId,
    });
  } catch (err) {
    next(err);
  }
}


// GET /api/reports/appointments?dateFrom=&dateTo=&doctorId=&status=
async function getAppointmentsReport(req, res, next) {
  try {
    const { dateFrom, dateTo, status } = req.query;
    const { start, end } = parseDateRange(dateFrom, dateTo);
    const effectiveDoctorId = resolveDoctorScope(req);

    const aptFilter = {
      $or: [
        { date: { $gte: start, $lte: end } },
        { createdAt: { $gte: start, $lte: end } },
      ],
    };
    if (effectiveDoctorId) {
      aptFilter.doctor = effectiveDoctorId;
    }
    if (status) {
      aptFilter.status = status;
    }

    const [appointments, consultations, queueEntries] = await Promise.all([
      Appointment.find(aptFilter)
        .populate('patient', 'firstName lastName opNumber primaryPhone phone age sex patientType')
        .populate('doctor', 'name specialization')
        .sort({ date: -1, createdAt: -1 }),
      Consultation.find({
        $or: [
          { visitDate: { $gte: start, $lte: end } },
          { createdAt: { $gte: start, $lte: end } },
        ],
      }),
      QueueEntry.find({
        date: { $gte: start, $lte: end },
      }),
    ]);

    const consultByAptId = new Map();
    consultations.forEach((c) => {
      const aId = c.appointment?._id || c.appointment?.id || c.appointment;
      if (aId) consultByAptId.set(aId.toString(), c);
    });

    const queueByAptId = new Map();
    queueEntries.forEach((q) => {
      const aId = q.appointment?._id || q.appointment?.id || q.appointment;
      if (aId) queueByAptId.set(aId.toString(), q);
    });

    let scheduledCount = 0;
    let checkedInCount = 0;
    let inConsultationCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let noShowCount = 0;

    const mappedAppointments = appointments.map((apt) => {
      const aptIdStr = apt._id.toString();
      const consult = consultByAptId.get(aptIdStr);
      const queueEntry = queueByAptId.get(aptIdStr);

      const st = apt.status || 'Scheduled';
      if (st === 'Scheduled') scheduledCount++;
      else if (st === 'Checked-In' || st === 'Checked In') checkedInCount++;
      else if (st === 'In Consultation') inConsultationCount++;
      else if (st === 'Completed') completedCount++;
      else if (st === 'Cancelled') cancelledCount++;
      else if (st === 'No Show' || st === 'No-Show' || st === 'Missed') noShowCount++;

      const checkIn = consult?.checkInTime || queueEntry?.checkInTime || queueEntry?.checked_in_at || (st === 'Checked-In' || st === 'In Consultation' || st === 'Completed' ? apt.createdAt : null);
      const startTime = consult?.startedAt || (st === 'In Consultation' || st === 'Completed' ? apt.createdAt : null);
      const endTime = consult?.closedAt || (st === 'Completed' ? consult?.updatedAt || apt.updatedAt : null);

      return {
        id: apt._id,
        patientName: apt.patient ? `${apt.patient.firstName || ''} ${apt.patient.lastName || ''}`.trim() : 'Patient',
        opNumber: apt.patient?.opNumber || '—',
        phone: apt.patient?.primaryPhone || apt.patient?.phone || '—',
        patientType: apt.patient?.patientType || (apt.patient?.age !== undefined && Number(apt.patient.age) < 12 ? 'child' : 'adult'),
        doctorName: apt.doctor?.name ? `Dr. ${apt.doctor.name}` : 'Clinic Doctor',
        date: apt.date || apt.createdAt,
        time: apt.time || '—',
        reason: apt.reason || apt.type || 'General Dental Visit',
        type: apt.type || 'Appointment',
        status: st,
        checkInTime: checkIn,
        startTime: startTime,
        endTime: endTime,
      };
    });

    return res.json({
      dateFrom: start,
      dateTo: end,
      doctorId: effectiveDoctorId,
      totalCount: appointments.length,
      scheduledCount,
      checkedInCount,
      inConsultationCount,
      completedCount,
      cancelledCount,
      noShowCount,
      appointments: mappedAppointments,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/follow-ups?dateFrom=&dateTo=&doctorId=&status=
async function getFollowUpsReport(req, res, next) {
  try {
    const { dateFrom, dateTo, status } = req.query;
    const { start, end } = parseDateRange(dateFrom, dateTo);
    const effectiveDoctorId = resolveDoctorScope(req);

    const followUpFilter = {
      $or: [
        { recommendedDate: { $gte: start, $lte: end } },
        { createdAt: { $gte: start, $lte: end } },
      ],
    };
    if (effectiveDoctorId) {
      followUpFilter.doctor = effectiveDoctorId;
    }
    if (status) {
      followUpFilter.status = status;
    }

    const followUps = await FollowUp.find(followUpFilter)
      .populate('patient', 'firstName lastName opNumber primaryPhone phone age sex patientType')
      .populate('doctor', 'name specialization')
      .populate('scheduledAppointment', 'date time status type')
      .populate('consultation', 'visitDate startedAt reason')
      .sort({ recommendedDate: 1, createdAt: -1 });

    let pendingCount = 0;
    let scheduledCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let missedCount = 0;

    const mappedFollowUps = followUps.map((f) => {
      const st = f.status || 'Pending';
      if (st === 'Pending') pendingCount++;
      else if (st === 'Scheduled') scheduledCount++;
      else if (st === 'Completed') completedCount++;
      else if (st === 'Cancelled') cancelledCount++;
      else if (st === 'No Show' || st === 'Missed' || st === 'No-Show') missedCount++;

      return {
        id: f._id,
        patientName: f.patient ? `${f.patient.firstName || ''} ${f.patient.lastName || ''}`.trim() : 'Patient',
        opNumber: f.patient?.opNumber || '—',
        phone: f.patient?.primaryPhone || f.patient?.phone || '—',
        doctorName: f.doctor?.name ? `Dr. ${f.doctor.name}` : 'Clinic Doctor',
        date: f.recommendedDate || f.createdAt,
        time: f.scheduledAppointment?.time || '—',
        reason: f.reason || 'Follow-Up Review',
        treatmentStatus: f.treatmentStatus || 'Ongoing / Under Review',
        instructions: f.instructions || f.notes || '—',
        status: st,
        scheduledAppointmentDate: f.scheduledAppointment?.date || null,
        scheduledAppointmentStatus: f.scheduledAppointment?.status || null,
      };
    });

    return res.json({
      dateFrom: start,
      dateTo: end,
      doctorId: effectiveDoctorId,
      totalCount: followUps.length,
      pendingCount,
      scheduledCount,
      completedCount,
      cancelledCount,
      missedCount,
      followUps: mappedFollowUps,
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
  getAppointmentsReport,
  getFollowUpsReport,
};



