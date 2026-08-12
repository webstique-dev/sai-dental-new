const Investigation = require('../models/Investigation');
const { checkConsultationNotClosed } = require('./consultationController');

// GET /api/investigations?consultation=
async function listInvestigations(req, res, next) {
  try {
    const { consultation, patient } = req.query;
    const filter = {};

    if (consultation) filter.consultation = consultation;
    if (patient) filter.patient = patient;

    const investigations = await Investigation.find(filter)
      .sort({ createdAt: -1 })
      .populate('patient', 'firstName lastName opNumber')
      .populate('recordedBy', 'name email');

    return res.json({ investigations });
  } catch (err) {
    next(err);
  }
}

// POST /api/investigations
async function createInvestigation(req, res, next) {
  try {
    const { consultation, patient, type, reason, notes, result, attachment } = req.body;

    if (!consultation) {
      return res.status(400).json({ message: 'consultation is required.' });
    }

    // Immutability Guard
    await checkConsultationNotClosed(consultation);

    const newInvestigation = new Investigation({
      consultation,
      patient,
      type: type || 'X-Ray',
      reason: reason ? reason.trim() : '',
      notes: notes ? notes.trim() : '',
      result: result ? result.trim() : '',
      attachment: attachment ? attachment.trim() : '',
      recordedBy: req.user ? req.user._id : undefined,
    });

    await newInvestigation.save();

    const populated = await Investigation.findById(newInvestigation._id)
      .populate('patient', 'firstName lastName opNumber')
      .populate('recordedBy', 'name email');

    return res.status(201).json({
      message: 'Investigation created successfully',
      investigation: populated,
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/investigations/:id (Fill in results/notes/attachment)
async function updateInvestigation(req, res, next) {
  try {
    const { type, reason, notes, result, attachment } = req.body;

    const item = await Investigation.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Investigation not found.' });
    }

    // Immutability Guard
    await checkConsultationNotClosed(item.consultation);

    if (type !== undefined) item.type = type;
    if (reason !== undefined) item.reason = reason.trim();
    if (notes !== undefined) item.notes = notes.trim();
    if (result !== undefined) item.result = result.trim();
    if (attachment !== undefined) item.attachment = attachment.trim();

    await item.save();

    const populated = await Investigation.findById(item._id)
      .populate('patient', 'firstName lastName opNumber')
      .populate('recordedBy', 'name email');

    return res.json({
      message: 'Investigation updated successfully',
      investigation: populated,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listInvestigations,
  createInvestigation,
  updateInvestigation,
};
