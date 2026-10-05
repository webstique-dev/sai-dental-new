const Prescription = require('../models/Prescription');
const { checkConsultationNotClosed } = require('./consultationController');
const { registerMedicinesFromPrescription } = require('../utils/seedMedicines');

// GET /api/prescriptions?consultation=
async function listPrescriptions(req, res, next) {
  try {
    const { consultation, patient } = req.query;
    const filter = { isDeleted: { $ne: true } };

    if (consultation) filter.consultation = consultation;
    if (patient) filter.patient = patient;

    // Doctor role sees only prescriptions they recorded; Admin/Receptionist can view across doctors
    if (req.user && req.user.role === 'doctor') {
      filter.recordedBy = req.user._id;
    }

    const prescriptions = await Prescription.find(filter)
      .sort({ date: -1, recordedAt: -1, createdAt: -1 })
      .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex dateOfBirth address vitals medicalHistory currentMedications')
      .populate('recordedBy', 'name email role specialization');

    return res.json({ prescriptions });
  } catch (err) {
    next(err);
  }
}

// POST /api/prescriptions
async function createPrescription(req, res, next) {
  try {
    const { consultation, patient, medicines, diagnosis, treatmentPlan, treatment, notes, date, recordedAt } = req.body;

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

    const targetDate = date || recordedAt ? new Date(date || recordedAt) : new Date();
    const finalDate = !isNaN(targetDate.getTime()) ? targetDate : new Date();

    const newPrescription = new Prescription({
      consultation: targetConsultation || undefined,
      patient: targetPatient || undefined,
      medicines: medicines.map((m) => ({
        medicine: m.medicine ? m.medicine.trim() : '',
        dosage: m.dosage ? m.dosage.trim() : '',
        frequency: m.frequency ? m.frequency.trim() : '',
        duration: m.duration ? m.duration.trim() : '',
        instructions: m.instructions ? m.instructions.trim() : '',
        type: m.type === 'syrup' ? 'syrup' : 'medicine',
      })),
      diagnosis: diagnosis ? String(diagnosis).trim() : '',
      treatmentPlan: treatmentPlan ? String(treatmentPlan).trim() : '',
      treatment: treatment ? String(treatment).trim() : '',
      notes: notes ? String(notes).trim() : '',
      date: finalDate,
      recordedAt: finalDate,
      createdAt: finalDate,
      recordedBy: req.user ? req.user._id : undefined,
    });

    await newPrescription.save();

    // Automatically register any new medicines to the suggestion catalog
    registerMedicinesFromPrescription(newPrescription.medicines).catch((e) =>
      console.error('Error auto-registering prescription medicines:', e)
    );

    const populated = await Prescription.findById(newPrescription._id)
      .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex dateOfBirth address vitals medicalHistory currentMedications')
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
    const { medicines, diagnosis, treatmentPlan, treatment, notes, date, recordedAt } = req.body;

    const rx = await Prescription.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!rx) {
      return res.status(404).json({ message: 'Prescription not found.' });
    }

    if (req.user && req.user.role === 'doctor') {
      const rxRecordedById = rx.recordedBy?._id?.toString() || rx.recordedBy?.toString();
      const userDoctorId = req.user._id ? req.user._id.toString() : req.user.id?.toString();
      if (rxRecordedById && userDoctorId && rxRecordedById !== userDoctorId) {
        return res.status(403).json({ message: 'Access denied: You cannot edit prescriptions created by other doctors.' });
      }
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
        type: m.type === 'syrup' ? 'syrup' : 'medicine',
      }));
    }

    if (diagnosis !== undefined) {
      rx.diagnosis = String(diagnosis).trim();
    }
    if (treatmentPlan !== undefined) {
      rx.treatmentPlan = String(treatmentPlan).trim();
    }
    if (treatment !== undefined) {
      rx.treatment = String(treatment).trim();
    }
    if (notes !== undefined) {
      rx.notes = String(notes).trim();
    }

    const targetDate = date || recordedAt ? new Date(date || recordedAt) : null;
    if (targetDate && !isNaN(targetDate.getTime())) {
      rx.date = targetDate;
      rx.recordedAt = targetDate;
      rx.createdAt = targetDate;
    }

    rx.recordedBy = req.user ? req.user._id : rx.recordedBy;
    await rx.save();

    // Automatically register any new medicines to the suggestion catalog
    if (Array.isArray(rx.medicines)) {
      registerMedicinesFromPrescription(rx.medicines).catch((e) =>
        console.error('Error auto-registering prescription medicines:', e)
      );
    }

    const populated = await Prescription.findById(rx._id)
      .populate('patient', 'firstName lastName opNumber primaryPhone secondaryPhone phone age sex dateOfBirth address vitals medicalHistory currentMedications')
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

    if (req.user && req.user.role === 'doctor') {
      const rxRecordedById = rx.recordedBy?._id?.toString() || rx.recordedBy?.toString();
      const userDoctorId = req.user._id ? req.user._id.toString() : req.user.id?.toString();
      if (rxRecordedById && userDoctorId && rxRecordedById !== userDoctorId) {
        return res.status(403).json({ message: 'Access denied: You cannot delete prescriptions created by other doctors.' });
      }
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
