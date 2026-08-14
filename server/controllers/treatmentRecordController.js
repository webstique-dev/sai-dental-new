const TreatmentRecord = require('../models/TreatmentRecord');
const { checkConsultationNotClosed } = require('./consultationController');
const { updateConsultationTotals } = require('../utils/consultationTotalsSync');

// GET /api/treatment-records?consultation=
async function listTreatmentRecords(req, res, next) {
  try {
    const { consultation, patient } = req.query;
    const filter = { isDeleted: { $ne: true } };

    if (consultation) filter.consultation = consultation;
    if (patient) filter.patient = patient;

    const records = await TreatmentRecord.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .populate('patient', 'firstName lastName opNumber')
      .populate('recordedBy', 'name email');

    return res.json({ treatmentRecords: records });
  } catch (err) {
    next(err);
  }
}

// POST /api/treatment-records
async function createTreatmentRecord(req, res, next) {
  try {
    const { consultation, patient, date, tooth, procedure, charges, actualDuration, nextAppointment, notes } = req.body;

    if (!consultation) {
      return res.status(400).json({ message: 'consultation is required.' });
    }
    if (!procedure || !procedure.trim()) {
      return res.status(400).json({ message: 'procedure name is required.' });
    }

    // Immutability Guard
    await checkConsultationNotClosed(consultation);

    let targetPatient = patient;
    if (!targetPatient && consultation) {
      const Consultation = require('../models/Consultation');
      const cDoc = await Consultation.findById(consultation);
      if (cDoc) targetPatient = cDoc.patient;
    }

    const record = new TreatmentRecord({
      consultation,
      patient: targetPatient,
      date: date ? new Date(date) : new Date(),
      tooth: tooth ? Number(tooth) : null,
      procedure: procedure.trim(),
      charges: charges !== undefined ? Number(charges) : 0,
      actualDuration: actualDuration ? actualDuration.trim() : '',
      nextAppointment: nextAppointment ? new Date(nextAppointment) : null,
      notes: notes ? notes.trim() : '',
      recordedBy: req.user ? req.user._id : undefined,
    });

    await record.save();

    // Recalculate & persist per-visit totals on consultation record
    await updateConsultationTotals(consultation);

    const populated = await TreatmentRecord.findById(record._id)
      .populate('patient', 'firstName lastName opNumber')
      .populate('recordedBy', 'name email');

    return res.json({
      message: 'Treatment record created successfully',
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

    // Immutability Guard
    await checkConsultationNotClosed(record.consultation);

    record.isDeleted = true;
    record.deletedAt = new Date();
    record.deletedBy = req.user ? req.user._id : undefined;
    await record.save();

    // Recalculate & persist per-visit totals on consultation record
    await updateConsultationTotals(record.consultation);

    return res.json({ message: 'Treatment record deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listTreatmentRecords,
  createTreatmentRecord,
  deleteTreatmentRecord,
};
