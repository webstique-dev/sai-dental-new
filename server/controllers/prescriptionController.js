const Prescription = require('../models/Prescription');
const { checkConsultationNotClosed } = require('./consultationController');

// GET /api/prescriptions?consultation=
async function listPrescriptions(req, res, next) {
  try {
    const { consultation, patient } = req.query;
    const filter = { isDeleted: { $ne: true } };

    if (consultation) filter.consultation = consultation;
    if (patient) filter.patient = patient;

    const prescriptions = await Prescription.find(filter)
      .sort({ createdAt: -1 })
      .populate('patient', 'firstName lastName opNumber phone age sex dateOfBirth address vitals medicalHistory currentMedications')
      .populate('recordedBy', 'name email role specialization');

    return res.json({ prescriptions });
  } catch (err) {
    next(err);
  }
}

// POST /api/prescriptions
async function createPrescription(req, res, next) {
  try {
    const { consultation, patient, medicines, notes } = req.body;

    if (!consultation && !patient) {
      return res.status(400).json({ message: 'Either consultation or patient is required.' });
    }
    if (!Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ message: 'At least one medicine is required.' });
    }

    let targetPatient = patient;
    let targetConsultation = consultation;

    if (!targetPatient && consultation) {
      const Consultation = require('../models/Consultation');
      const cDoc = await Consultation.findById(consultation);
      if (cDoc) targetPatient = cDoc.patient;
    }

    if (!targetConsultation && targetPatient) {
      // Check if patient has any previous consultation to associate with
      const Consultation = require('../models/Consultation');
      const latestConsult = await Consultation.findOne({ patient: targetPatient }).sort({ createdAt: -1 });
      if (latestConsult) targetConsultation = latestConsult._id;
    }

    const newPrescription = new Prescription({
      consultation: targetConsultation || undefined,
      patient: targetPatient || undefined,
      medicines: medicines.map((m) => ({
        medicine: m.medicine ? m.medicine.trim() : '',
        dosage: m.dosage ? m.dosage.trim() : '',
        frequency: m.frequency ? m.frequency.trim() : '',
        duration: m.duration ? m.duration.trim() : '',
        instructions: m.instructions ? m.instructions.trim() : '',
      })),
      notes: notes ? String(notes).trim() : '',
      recordedBy: req.user ? req.user._id : undefined,
    });

    await newPrescription.save();

    const populated = await Prescription.findById(newPrescription._id)
      .populate('patient', 'firstName lastName opNumber phone age sex dateOfBirth address vitals medicalHistory currentMedications')
      .populate('recordedBy', 'name email role specialization');

    return res.status(201).json({
      message: 'Prescription recorded successfully',
      prescription: populated,
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/prescriptions/:id & PATCH /api/prescriptions/:id
async function updatePrescription(req, res, next) {
  try {
    const { medicines, notes } = req.body;

    const rx = await Prescription.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!rx) {
      return res.status(404).json({ message: 'Prescription not found.' });
    }

    if (Array.isArray(medicines)) {
      if (medicines.length === 0) {
        return res.status(400).json({ message: 'At least one medicine is required.' });
      }
      rx.medicines = medicines.map((m) => ({
        medicine: m.medicine ? m.medicine.trim() : '',
        dosage: m.dosage ? m.dosage.trim() : '',
        frequency: m.frequency ? m.frequency.trim() : '',
        duration: m.duration ? m.duration.trim() : '',
        instructions: m.instructions ? m.instructions.trim() : '',
      }));
    }

    if (notes !== undefined) {
      rx.notes = String(notes).trim();
    }

    rx.recordedBy = req.user ? req.user._id : rx.recordedBy;
    await rx.save();

    const populated = await Prescription.findById(rx._id)
      .populate('patient', 'firstName lastName opNumber phone age sex dateOfBirth address vitals medicalHistory currentMedications')
      .populate('recordedBy', 'name email role specialization');

    return res.json({
      message: 'Prescription updated successfully',
      prescription: populated,
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/prescriptions/:id (Soft delete)
async function deletePrescription(req, res, next) {
  try {
    const rx = await Prescription.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!rx) {
      return res.status(404).json({ message: 'Prescription not found.' });
    }

    rx.isDeleted = true;
    rx.deletedAt = new Date();
    rx.deletedBy = req.user ? req.user._id : undefined;
    await rx.save();

    return res.json({ message: 'Prescription deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listPrescriptions,
  createPrescription,
  updatePrescription,
  deletePrescription,
};
