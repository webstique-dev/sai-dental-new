const Examination = require('../models/Examination');

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

// POST /api/examinations (Upsert one examination per consultation)
async function upsertExamination(req, res, next) {
  try {
    const { consultation, patient, extraoral, softTissue, gingivalFindings } = req.body;

    if (!consultation) {
      return res.status(400).json({ message: 'consultation is required.' });
    }

    const payload = {
      consultation,
      patient: patient || undefined,
      extraoral: Array.isArray(extraoral) ? extraoral : [],
      softTissue: Array.isArray(softTissue) ? softTissue : [],
      gingivalFindings: Array.isArray(gingivalFindings) ? gingivalFindings : [],
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
