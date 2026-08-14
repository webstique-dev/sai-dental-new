const Investigation = require('../models/Investigation');
const { checkConsultationNotClosed } = require('./consultationController');

// GET /api/investigations?consultation=
async function listInvestigations(req, res, next) {
  try {
    const { consultation, patient } = req.query;
    const filter = { isDeleted: { $ne: true } };

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

// POST /api/investigations (Creates or upserts investigation)
async function createInvestigation(req, res, next) {
  try {
    const {
      consultation,
      patient,
      selectedTypes,
      otherText,
      investigationDetails,
      findings,
      type,
      reason,
      notes,
      result,
      attachment,
    } = req.body;

    if (!consultation) {
      return res.status(400).json({ message: 'consultation is required.' });
    }

    // Immutability Guard
    await checkConsultationNotClosed(consultation);

    let targetPatient = patient;
    if (!targetPatient && consultation) {
      const Consultation = require('../models/Consultation');
      const cDoc = await Consultation.findById(consultation);
      if (cDoc) targetPatient = cDoc.patient;
    }

    if (Array.isArray(selectedTypes) || findings !== undefined || investigationDetails) {
      const payload = {
        consultation,
        patient: targetPatient || undefined,
        selectedTypes: Array.isArray(selectedTypes) ? selectedTypes : [],
        otherText: otherText ? String(otherText).trim() : '',
        investigationDetails: investigationDetails || {},
        findings: findings ? String(findings).trim() : '',
        isDeleted: false,
        recordedBy: req.user ? req.user._id : undefined,
        recordedAt: new Date(),
      };

      const updated = await Investigation.findOneAndUpdate(
        { consultation },
        payload,
        { new: true, upsert: true, setDefaultsOnInsert: true }
      )
        .populate('patient', 'firstName lastName opNumber')
        .populate('recordedBy', 'name email');

      return res.json({
        message: 'Investigations saved successfully',
        investigation: updated,
      });
    }

    const newInvestigation = new Investigation({
      consultation,
      patient: targetPatient || undefined,
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

// PATCH /api/investigations/:id
async function updateInvestigation(req, res, next) {
  try {
    const { type, reason, notes, result, attachment, selectedTypes, otherText, investigationDetails, findings } = req.body;

    const item = await Investigation.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!item) {
      return res.status(404).json({ message: 'Investigation not found.' });
    }

    // Immutability Guard
    await checkConsultationNotClosed(item.consultation);

    if (selectedTypes !== undefined) item.selectedTypes = selectedTypes;
    if (otherText !== undefined) item.otherText = otherText;
    if (investigationDetails !== undefined) item.investigationDetails = investigationDetails;
    if (findings !== undefined) item.findings = findings;

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

// DELETE /api/investigations/:id (Soft delete)
async function deleteInvestigation(req, res, next) {
  try {
    const item = await Investigation.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!item) {
      return res.status(404).json({ message: 'Investigation not found.' });
    }

    // Immutability Guard
    await checkConsultationNotClosed(item.consultation);

    item.isDeleted = true;
    item.deletedAt = new Date();
    item.deletedBy = req.user ? req.user._id : undefined;
    await item.save();

    return res.json({ message: 'Investigation deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listInvestigations,
  createInvestigation,
  updateInvestigation,
  deleteInvestigation,
};
