const Consultation = require('../models/Consultation');
const QueueEntry = require('../models/QueueEntry');
const Appointment = require('../models/Appointment');
const FollowUp = require('../models/FollowUp');
const { logAction } = require('../middleware/auditLog');
const { syncVisitStatus } = require('../utils/statusSync');
const { getDayBounds } = require('./appointmentController');
const { updateConsultationTotals } = require('../utils/consultationTotalsSync');
const { emitConsultationUpdate, emitQueueUpdate, emitAppointmentUpdate } = require('../utils/socket');
const { buildPatientSearchFilter } = require('../utils/patientSearchHelper');

// Immutability Guard Helper: Rejects write actions on closed consultations with HTTP 403
async function checkConsultationNotClosed(consultationId) {
  if (!consultationId) return;
  const consultation = await Consultation.findById(consultationId);
  if (consultation && consultation.status === 'Completed') {
    const err = new Error('This consultation has been closed and cannot be modified. Reopening closed consultations is not supported.');
    err.status = 403;
    throw err;
  }
}

// GET /api/consultations?patient=&doctor=&dateFrom=&dateTo=&search=
async function listConsultations(req, res, next) {
  try {
    const { patient, doctor, dateFrom, dateTo, search } = req.query;
    const filter = {};

    if (patient) filter.patient = patient;
    if (doctor) filter.doctor = doctor;

    if (dateFrom || dateTo) {
      filter.$or = [
        { startedAt: {} },
        { createdAt: {} },
      ];
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        filter.$or[0].startedAt.$gte = fromDate;
        filter.$or[1].createdAt.$gte = fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        filter.$or[0].startedAt.$lte = toDate;
        filter.$or[1].createdAt.$lte = toDate;
      }
    }

    const patientSearchFilter = buildPatientSearchFilter(search);
    if (patientSearchFilter) {
      const Patient = require('../models/Patient');
      const matchingPatients = await Patient.find({
        ...patientSearchFilter,
        isDeleted: { $ne: true },
      }).select('_id');
      const patientIds = matchingPatients.map((p) => p._id);
      filter.patient = { $in: patientIds };
    }

    const rawConsultations = await Consultation.find(filter)
      .sort({ startedAt: -1, createdAt: -1 })
      .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex dateOfBirth occupation address medicalHistory currentMedications vitals habits dentalHistory')
      .populate('doctor', 'name email specialization role')
      .populate('queueEntry')
      .populate('appointment');

    const Examination = require('../models/Examination');
    const Diagnosis = require('../models/Diagnosis');
    const TreatmentPlan = require('../models/TreatmentPlan');
    const TreatmentRecord = require('../models/TreatmentRecord');
    const Prescription = require('../models/Prescription');

    const visits = await Promise.all(
      rawConsultations.map(async (c) => {
        const cId = c._id;
        const [exam, diagnoses, treatmentPlans, treatmentRecords, prescriptions] = await Promise.all([
          Examination.findOne({ consultation: cId }),
          Diagnosis.find({ consultation: cId, isDeleted: { $ne: true } }).sort({ createdAt: -1 }),
          TreatmentPlan.find({ consultation: cId, isDeleted: { $ne: true } }).sort({ createdAt: -1 }),
          TreatmentRecord.find({ consultation: cId, isDeleted: { $ne: true } }).sort({ createdAt: -1 }),
          Prescription.find({ consultation: cId, isDeleted: { $ne: true } }).sort({ createdAt: -1 }),
        ]);

        const checkIn = c.queueEntry?.checkInTime || c.queueEntry?.checked_in_at || c.startedAt || c.consultation_started_at || c.appointment?.createdAt || c.createdAt;
        const checkOut = c.closedAt || c.consultation_ended_at || c.completed_at || (c.status === 'Completed' ? c.updatedAt : null);
        const reason = c.appointment?.reason || c.queueEntry?.reason || (c.queueEntry?.type === 'Walk-in' ? 'Walk-in Consultation' : 'General Dental Visit');

        const totalEstimatedCharges = c.totalEstimatedCharges || (treatmentPlans || []).reduce((sum, p) => sum + (p.estimatedCost || 0), 0);
        const totalPerformedCharges = c.totalPerformedCharges || (treatmentRecords || []).reduce((sum, r) => sum + (r.charges || 0), 0);

        return {
          _id: c._id,
          id: c._id,
          patient: c.patient,
          doctor: c.doctor,
          appointment: c.appointment ? (c.appointment._id || c.appointment) : null,
          queueEntry: c.queueEntry ? (c.queueEntry._id || c.queueEntry) : null,
          visitDate: c.startedAt || c.consultation_started_at || c.createdAt,
          checkInTime: checkIn,
          checkOutTime: checkOut,
          startedAt: c.startedAt || c.consultation_started_at || c.createdAt,
          closedAt: checkOut,
          createdAt: c.createdAt,
          status: c.status || 'Completed',
          reason,
          notes: c.clinicalNotes || c.notes || '',
          totalEstimatedCharges,
          totalPerformedCharges,
          examination: exam,
          diagnoses: diagnoses || [],
          treatmentPlans: treatmentPlans || [],
          treatmentRecords: treatmentRecords || [],
          prescriptions: prescriptions || [],
        };
      })
    );

    return res.json({ consultations: visits, visits });
  } catch (err) {
    next(err);
  }
}

