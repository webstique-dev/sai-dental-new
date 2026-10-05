const TreatmentRecord = require('../models/TreatmentRecord');
const { checkConsultationNotClosed } = require('./consultationController');
const { updateConsultationTotals } = require('../utils/consultationTotalsSync');

// GET /api/treatment-records?consultation=&patient=
async function listTreatmentRecords(req, res, next) {
  try {
    const { consultation, patient } = req.query;
    const filter = { isDeleted: { $ne: true } };

    if (consultation) filter.consultation = consultation;
    if (patient) filter.patient = patient;

    const records = await TreatmentRecord.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .populate('patient', 'firstName lastName opNumber')
      .populate('recordedBy', 'name email role');

    return res.json({ treatmentRecords: records });
  } catch (err) {
    next(err);
  }
}

// POST /api/treatment-records
async function createTreatmentRecord(req, res, next) {
  try {
    const { consultation, patient, date, tooth, procedure, treatment, charges, actualDuration, nextAppointment, notes } = req.body;

    const procedureName = (procedure || treatment || '').trim();
    if (!procedureName) {
      return res.status(400).json({ message: 'Treatment / Procedure name is required.' });
    }

    let targetPatient = patient;
    if (!targetPatient && consultation) {
      const Consultation = require('../models/Consultation');
      const cDoc = await Consultation.findById(consultation);
      if (cDoc) targetPatient = cDoc.patient;
    }

    if (!targetPatient) {
      return res.status(400).json({ message: 'Patient ID is required.' });
    }

    // Immutability Guard only if attached to a consultation
    if (consultation) {
      await checkConsultationNotClosed(consultation);
    }

    const record = new TreatmentRecord({
      consultation: consultation || null,
      patient: targetPatient,
      date: date ? new Date(date) : new Date(),
      tooth: tooth !== undefined && tooth !== null && tooth !== '' ? Number(tooth) : null,
      procedure: procedureName,
      charges: charges !== undefined && charges !== null ? Number(charges) : 0,
      actualDuration: actualDuration ? actualDuration.trim() : '',
      nextAppointment: nextAppointment ? new Date(nextAppointment) : null,
      notes: notes ? notes.trim() : '',
      recordedBy: req.user ? req.user._id : undefined,
    });

    await record.save();

    // Recalculate & persist per-visit totals on consultation record if applicable
    if (consultation) {
      await updateConsultationTotals(consultation);
    }

    const populated = await TreatmentRecord.findById(record._id)
      .populate('patient', 'firstName lastName opNumber')
      .populate('recordedBy', 'name email role');

    return res.status(201).json({
      message: 'Treatment record created successfully',
      treatmentRecord: populated,
    });
  } catch (err) {
    next(err);
  }
}

// PUT / PATCH /api/treatment-records/:id
async function updateTreatmentRecord(req, res, next) {
  try {
    const record = await TreatmentRecord.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!record) {
      return res.status(404).json({ message: 'Treatment record not found.' });
    }

    const { date, tooth, procedure, treatment, charges, actualDuration, nextAppointment, notes } = req.body;

    if (record.consultation) {
      // Check if consultation is still active (allow admin or doctor to manage if needed)
      try {
        await checkConsultationNotClosed(record.consultation);
      } catch (err) {
        if (req.user && req.user.role !== 'admin') {
          return res.status(400).json({ message: err.message || 'Consultation is closed.' });
        }
      }
    }

    if (date !== undefined) record.date = date ? new Date(date) : record.date;
    if (procedure !== undefined || treatment !== undefined) {
      const procVal = (procedure !== undefined ? procedure : treatment || '').trim();
      if (procVal) record.procedure = procVal;
    }
    if (tooth !== undefined) {
      record.tooth = tooth !== null && tooth !== '' ? Number(tooth) : null;
    }
    if (charges !== undefined) record.charges = Number(charges) || 0;
    if (actualDuration !== undefined) record.actualDuration = (actualDuration || '').trim();
    if (nextAppointment !== undefined) record.nextAppointment = nextAppointment ? new Date(nextAppointment) : null;
    if (notes !== undefined) record.notes = (notes || '').trim();

    await record.save();

    if (record.consultation) {
      await updateConsultationTotals(record.consultation);
    }

    const populated = await TreatmentRecord.findById(record._id)
      .populate('patient', 'firstName lastName opNumber')
      .populate('recordedBy', 'name email role');

    return res.json({
      message: 'Treatment record updated successfully',
      treatmentRecord: populated,
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/treatment-records/:id (Soft delete)
async function deleteTreatmentRecord(req, res, next) {
  try {
    const record = await TreatmentRecord.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!record) {
      return res.status(404).json({ message: 'Treatment record not found.' });
    }

    // Immutability Guard if attached to consultation
    if (record.consultation) {
      try {
        await checkConsultationNotClosed(record.consultation);
      } catch (err) {
        if (req.user && req.user.role !== 'admin') {
          return res.status(400).json({ message: err.message || 'Consultation is closed.' });
        }
      }
    }

    record.isDeleted = true;
    record.deletedAt = new Date();
    record.deletedBy = req.user ? req.user._id : undefined;
    await record.save();

    // Recalculate & persist per-visit totals on consultation record if applicable
    if (record.consultation) {
      await updateConsultationTotals(record.consultation);
    }

    return res.json({ message: 'Treatment record deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listTreatmentRecords,
  createTreatmentRecord,
  updateTreatmentRecord,
  deleteTreatmentRecord,
};

