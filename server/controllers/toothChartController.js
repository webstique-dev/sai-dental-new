const ToothRecord = require('../models/ToothRecord');
const { checkConsultationNotClosed } = require('./consultationController');
const { logAction } = require('../middleware/auditLog');
const { canDoctorAccessPatient } = require('../utils/patientAuth');

const ALL_FDI_TEETH = [
  // Upper Right (18 - 11)
  18, 17, 16, 15, 14, 13, 12, 11,
  // Upper Left (21 - 28)
  21, 22, 23, 24, 25, 26, 27, 28,
  // Lower Right (48 - 41)
  48, 47, 46, 45, 44, 43, 42, 41,
  // Lower Left (31 - 38)
  31, 32, 33, 34, 35, 36, 37, 38,
];

// GET /api/tooth-chart/:patientId (Returns all 32 FDI teeth)
async function getPatientToothChart(req, res, next) {
  try {
    const { patientId } = req.params;

    if (req.user && req.user.role === 'doctor') {
      const allowed = await canDoctorAccessPatient(req.user._id, patientId);
      if (!allowed) {
        return res.status(403).json({
          message: 'Access denied. You can only view tooth records for patients assigned to you via appointments or consultations.',
        });
      }
    }

    const records = await ToothRecord.find({ patient: patientId })
      .populate('history.doctor', 'name email')
      .sort({ toothNumber: 1 });

    const recordMap = {};
    records.forEach((r) => {
      recordMap[r.toothNumber] = r;
    });

    const fullChart = ALL_FDI_TEETH.map((tNum) => {
      if (recordMap[tNum]) {
        return recordMap[tNum];
      }
      return {
        patient: patientId,
        toothNumber: tNum,
        currentCondition: 'Healthy',
        history: [],
      };
    });

    return res.json({ teeth: fullChart });
  } catch (err) {
    next(err);
  }
}

// Helper to push history entry and update current condition
async function applyToothUpdate(patientId, toothNum, body, userId) {
  const { condition, treatment, notes, consultationId } = body;

  // Immutability Guard
  if (consultationId) {
    await checkConsultationNotClosed(consultationId);
  }

  let record = await ToothRecord.findOne({
    patient: patientId,
    toothNumber: Number(toothNum),
  });

  if (!record) {
    record = new ToothRecord({
      patient: patientId,
      toothNumber: Number(toothNum),
      currentCondition: condition || 'Healthy',
      history: [],
    });
  }

  const historyItem = {
    condition: condition || 'Healthy',
    treatment: treatment || '',
    date: new Date(),
    doctor: userId || undefined,
    notes: notes || '',
    consultation: consultationId || null,
  };

  // Critical rule: PUSH new entry onto history, NEVER overwrite prior entries
  record.history.push(historyItem);
  record.currentCondition = condition || 'Healthy';

  await record.save();

  return await ToothRecord.findById(record._id).populate('history.doctor', 'name email');
}

// PATCH /api/tooth-chart/:patientId/:toothNumber
async function updateToothRecord(req, res, next) {
  try {
    const { patientId, toothNumber } = req.params;
    const userId = req.user ? req.user._id : undefined;

    if (req.user && req.user.role === 'doctor') {
      const allowed = await canDoctorAccessPatient(req.user._id, patientId);
      if (!allowed) {
        return res.status(403).json({
          message: 'Access denied. You can only update tooth records for patients assigned to you via appointments or consultations.',
        });
      }
    }

    const updated = await applyToothUpdate(patientId, toothNumber, req.body, userId);

    await logAction(req, {
      action: `updated tooth ${toothNumber}`,
      entityType: 'ToothRecord',
      entityId: updated._id,
      patient: patientId,
      newValue: { condition: req.body.condition, treatment: req.body.treatment, notes: req.body.notes },
    });

    return res.json({
      message: `Tooth #${toothNumber} updated successfully`,
      record: updated,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/tooth-chart/:patientId/bulk
async function bulkUpdateTeeth(req, res, next) {
  try {
    const { patientId } = req.params;
    const { teeth, condition, treatment, notes, consultationId } = req.body;
    const userId = req.user ? req.user._id : undefined;

    if (req.user && req.user.role === 'doctor') {
      const allowed = await canDoctorAccessPatient(req.user._id, patientId);
      if (!allowed) {
        return res.status(403).json({
          message: 'Access denied. You can only update tooth records for patients assigned to you via appointments or consultations.',
        });
      }
    }

    if (!Array.isArray(teeth) || teeth.length === 0) {
      return res.status(400).json({ message: 'Array of teeth is required for bulk update.' });
    }

    const updatedRecords = [];
    for (const tNum of teeth) {
      const rec = await applyToothUpdate(
        patientId,
        tNum,
        { condition, treatment, notes, consultationId },
        userId
      );
      updatedRecords.push(rec);
    }

    await logAction(req, {
      action: `bulk updated teeth #${teeth.join(', #')}`,
      entityType: 'ToothRecord',
      patient: patientId,
      newValue: { teeth, condition, treatment, notes },
    });

    return res.json({
      message: `${updatedRecords.length} teeth updated successfully`,
      records: updatedRecords,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPatientToothChart,
  updateToothRecord,
  bulkUpdateTeeth,
  applyToothUpdate,
};