// GET /api/consultations/queue/today (Checked-In or In Consultation, doctor-scoped)
async function getDoctorTodayQueue(req, res, next) {
  try {
    const { start, end } = getDayBounds(new Date());

    // First ensure all checked-in appointments for today have an active QueueEntry
    const checkedInAppointments = await Appointment.find({
      date: { $gte: start, $lte: end },
      status: { $in: ['Checked-In', 'In Consultation'] },
    });

    const { getFormattedDateString } = require('../utils/statusSync');
    const queueDateStr = getFormattedDateString(new Date());

    for (const apt of checkedInAppointments) {
      let qEntry = await QueueEntry.findOne({ appointment: apt._id });
      if (!qEntry) {
        const lastEntry = await QueueEntry.findOne({ date: { $gte: start, $lte: end } }).sort({ token: -1 });
        const nextToken = lastEntry && (lastEntry.token || lastEntry.queue_token) ? (lastEntry.token || lastEntry.queue_token) + 1 : 1;
        qEntry = new QueueEntry({
          token: nextToken,
          queue_token: nextToken,
          patient: apt.patient,
          doctor: apt.doctor,
          appointment: apt._id,
          type: apt.type || 'Appointment',
          status: apt.status,
          checked_in_at: new Date(),
          checkInTime: new Date(),
          queue_date: queueDateStr,
          date: new Date(),
        });
        await qEntry.save();
      } else if (qEntry.status !== apt.status) {
        qEntry.status = apt.status;
        await qEntry.save();
      }
    }

    const filter = {
      date: { $gte: start, $lte: end },
      status: { $in: ['Checked-In', 'In Consultation', 'With Doctor'] },
    };

    // Doctor role sees only their own patients; Admin sees all
    if (req.user && req.user.role === 'doctor') {
      filter.doctor = req.user._id;
    }

    const queueEntries = await QueueEntry.find(filter)
      .sort({ token: 1 })
      .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex')
      .populate('doctor', 'name email role specialization')
      .populate('appointment', 'time reason status type');

    // Attach active consultation ID if already started
    const entriesWithConsultation = await Promise.all(
      queueEntries.map(async (entry) => {
        const activeConsultation = await Consultation.findOne({
          $or: [{ queueEntry: entry._id }, { appointment: entry.appointment }],
          status: 'In Progress',
        }).select('_id');

        const entryObj = entry.toObject();
        // Normalize status display
        if (entryObj.status === 'With Doctor') {
          entryObj.status = 'In Consultation';
        }
        entryObj.activeConsultationId = activeConsultation ? activeConsultation._id : null;
        return entryObj;
      })
    );

    return res.json({ queueEntries: entriesWithConsultation });
  } catch (err) {
    next(err);
  }
}

