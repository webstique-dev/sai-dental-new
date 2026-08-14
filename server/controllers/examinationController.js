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
    const { consultation, patient, extraoral, softTissue, gingivalFindings, periodontalDetails, overallNotes } = req.body;

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

    return res.json({
      message: 'Examination saved successfully',
      examination: exam,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getExamination,
  upsertExamination,
};
