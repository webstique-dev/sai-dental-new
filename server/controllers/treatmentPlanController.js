const TreatmentPlan = require('../models/TreatmentPlan');
const { applyToothUpdate } = require('./toothChartController');

// GET /api/treatment-plans?consultation=&patient=
async function listTreatmentPlans(req, res, next) {
  try {
    const { consultation, patient } = req.query;
    const filter = {};

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
      priority,
      notes,
      status,
    } = req.body;

    if (!consultation || !patient) {
      return res.status(400).json({ message: 'consultation and patient are required.' });
    }
    if (!treatment || !treatment.trim()) {
      return res.status(400).json({ message: 'Treatment name is required.' });
    }

    const toothNum = tooth ? Number(tooth) : null;
    const targetStatus = status || 'Planned';

    const newPlan = new TreatmentPlan({
      consultation,
      patient,
      diagnosis: diagnosis || null,
      tooth: toothNum,
      treatment: treatment.trim(),
      description: description ? description.trim() : '',
      estimatedCost: Number(estimatedCost) || 0,
      priority: priority || 'Medium',
      notes: notes ? notes.trim() : '',
      status: targetStatus,
      recordedBy: req.user ? req.user._id : undefined,
    });

    await newPlan.save();

    // Critical rule: If created directly with status Completed & tooth set, append tooth-chart history entry!
    if (targetStatus === 'Completed' && toothNum) {
      await applyToothUpdate(
        patient,
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
      priority,
      notes,
      status,
      tooth,
      diagnosis,
    } = req.body;

    const plan = await TreatmentPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ message: 'Treatment plan not found.' });
    }

    const oldStatus = plan.status;
    const newStatus = status !== undefined ? status : plan.status;
    const targetTooth = tooth !== undefined ? (tooth ? Number(tooth) : null) : plan.tooth;

    if (treatment !== undefined) plan.treatment = treatment.trim();
    if (description !== undefined) plan.description = description.trim();
    if (estimatedCost !== undefined) plan.estimatedCost = Number(estimatedCost) || 0;
    if (priority !== undefined) plan.priority = priority;
    if (notes !== undefined) plan.notes = notes.trim();
    if (status !== undefined) plan.status = status;
    if (tooth !== undefined) plan.tooth = targetTooth;
    if (diagnosis !== undefined) plan.diagnosis = diagnosis || null;

    await plan.save();

    // Critical rule: When status transitions to 'Completed' and tooth is set, append to tooth-chart history!
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

module.exports = {
  listTreatmentPlans,
  createTreatmentPlan,
  updateTreatmentPlan,
};
