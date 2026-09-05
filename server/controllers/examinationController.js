const Examination = require('../models/Examination');
const { checkConsultationNotClosed } = require('./consultationController');

// GET /api/examinations?consultation=
async function getExamination(req, res, next) {
  try {
    const { consultation } = req.query;
    if (!consultation) {
      return res.status(400).json({ message: 'consultation query parameter is required.' });
    }

    const exam = await Examination.findOne({ consultation })
      .populate('consultation')
      .populate('patient', 'firstName lastName opNumber')
      .populate('recordedBy', 'name email');

    return res.json({ examination: exam || null });
  } catch (err) {
    next(err);
  }
}

// POST /api/examinations (Upsert single examination document per consultation)
async function upsertExamination(req, res, next) {
  try {
    const { consultation, patient, extraoral, softTissue, gingivalFindings, periodontalDetails, overallNotes, chiefComplaints } = req.body;

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

    const payload = {
      consultation,
      patient: targetPatient || undefined,
      chiefComplaints: chiefComplaints !== undefined ? String(chiefComplaints).trim() : '',
      extraoral: Array.isArray(extraoral) ? extraoral : [],
      softTissue: Array.isArray(softTissue) ? softTissue : [],
      gingivalFindings: Array.isArray(gingivalFindings) ? gingivalFindings : [],
      periodontalDetails: periodontalDetails ? String(periodontalDetails).trim() : '',
      overallNotes: overallNotes ? String(overallNotes).trim() : '',
      recordedBy: req.user ? req.user._id : undefined,
      recordedAt: new Date(),
    };

    const exam = await Examination.findOneAndUpdate(
      { consultation },
      payload,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
      .populate('consultation')
      .populate('patient', 'firstName lastName opNumber')
      .populate('recordedBy', 'name email');

    // Also update Consultation record if chiefComplaints or overallNotes provided
    if (consultation) {
      const Consultation = require('../models/Consultation');
      const updateFields = {};
      if (chiefComplaints !== undefined) updateFields.chiefComplaints = String(chiefComplaints).trim();
      if (overallNotes !== undefined) updateFields.clinicalNotes = String(overallNotes).trim();
      if (Object.keys(updateFields).length > 0) {
        await Consultation.findByIdAndUpdate(consultation, updateFields);
      }
    }

    return res.json({
      message: 'Examination saved successfully',
      examination: exam,
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/examinations/:id & PATCH /api/examinations/:id
async function updateExaminationById(req, res, next) {
  try {
    const { id } = req.params;
    const { extraoral, softTissue, gingivalFindings, periodontalDetails, overallNotes, chiefComplaints } = req.body;

    let exam = await Examination.findById(id);
    if (!exam) {
      return res.status(404).json({ message: 'Examination record not found' });
    }

    if (chiefComplaints !== undefined) exam.chiefComplaints = String(chiefComplaints).trim();
    if (extraoral !== undefined) exam.extraoral = Array.isArray(extraoral) ? extraoral : [];
    if (softTissue !== undefined) exam.softTissue = Array.isArray(softTissue) ? softTissue : [];
    if (gingivalFindings !== undefined) exam.gingivalFindings = Array.isArray(gingivalFindings) ? gingivalFindings : [];
    if (periodontalDetails !== undefined) exam.periodontalDetails = String(periodontalDetails).trim();
    if (overallNotes !== undefined) exam.overallNotes = String(overallNotes).trim();

    exam.recordedBy = req.user ? req.user._id : exam.recordedBy;
    await exam.save();

    // If chiefComplaints or overallNotes were updated and consultation exists, update Consultation record too
    if (exam.consultation) {
      const Consultation = require('../models/Consultation');
      const updateFields = {};
      if (chiefComplaints !== undefined) updateFields.chiefComplaints = String(chiefComplaints).trim();
      if (overallNotes !== undefined) updateFields.clinicalNotes = String(overallNotes).trim();
      if (Object.keys(updateFields).length > 0) {
        await Consultation.findByIdAndUpdate(exam.consultation, updateFields);
      }
    }

    const updated = await Examination.findById(id)
      .populate('consultation')
      .populate('patient', 'firstName lastName opNumber')
      .populate('recordedBy', 'name email');

    return res.json({
      message: 'Examination updated successfully',
      examination: updated,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getExamination,
  upsertExamination,
  updateExaminationById,
};
