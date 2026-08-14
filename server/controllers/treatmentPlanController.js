const TreatmentPlan = require('../models/TreatmentPlan');
const { applyToothUpdate } = require('./toothChartController');
const { checkConsultationNotClosed } = require('./consultationController');
const { updateConsultationTotals } = require('../utils/consultationTotalsSync');

// GET /api/treatment-plans?consultation=&patient=
async function listTreatmentPlans(req, res, next) {
  try {
    const { consultation, patient } = req.query;
    const filter = { isDeleted: { $ne: true } };

    if (consultation) filter.consultation = consultation;
    if (patient) filter.patient = patient;

    const treatmentPlans = await TreatmentPlan.find(filter)
      .sort({ createdAt: -1 })
      .populate('diagnosis', 'diagnosis clinicalFindings severity')
      .populate('patient', 'firstName lastName opNumber')
      .populate('recordedBy', 'name email');

    return res.json({ treatmentPlans });
  } catch (err) {
    next(err);
  }
}

// POST /api/treatment-plans
async function createTreatmentPlan(req, res, next) {
  try {
    const {
      consultation,
      patient,
      diagnosis,
      tooth,
      treatment,
      description,
      estimatedCost,
      estimatedDuration,
      priority,
      notes,
      status,
    } = req.body;

    let targetPatient = patient;
    if (!targetPatient && consultation) {
      const Consultation = require('../models/Consultation');
      const cDoc = await Consultation.findById(consultation);
      if (cDoc) targetPatient = cDoc.patient;
    }

    if (!consultation || !targetPatient) {
      return res.status(400).json({ message: 'consultation and patient are required.' });
    }
    if (!treatment || !treatment.trim()) {
      return res.status(400).json({ message: 'Treatment name is required.' });
    }

    // Immutability Guard
    await checkConsultationNotClosed(consultation);

    const toothNum = tooth ? Number(tooth) : null;
    const targetStatus = status || 'Planned';

    const newPlan = new TreatmentPlan({
      consultation,
      patient: targetPatient,
      diagnosis: diagnosis || null,
      tooth: toothNum,
      treatment: treatment.trim(),
      description: description ? description.trim() : '',
      estimatedCost: Number(estimatedCost) || 0,
      estimatedDuration: estimatedDuration ? estimatedDuration.trim() : '',
      priority: priority || 'Medium',
      notes: notes ? notes.trim() : '',
      status: targetStatus,
      recordedBy: req.user ? req.user._id : undefined,
    });

    await newPlan.save();

    // Recalculate & persist per-visit totals on consultation record
    await updateConsultationTotals(consultation);

    if (targetStatus === 'Completed' && toothNum) {
      await applyToothUpdate(
        targetPatient,
        toothNum,
        {
          condition: 'Restored',
          treatment: treatment.trim(),
          notes: notes ? notes.trim() : 'Treatment completed',
          consultationId: consultation,
        },
        req.user ? req.user._id : undefined
      );
    }

    const populated = await TreatmentPlan.findById(newPlan._id)
      .populate('diagnosis', 'diagnosis clinicalFindings severity')
      .populate('patient', 'firstName lastName opNumber')
      .populate('recordedBy', 'name email');

    return res.status(201).json({
      message: 'Treatment plan created successfully',
      treatmentPlan: populated,
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/treatment-plans/:id
async function updateTreatmentPlan(req, res, next) {
  try {
    const {
      treatment,
      description,
      estimatedCost,
      estimatedDuration,
      priority,
      notes,
      status,
      tooth,
      diagnosis,
    } = req.body;

    const plan = await TreatmentPlan.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!plan) {
      return res.status(404).json({ message: 'Treatment plan not found.' });
    }

    // Immutability Guard
    await checkConsultationNotClosed(plan.consultation);

    const oldStatus = plan.status;
    const newStatus = status !== undefined ? status : plan.status;
    const targetTooth = tooth !== undefined ? (tooth ? Number(tooth) : null) : plan.tooth;

    if (treatment !== undefined) plan.treatment = treatment.trim();
    if (description !== undefined) plan.description = description.trim();
    if (estimatedCost !== undefined) plan.estimatedCost = Number(estimatedCost) || 0;
    if (estimatedDuration !== undefined) plan.estimatedDuration = estimatedDuration.trim();
    if (priority !== undefined) plan.priority = priority;
    if (notes !== undefined) plan.notes = notes.trim();
    if (status !== undefined) plan.status = status;
    if (tooth !== undefined) plan.tooth = targetTooth;
    if (diagnosis !== undefined) plan.diagnosis = diagnosis || null;

    await plan.save();

    // Recalculate & persist per-visit totals on consultation record
    await updateConsultationTotals(plan.consultation);

    if (oldStatus !== 'Completed' && newStatus === 'Completed' && targetTooth) {
      await applyToothUpdate(
        plan.patient,
        targetTooth,
        {
          condition: 'Restored',
          treatment: plan.treatment,
          notes: plan.notes || 'Treatment plan completed',
          consultationId: plan.consultation,
        },
        req.user ? req.user._id : undefined
      );
    }

    const populated = await TreatmentPlan.findById(plan._id)
      .populate('diagnosis', 'diagnosis clinicalFindings severity')
      .populate('patient', 'firstName lastName opNumber')
      .populate('recordedBy', 'name email');

    return res.json({
      message: 'Treatment plan updated successfully',
      treatmentPlan: populated,
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/treatment-plans/:id/execute
async function executeTreatmentPlan(req, res, next) {
  try {
    const { status, clinicalNotes } = req.body;

    const plan = await TreatmentPlan.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!plan) {
      return res.status(404).json({ message: 'Treatment plan not found.' });
    }

    // Immutability Guard
    await checkConsultationNotClosed(plan.consultation);

    const oldStatus = plan.status;
    const newStatus = status || 'Completed';

    plan.status = newStatus;
    if (clinicalNotes && clinicalNotes.trim()) {
      plan.notes = plan.notes
        ? `${plan.notes}\n[${new Date().toLocaleDateString()}] ${clinicalNotes.trim()}`
        : clinicalNotes.trim();
    }

    await plan.save();

    // Recalculate & persist per-visit totals on consultation record
    await updateConsultationTotals(plan.consultation);

    if (oldStatus !== 'Completed' && newStatus === 'Completed' && plan.tooth) {
      await applyToothUpdate(
        plan.patient,
        plan.tooth,
        {
          condition: 'Restored',
          treatment: plan.treatment,
          notes: clinicalNotes || plan.notes || 'Treatment plan executed & completed',
          consultationId: plan.consultation,
        },
        req.user ? req.user._id : undefined
      );
    }

    const populated = await TreatmentPlan.findById(plan._id)
      .populate('diagnosis', 'diagnosis clinicalFindings severity')
      .populate('patient', 'firstName lastName opNumber')
      .populate('recordedBy', 'name email');

    return res.json({
      message: 'Treatment plan execution updated',
      treatmentPlan: populated,
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/treatment-plans/:id (Soft delete)
async function deleteTreatmentPlan(req, res, next) {
  try {
    const plan = await TreatmentPlan.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!plan) {
      return res.status(404).json({ message: 'Treatment plan not found.' });
    }

    // Immutability Guard
    await checkConsultationNotClosed(plan.consultation);

    plan.isDeleted = true;
    plan.deletedAt = new Date();
    plan.deletedBy = req.user ? req.user._id : undefined;
    await plan.save();

    // Recalculate & persist per-visit totals on consultation record
    await updateConsultationTotals(plan.consultation);

    return res.json({ message: 'Treatment plan deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listTreatmentPlans,
  createTreatmentPlan,
  updateTreatmentPlan,
  executeTreatmentPlan,
  deleteTreatmentPlan,
};