// POST /api/consultations/start (body: { queueEntryId })
async function startConsultation(req, res, next) {
  try {
    const { queueEntryId, appointmentId } = req.body;

    if (!queueEntryId && !appointmentId) {
      return res.status(400).json({ message: 'queueEntryId or appointmentId is required.' });
    }

    let queueEntry = null;
    if (queueEntryId) {
      queueEntry = await QueueEntry.findById(queueEntryId);
    } else if (appointmentId) {
      queueEntry = await QueueEntry.findOne({ appointment: appointmentId });
    }

    if (!queueEntry && appointmentId) {
      const apt = await Appointment.findById(appointmentId);
      if (apt) {
        const { start, end } = getDayBounds(new Date());
        const lastEntry = await QueueEntry.findOne({ date: { $gte: start, $lte: end } }).sort({ token: -1 });
        const nextToken = lastEntry && lastEntry.token ? lastEntry.token + 1 : 1;
        queueEntry = new QueueEntry({
          token: nextToken,
          patient: apt.patient,
          doctor: apt.doctor,
          appointment: apt._id,
          type: apt.type || 'Appointment',
          status: 'In Consultation',
          checkInTime: new Date(),
          date: new Date(),
        });
        await queueEntry.save();
      }
    }

    if (!queueEntry) {
      return res.status(404).json({ message: 'Queue entry not found.' });
    }

    // Check if consultation is already in progress for this queue entry
    let consultation = await Consultation.findOne({
      $or: [{ queueEntry: queueEntry._id }, { appointment: queueEntry.appointment }],
      status: 'In Progress',
    });

    if (!consultation) {
      consultation = new Consultation({
        patient: queueEntry.patient,
        doctor: req.user ? req.user._id : queueEntry.doctor,
        queueEntry: queueEntry._id,
        appointment: queueEntry.appointment || null,
        status: 'In Progress',
        startedAt: new Date(),
      });
      await consultation.save();
    }

    // Synchronize visit status to "In Consultation" across all models
    await syncVisitStatus({
      appointmentId: queueEntry.appointment,
      queueEntryId: queueEntry._id,
      consultationId: consultation._id,
      status: 'In Consultation',
    });

    const populated = await Consultation.findById(consultation._id)
      .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex dateOfBirth occupation address medicalHistory currentMedications vitals habits dentalHistory')
      .populate('doctor', 'name email role specialization')
      .populate('queueEntry')
      .populate('appointment');

    emitConsultationUpdate(populated, 'CONSULTATION_STARTED');

    return res.status(201).json({
      message: 'Consultation started successfully',
      consultation: populated,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/consultations/:id (full consultation detail)
async function getConsultationById(req, res, next) {
  try {
    const consultation = await Consultation.findById(req.params.id)
      .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex dateOfBirth occupation address medicalHistory currentMedications vitals habits dentalHistory')
      .populate('doctor', 'name email role specialization')
      .populate('queueEntry')
      .populate('appointment');

    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found.' });
    }

    return res.json({ consultation });
  } catch (err) {
    next(err);
  }
}

// POST /api/consultations/:id/close (Locks clinical records, generates pending invoice, creates follow-up appointment, marks visit Completed)
async function closeConsultation(req, res, next) {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found.' });
    }

    const { closeNotes, followUp } = req.body || {};
    let savedFollowUp = null;

    // 1. Recalculate & persist totals on Consultation
    await updateConsultationTotals(consultation._id);

    // 2. Handle optional Follow-Up payload & auto-create linked Appointment
    if (followUp && typeof followUp === 'object') {
      const { recommendedDate, time, reason, instructions, treatmentStatus, notes } = followUp;
      const Appointment = require('../models/Appointment');

      let existingFollowUp = await FollowUp.findOne({ consultation: consultation._id });

      if (existingFollowUp) {
        if (recommendedDate) existingFollowUp.recommendedDate = recommendedDate;
        if (reason !== undefined) existingFollowUp.reason = reason;
        if (instructions !== undefined) existingFollowUp.instructions = instructions;
        if (notes !== undefined) existingFollowUp.notes = notes;
        if (treatmentStatus !== undefined) existingFollowUp.treatmentStatus = treatmentStatus;

        if (recommendedDate) {
          let appt = null;
          if (existingFollowUp.scheduledAppointment) {
            appt = await Appointment.findById(existingFollowUp.scheduledAppointment);
          }
          if (!appt) {
            appt = new Appointment({
              patient: consultation.patient,
              doctor: consultation.doctor,
              date: recommendedDate,
              time: time || '10:00 AM',
              reason: reason || 'Follow-Up Consultation',
              type: 'Appointment',
              status: 'Scheduled',
              followUp: existingFollowUp._id,
              createdBy: req.user ? req.user._id : undefined,
            });
          } else {
            appt.date = recommendedDate;
            if (time) appt.time = time;
            appt.reason = reason || appt.reason || 'Follow-Up Consultation';
            appt.status = 'Scheduled';
          }
          await appt.save();
          existingFollowUp.scheduledAppointment = appt._id;
          existingFollowUp.status = 'Scheduled';
        }

        await existingFollowUp.save();
        savedFollowUp = existingFollowUp;
      } else {
        savedFollowUp = new FollowUp({
          patient: consultation.patient,
          doctor: consultation.doctor,
          consultation: consultation._id,
          recommendedDate: recommendedDate || null,
          reason: reason || 'Follow-up Visit',
          instructions: instructions || '',
          notes: notes || '',
          treatmentStatus: treatmentStatus || '',
          status: 'Scheduled',
          createdBy: req.user ? req.user._id : undefined,
        });
        await savedFollowUp.save();

        if (recommendedDate) {
          const newAppt = new Appointment({
            patient: consultation.patient,
            doctor: consultation.doctor,
            date: recommendedDate,
            time: time || '10:00 AM',
            reason: reason || 'Follow-Up Consultation',
            type: 'Appointment',
            status: 'Scheduled',
            followUp: savedFollowUp._id,
            createdBy: req.user ? req.user._id : undefined,
          });
          await newAppt.save();
          savedFollowUp.scheduledAppointment = newAppt._id;
          await savedFollowUp.save();
        }
      }

      savedFollowUp = await FollowUp.findById(savedFollowUp._id)
        .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex')
        .populate({
          path: 'scheduledAppointment',
          populate: { path: 'doctor', select: 'name specialization' },
        })
    } else {
      // If followUp payload is not supplied, preserve and load any previously scheduled follow-up
      savedFollowUp = await FollowUp.findOne({ consultation: consultation._id })
        .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex')
        .populate({
          path: 'scheduledAppointment',
          populate: { path: 'doctor', select: 'name specialization' },
        })
        .populate('createdBy', 'name email');
    }

    // 3. Lock & finalize consultation as Completed / Read-Only
    if (closeNotes) {
      consultation.clinicalNotes = closeNotes;
    }
    consultation.status = 'Completed';
    consultation.closedAt = new Date();
    consultation.consultation_ended_at = new Date();
    consultation.completed_at = new Date();
    await consultation.save();

    // 4. Generate Pending Bill (Invoice) itemized by procedure/tooth using Total Performed Charges
    const Invoice = require('../models/Invoice');
    const TreatmentRecord = require('../models/TreatmentRecord');
    const TreatmentPlan = require('../models/TreatmentPlan');
    const Patient = require('../models/Patient');

    let invoice = await Invoice.findOne({ consultation: consultation._id });

    if (!invoice) {
      const patientDoc = await Patient.findById(consultation.patient);
      const opNumber = patientDoc ? patientDoc.opNumber : '';

      const records = await TreatmentRecord.find({
        consultation: consultation._id,
        isDeleted: { $ne: true },
      });

      const completedPlans = await TreatmentPlan.find({
        consultation: consultation._id,
        status: 'Completed',
        isDeleted: { $ne: true },
      });

      let invoiceItems = [];
      if (records.length > 0) {
        invoiceItems = records.map((r) => ({
          service: r.procedure + (r.tooth ? ` (Tooth #${r.tooth})` : ''),
          treatment: r.procedure,
          quantity: 1,
          unitPrice: Number(r.charges) || 0,
        }));
      } else if (completedPlans.length > 0) {
        invoiceItems = completedPlans.map((p) => ({
          service: p.treatment + (p.tooth ? ` (Tooth #${p.tooth})` : ''),
          treatment: p.treatment,
          quantity: 1,
          unitPrice: Number(p.estimatedCost) || 0,
        }));
      } else {
        invoiceItems = [
          {
            service: 'General Dental Consultation',
            treatment: 'Consultation',
            quantity: 1,
            unitPrice: 0,
          },
        ];
      }

      invoice = new Invoice({
        patient: consultation.patient,
        doctor: consultation.doctor,
        consultation: consultation._id,
        appointment: consultation.appointment || null,
        opNumber,
        items: invoiceItems,
        paymentStatus: 'Pending',
        createdBy: req.user ? req.user._id : undefined,
      });
      await invoice.save();
    }

    // 5. Update patient's queue and appointment status to Completed
    await syncVisitStatus({
      consultationId: consultation._id,
      queueEntryId: consultation.queueEntry,
      appointmentId: consultation.appointment,
      status: 'Completed',
    });

    await logAction(req, {
      action: 'closed consultation',
      entityType: 'Consultation',
      entityId: consultation._id,
      patient: consultation.patient,
      newValue: {
        status: 'Completed',
        closedAt: consultation.closedAt,
        invoiceId: invoice._id,
        followUp: savedFollowUp ? savedFollowUp._id : null,
      },
    });

    emitConsultationUpdate(consultation, 'CONSULTATION_COMPLETED');
    if (consultation.appointment) {
      const apptDoc = await Appointment.findById(consultation.appointment).populate('patient doctor');
      if (apptDoc) emitAppointmentUpdate(apptDoc);
    }
    if (consultation.queueEntry) {
      const qDoc = await QueueEntry.findById(consultation.queueEntry).populate('patient doctor');
      if (qDoc) emitQueueUpdate(qDoc);
    }

    return res.json({
      message: 'Consultation closed successfully. Pending bill generated.',
      consultation,
      invoice,
      followUp: savedFollowUp,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/consultations/doctor-summary?doctorId=
async function getDoctorSummary(req, res, next) {
  try {
    let targetDoctorId = req.user ? req.user._id : null;
    if (req.user && req.user.role === 'admin' && req.query.doctorId) {
      targetDoctorId = req.query.doctorId;
    }

    const { start, end } = getDayBounds(new Date());

    // Ensure all checked-in/in-consultation appointments for today have an active QueueEntry before calculating counts
    const checkedInAppointments = await Appointment.find({
      date: { $gte: start, $lte: end },
      status: { $in: ['Checked-In', 'In Consultation'] },
    });

    const { getFormattedDateString } = require('../utils/statusSync');
    const queueDateStr = getFormattedDateString(new Date());

    for (const apt of checkedInAppointments) {
      let qEntry = await QueueEntry.findOne({ appointment: apt._id });
      if (!qEntry) {
        const lastEntry = await QueueEntry.findOne({ date: { $gte: start, $lte: end } }).sort({ token: -1 });
        const nextToken = lastEntry && (lastEntry.token || lastEntry.queue_token) ? (lastEntry.token || lastEntry.queue_token) + 1 : 1;
        qEntry = new QueueEntry({
          token: nextToken,
          queue_token: nextToken,
          patient: apt.patient,
          doctor: apt.doctor,
          appointment: apt._id,
          type: apt.type || 'Appointment',
          status: apt.status,
          checked_in_at: new Date(),
          checkInTime: new Date(),
          queue_date: queueDateStr,
          date: new Date(),
        });
        await qEntry.save();
      } else if (qEntry.status !== apt.status) {
        qEntry.status = apt.status;
        await qEntry.save();
      }
    }

    // 1. patientsInQueue: count of QueueEntry with status Checked-In or In Consultation, assigned to this doctor, for today
    const queueFilter = {
      date: { $gte: start, $lte: end },
      status: { $in: ['Checked-In', 'Checked In', 'Waiting', 'With Doctor', 'In Consultation'] },
    };
    if (targetDoctorId) {
      queueFilter.doctor = targetDoctorId;
    }
    const patientsInQueue = await QueueEntry.countDocuments(queueFilter);

    // 2. todaysConsultations: count of Consultation for this doctor with startedAt today (In Progress and Completed)
    const consultFilter = {
      startedAt: { $gte: start, $lte: end },
    };
    if (targetDoctorId) {
      consultFilter.doctor = targetDoctorId;
    }
    const todaysConsultations = await Consultation.countDocuments(consultFilter);

    // 3. activeTreatmentPlans: count of TreatmentPlan for this doctor's patients with status in [Planned, Approved, In Progress]
    const TreatmentPlan = require('../models/TreatmentPlan');
    const tpFilter = {
      status: { $in: ['Planned', 'Approved', 'In Progress'] },
    };
    if (targetDoctorId) {
      tpFilter.$or = [{ doctor: targetDoctorId }, { recordedBy: targetDoctorId }];
    }
    const activeTreatmentPlans = await TreatmentPlan.countDocuments(tpFilter);

    // 4. followUpsDue: count of FollowUp with status Pending, recommendedDate <= today
    const FollowUp = require('../models/FollowUp');
    const fuFilter = {
      status: 'Pending',
      recommendedDate: { $lte: end },
    };

    if (targetDoctorId) {
      const patientIdsForDoctor = await Consultation.distinct('patient', { doctor: targetDoctorId });
      fuFilter.$or = [
        { createdBy: targetDoctorId },
        { patient: { $in: patientIdsForDoctor } },
      ];
    }
    const followUpsDue = await FollowUp.countDocuments(fuFilter);

    // 5. todaysAppointments & upcomingAppointments
    const todaysApptFilter = {
      date: { $gte: start, $lte: end },
      isDeleted: { $ne: true },
    };
    if (targetDoctorId) {
      todaysApptFilter.doctor = targetDoctorId;
    }
    const todaysAppointments = await Appointment.countDocuments(todaysApptFilter);

    const upcomingApptFilter = {
      date: { $gt: end },
      isDeleted: { $ne: true },
    };
    if (targetDoctorId) {
      upcomingApptFilter.doctor = targetDoctorId;
    }
    const upcomingAppointments = await Appointment.countDocuments(upcomingApptFilter);

    // 6. nextInQueue: single next patient in this doctor's queue (lowest token number with status Checked-In today)
    const nextQueueEntry = await QueueEntry.findOne(queueFilter)
      .sort({ token: 1 })
      .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex');

    let nextInQueue = null;
    if (nextQueueEntry) {
      nextInQueue = {
        _id: nextQueueEntry._id,
        id: nextQueueEntry._id,
        token: nextQueueEntry.token,
        checkInTime: nextQueueEntry.checkInTime || nextQueueEntry.createdAt,
        patient: nextQueueEntry.patient
          ? {
              _id: nextQueueEntry.patient._id,
              id: nextQueueEntry.patient._id,
              firstName: nextQueueEntry.patient.firstName,
              lastName: nextQueueEntry.patient.lastName,
              opNumber: nextQueueEntry.patient.opNumber,
              age: nextQueueEntry.patient.age,
              sex: nextQueueEntry.patient.sex,
              primaryPhone: nextQueueEntry.patient.primaryPhone || nextQueueEntry.patient.phone || '',
              secondaryPhone: nextQueueEntry.patient.secondaryPhone || '',
              phone: nextQueueEntry.patient.primaryPhone || nextQueueEntry.patient.phone || '',
            }
          : null,
      };
    }

    return res.json({
      patientsInQueue,
      todaysConsultations,
      todaysAppointments,
      upcomingAppointments,
      activeTreatmentPlans,
      followUpsDue,
      nextInQueue,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/consultations/find-or-create (body: { patientId })
async function findOrCreateConsultation(req, res, next) {
  try {
    const { patientId } = req.body;
    if (!patientId) {
      return res.status(400).json({ message: 'patientId is required.' });
    }

    let consultation = await Consultation.findOne({
      patient: patientId,
      status: 'In Progress',
    })
      .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex dateOfBirth occupation address medicalHistory currentMedications vitals habits dentalHistory')
      .populate('doctor', 'name email role specialization');

    if (!consultation) {
      consultation = await Consultation.findOne({
        patient: patientId,
      })
        .sort({ createdAt: -1 })
        .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex dateOfBirth occupation address medicalHistory currentMedications vitals habits dentalHistory')
        .populate('doctor', 'name email role specialization');
    }

    if (!consultation) {
      const User = require('../models/User');
      let defaultDoctor = req.user ? req.user._id : null;
      if (!defaultDoctor) {
        const docUser = await User.findOne({ role: 'doctor' });
        if (docUser) defaultDoctor = docUser._id;
      }

      consultation = new Consultation({
        patient: patientId,
        doctor: defaultDoctor,
        status: 'In Progress',
        startedAt: new Date(),
      });
      await consultation.save();

      consultation = await Consultation.findById(consultation._id)
        .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex dateOfBirth occupation address medicalHistory currentMedications vitals habits dentalHistory')
        .populate('doctor', 'name email role specialization');
    }

    return res.json({ consultation });
  } catch (err) {
    next(err);
  }
}

// GET /api/consultations/:id/complete-summary or GET /api/consultations/summary/by-visit
async function getConsultationCompleteSummary(req, res, next) {
  try {
    const { id } = req.params;
    const { consultationId, appointmentId, queueId, patientId: queryPatientId } = req.query;

    const Diagnosis = require('../models/Diagnosis');
    const ToothRecord = require('../models/ToothRecord');
    const TreatmentRecord = require('../models/TreatmentRecord');
    const TreatmentPlan = require('../models/TreatmentPlan');
    const Prescription = require('../models/Prescription');
    const Patient = require('../models/Patient');

    let consultation = null;
    const searchId = id && id !== 'by-visit' ? id : consultationId;

    if (searchId) {
      consultation = await Consultation.findById(searchId)
        .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex dateOfBirth occupation address medicalHistory currentMedications vitals habits dentalHistory patientType')
        .populate('doctor', 'name email role specialization phone')
        .populate('queueEntry')
        .populate('appointment');
    }

    if (!consultation && (appointmentId || queueId)) {
      const filter = {};
      if (appointmentId) filter.appointment = appointmentId;
      if (queueId) filter.queueEntry = queueId;
      consultation = await Consultation.findOne(filter)
        .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex dateOfBirth occupation address medicalHistory currentMedications vitals habits dentalHistory patientType')
        .populate('doctor', 'name email role specialization phone')
        .populate('queueEntry')
        .populate('appointment');
    }

    let patient = consultation?.patient;
    let doctor = consultation?.doctor;
    let appointment = consultation?.appointment;
    let queueEntry = consultation?.queueEntry;

    if (!consultation) {
      if (appointmentId) {
        appointment = await Appointment.findById(appointmentId)
          .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex dateOfBirth occupation address medicalHistory currentMedications vitals habits dentalHistory patientType')
          .populate('doctor', 'name email role specialization phone');
        if (appointment) {
          patient = appointment.patient;
          doctor = appointment.doctor;
        }
      }
      if (queueId && !patient) {
        queueEntry = await QueueEntry.findById(queueId)
          .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex dateOfBirth occupation address medicalHistory currentMedications vitals habits dentalHistory patientType')
          .populate('doctor', 'name email role specialization phone');
        if (queueEntry) {
          patient = queueEntry.patient;
          doctor = queueEntry.doctor;
        }
      }
    }

    if (!patient && queryPatientId) {
      patient = await Patient.findById(queryPatientId);
    }

    const resolvedPatientId = patient?._id || patient?.id || consultation?.patient?._id || consultation?.patient;
    const activeConsultId = consultation?._id;

    // Fetch related clinical records
    const [
      diagnoses,
      toothRecords,
      treatmentRecords,
      treatmentPlans,
      prescriptions,
      followUps,
    ] = await Promise.all([
      activeConsultId
        ? Diagnosis.find({ consultation: activeConsultId, isDeleted: { $ne: true } }).sort({ createdAt: 1 })
        : resolvedPatientId
        ? Diagnosis.find({ patient: resolvedPatientId, isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(10)
        : [],
      resolvedPatientId
        ? ToothRecord.find({ patient: resolvedPatientId })
        : [],
      activeConsultId
        ? TreatmentRecord.find({ consultation: activeConsultId, isDeleted: { $ne: true } }).sort({ createdAt: 1 })
        : resolvedPatientId
        ? TreatmentRecord.find({ patient: resolvedPatientId, isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(10)
        : [],
      activeConsultId
        ? TreatmentPlan.find({ consultation: activeConsultId }).sort({ createdAt: 1 })
        : resolvedPatientId
        ? TreatmentPlan.find({ patient: resolvedPatientId }).sort({ createdAt: -1 }).limit(5)
        : [],
      activeConsultId
        ? Prescription.find({ consultation: activeConsultId, isDeleted: { $ne: true } }).sort({ createdAt: 1 })
        : resolvedPatientId
        ? Prescription.find({ patient: resolvedPatientId, isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(5)
        : [],
      activeConsultId
        ? FollowUp.find({ consultation: activeConsultId }).populate('scheduledAppointment').sort({ createdAt: -1 })
        : resolvedPatientId
        ? FollowUp.find({ patient: resolvedPatientId }).populate('scheduledAppointment').sort({ createdAt: -1 }).limit(1)
        : [],
    ]);

    // Format tooth findings
    const toothFindings = [];
    (toothRecords || []).forEach((tr) => {
      const matchingHistory = (tr.history || []).filter(
        (h) => !h.deleted && (activeConsultId ? (h.consultation && h.consultation.toString() === activeConsultId.toString()) : true)
      );
      if (matchingHistory.length > 0) {
        matchingHistory.forEach((h) => {
          toothFindings.push({
            toothNumber: tr.toothNumber,
            condition: h.condition || tr.currentCondition,
            treatment: h.treatment || '',
            notes: h.notes || '',
            date: h.date,
          });
        });
      } else if (tr.currentCondition && tr.currentCondition !== 'Healthy') {
        toothFindings.push({
          toothNumber: tr.toothNumber,
          condition: tr.currentCondition,
          treatment: '',
          notes: '',
        });
      }
    });

    return res.json({
      consultation,
      patient,
      doctor,
      appointment,
      queueEntry,
      vitals: consultation?.vitals || patient?.vitals || null,
      clinicalNotes: consultation?.clinicalNotes || consultation?.notes || appointment?.notes || '',
      diagnoses,
      toothFindings,
      treatmentRecords,
      treatmentPlans,
      prescriptions,
      followUp: followUps && followUps.length > 0 ? followUps[0] : null,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listConsultations,
  getDoctorTodayQueue,
  startConsultation,
  getConsultationById,
  getConsultationCompleteSummary,
  closeConsultation,
  checkConsultationNotClosed,
  getDoctorSummary,
  findOrCreateConsultation,
};
