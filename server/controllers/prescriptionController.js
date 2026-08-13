const Prescription = require('../models/Prescription');
const { checkConsultationNotClosed } = require('./consultationController');

// GET /api/prescriptions?consultation=
async function listPrescriptions(req, res, next) {
  try {
    const { consultation, patient } = req.query;
    const filter = {};

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
    const { consultation, patient, medicines } = req.body;

    if (!consultation) {
      return res.status(400).json({ message: 'consultation is required.' });
    }
    if (!Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ message: 'At least one medicine is required.' });
    }

    // Immutability Guard
    await checkConsultationNotClosed(consultation);

    let targetPatient = patient;
    if (!targetPatient && consultation) {
      const Consultation = require('../models/Consultation');
      const cDoc = await Consultation.findById(consultation);
      if (cDoc) targetPatient = cDoc.patient;
    }

    const newPrescription = new Prescription({
      consultation,
      patient: targetPatient || undefined,
      medicines: medicines.map((m) => ({
        medicine: m.medicine ? m.medicine.trim() : '',
        dosage: m.dosage ? m.dosage.trim() : '',
        frequency: m.frequency ? m.frequency.trim() : '',
        duration: m.duration ? m.duration.trim() : '',
        instructions: m.instructions ? m.instructions.trim() : '',
      })),
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

module.exports = {
  listPrescriptions,
  createPrescription,
};
