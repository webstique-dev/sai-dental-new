const mongoose = require('mongoose');
const Diagnosis = require('../models/Diagnosis');
const { checkConsultationNotClosed } = require('./consultationController');

// GET /api/diagnoses?consultation=
async function listDiagnoses(req, res, next) {
  try {
    const { consultation, patient } = req.query;
    const filter = {};

    if (consultation) {
      filter.consultation = consultation;
    }
    if (patient) {
      filter.patient = patient;
    }

    const diagnoses = await Diagnosis.find(filter)
      .sort({ createdAt: -1 })
      .populate('patient', 'firstName lastName opNumber')
      .populate('recordedBy', 'name email');

    return res.json({ diagnoses });
  } catch (err) {
    next(err);
  }
}

// POST /api/diagnoses
async function createDiagnosis(req, res, next) {
  try {
    const { consultation, patient, diagnosis, clinicalFindings, notes, severity, relatedTeeth } = req.body;

    if (!consultation) {
      return res.status(400).json({ message: 'consultation is required.' });
    }
    if (!diagnosis || !diagnosis.trim()) {
      return res.status(400).json({ message: 'Diagnosis description is required.' });
    }

    // Immutability Guard
    await checkConsultationNotClosed(consultation);

    const newDiagnosis = new Diagnosis({
      consultation,
      patient,
      diagnosis: diagnosis.trim(),
      clinicalFindings: clinicalFindings ? clinicalFindings.trim() : '',
      notes: notes ? notes.trim() : '',
      severity: severity || undefined,
      relatedTeeth: Array.isArray(relatedTeeth) ? relatedTeeth : [],
      recordedBy: req.user ? req.user._id : undefined,
    });

    await newDiagnosis.save();

    const populated = await Diagnosis.findById(newDiagnosis._id)
      .populate('patient', 'firstName lastName opNumber')
      .populate('recordedBy', 'name email');

    return res.status(201).json({
      message: 'Diagnosis created successfully',
      diagnosis: populated,
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/diagnoses/:id
async function updateDiagnosis(req, res, next) {
  try {
    const { diagnosis, clinicalFindings, notes, severity, relatedTeeth } = req.body;

    const diag = await Diagnosis.findById(req.params.id);
    if (!diag) {
      return res.status(404).json({ message: 'Diagnosis not found.' });
    }

    // Immutability Guard
    await checkConsultationNotClosed(diag.consultation);

    if (diagnosis !== undefined) diag.diagnosis = diagnosis.trim();
    if (clinicalFindings !== undefined) diag.clinicalFindings = clinicalFindings.trim();
    if (notes !== undefined) diag.notes = notes.trim();
    if (severity !== undefined) diag.severity = severity || undefined;
    if (Array.isArray(relatedTeeth)) diag.relatedTeeth = relatedTeeth;

    await diag.save();

    const populated = await Diagnosis.findById(diag._id)
      .populate('patient', 'firstName lastName opNumber')
      .populate('recordedBy', 'name email');

    return res.json({
      message: 'Diagnosis updated successfully',
      diagnosis: populated,
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/diagnoses/:id (Blocked if referenced by a Treatment Plan or if Consultation is Closed)
async function deleteDiagnosis(req, res, next) {
  try {
    const diagId = req.params.id;

    const diag = await Diagnosis.findById(diagId);
    if (!diag) {
      return res.status(404).json({ message: 'Diagnosis not found.' });
    }

    // Immutability Guard
    await checkConsultationNotClosed(diag.consultation);

    // Check if referenced by TreatmentPlan if model is registered
    try {
      if (mongoose.models.TreatmentPlan) {
        const TreatmentPlan = mongoose.model('TreatmentPlan');
        const inUse = await TreatmentPlan.findOne({
          $or: [
            { diagnosis: diagId },
            { 'items.diagnosis': diagId },
            { 'procedures.diagnosis': diagId },
          ],
        });
        if (inUse) {
          return res.status(400).json({
            message: 'Cannot delete diagnosis because it is referenced in a Treatment Plan.',
          });
        }
      }
    } catch (e) {
      // Model not compiled yet, ignore
    }

    await Diagnosis.findByIdAndDelete(diagId);

    return res.json({ message: 'Diagnosis deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listDiagnoses,
  createDiagnosis,
  updateDiagnosis,
  deleteDiagnosis,
};
