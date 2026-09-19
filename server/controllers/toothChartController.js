const ToothRecord = require('../models/ToothRecord');
const { checkConsultationNotClosed } = require('./consultationController');
const { logAction } = require('../middleware/auditLog');
const { canDoctorAccessPatient } = require('../utils/patientAuth');

const ALL_PERMANENT_TEETH = [
  // Upper Right (18 - 11)
  18, 17, 16, 15, 14, 13, 12, 11,
  // Upper Left (21 - 28)
  21, 22, 23, 24, 25, 26, 27, 28,
  // Lower Right (48 - 41)
  48, 47, 46, 45, 44, 43, 42, 41,
  // Lower Left (31 - 38)
  31, 32, 33, 34, 35, 36, 37, 38,
];

const ALL_PRIMARY_TEETH = [
  // Upper Right Primary (55 - 51)
  55, 54, 53, 52, 51,
  // Upper Left Primary (61 - 65)
  61, 62, 63, 64, 65,
  // Lower Right Primary (85 - 81)
  85, 84, 83, 82, 81,
  // Lower Left Primary (71 - 75)
  71, 72, 73, 74, 75,
];

const ALL_FDI_TEETH = [...ALL_PERMANENT_TEETH, ...ALL_PRIMARY_TEETH];

// GET /api/tooth-chart/:patientId (Returns all FDI teeth for permanent and primary dentition)
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
      .populate('history.deletedBy', 'name email')
      .sort({ toothNumber: 1 });

    const recordMap = {};
    records.forEach((r) => {
      recordMap[r.toothNumber] = r.toObject ? r.toObject() : r;
    });

    const allToothNumbers = Array.from(
      new Set([...ALL_FDI_TEETH, ...Object.keys(recordMap).map(Number)])
    );

    const fullChart = allToothNumbers.map((tNum) => {
      if (recordMap[tNum]) {
        const item = recordMap[tNum];
        if (item.currentCondition) {
          item.currentCondition = sanitizeCondition(item.currentCondition).formatted;
        }
        if (Array.isArray(item.history)) {
          item.history = item.history.map((h) => ({
            ...h,
            condition: h.condition ? sanitizeCondition(h.condition).formatted : 'Healthy [H]',
          }));
        }
        return item;
      }
      return {
        patient: patientId,
        toothNumber: tNum,
        currentCondition: 'Healthy [H]',
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

  const sanitized = sanitizeCondition(condition);
  const finalCondition = sanitized.formatted;

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
      currentCondition: finalCondition,
      history: [],
    });
  }

  const historyItem = {
    condition: finalCondition,
    treatment: treatment || '',
    date: new Date(),
    doctor: userId || undefined,
    notes: notes || '',
    consultation: consultationId || null,
  };

  // Critical rule: PUSH new entry onto history, NEVER overwrite prior entries
  record.history.push(historyItem);
  record.currentCondition = finalCondition;

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

// PUT /api/tooth-chart/:patientId/:toothNumber/history/:historyId & PATCH
async function updateToothHistoryEntry(req, res, next) {
  try {
    const { patientId, toothNumber, historyId } = req.params;
    const { condition, treatment, notes, date } = req.body;

    const record = await ToothRecord.findOne({
      patient: patientId,
      toothNumber: Number(toothNumber),
    });

    if (!record) {
      return res.status(404).json({ message: 'Tooth record not found' });
    }

    const item = record.history.id(historyId);
    if (!item) {
      return res.status(404).json({ message: 'Tooth history log entry not found' });
    }

    if (condition !== undefined) item.condition = String(condition).trim() || 'Healthy';
    if (treatment !== undefined) item.treatment = String(treatment).trim();
    if (notes !== undefined) item.notes = String(notes).trim();
    if (date !== undefined) item.date = new Date(date);
    if (req.user) item.doctor = req.user._id;

    // Sort history by date descending to find latest
    const sorted = [...record.history].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    if (sorted.length > 0) {
      record.currentCondition = sorted[0].condition || 'Healthy';
    }

    await record.save();

    const populated = await ToothRecord.findById(record._id).populate('history.doctor', 'name email');

    return res.json({
      message: `Tooth #${toothNumber} history entry updated successfully`,
      record: populated,
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/tooth-chart/:patientId/:toothNumber/history/:historyId (or /history)
async function deleteToothHistoryEntry(req, res, next) {
  try {
    const { patientId, toothNumber, historyId } = req.params;

    if (req.user && req.user.role === 'doctor') {
      const allowed = await canDoctorAccessPatient(req.user._id, patientId);
      if (!allowed) {
        return res.status(403).json({
          message: 'Access denied. You can only modify tooth records for patients assigned to you.',
        });
      }
    }

    const record = await ToothRecord.findOne({
      patient: patientId,
      toothNumber: Number(toothNumber),
    });

    if (!record) {
      return res.status(404).json({ message: 'Tooth record not found' });
    }

    const activeHistory = record.history.filter((h) => !h.deleted);
    const sorted = [...activeHistory].sort(
      (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
    );

    if (sorted.length === 0) {
      return res.status(400).json({ message: `No active history entries found for Tooth #${toothNumber}.` });
    }

    const latestEntry = sorted[0];
    if (historyId && historyId !== 'last' && String(latestEntry._id) !== String(historyId)) {
      return res.status(400).json({
        message: `Only the most recently added history entry for Tooth #${toothNumber} can be removed.`,
      });
    }

    const item = record.history.id(latestEntry._id);
    if (!item) {
      return res.status(404).json({ message: 'Tooth history log entry not found' });
    }

    // Soft delete audit trail
    item.deleted = true;
    item.deletedAt = new Date();
    item.deletedBy = req.user ? req.user._id : undefined;

    // Recompute current condition from newest remaining non-deleted history entry
    const remaining = record.history.filter(
      (h) => !h.deleted && String(h._id) !== String(item._id)
    );
    const sortedRemaining = [...remaining].sort(
      (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
    );
    record.currentCondition =
      sortedRemaining.length > 0 ? sortedRemaining[0].condition || 'Healthy' : 'Healthy';

    await record.save();

    await logAction(req, {
      action: `soft-deleted latest history entry for tooth ${toothNumber}`,
      entityType: 'ToothRecord',
      entityId: record._id,
      patient: patientId,
      oldValue: {
        condition: item.condition,
        treatment: item.treatment,
        notes: item.notes,
        date: item.date,
      },
    });

    const populated = await ToothRecord.findById(record._id)
      .populate('history.doctor', 'name email')
      .populate('history.deletedBy', 'name email');

    return res.json({
      message: `Most recent history entry for Tooth #${toothNumber} removed successfully`,
      record: populated,
    });
  } catch (err) {
    next(err);
  }
}

const ToothCondition = require('../models/ToothCondition');

const DEFAULT_CONDITIONS = [
  { name: 'Healthy', code: 'H', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', isDefault: true },
  { name: 'Caries', code: 'D', color: 'bg-rose-100 text-rose-800 border-rose-300', isDefault: true },
  { name: 'Decayed', code: 'Dec', color: 'bg-rose-100 text-rose-800 border-rose-300', isDefault: true },
  { name: 'Filling', code: 'F', color: 'bg-blue-100 text-blue-800 border-blue-300', isDefault: true },
  { name: 'RCT', code: 'RCT', color: 'bg-purple-100 text-purple-800 border-purple-300', isDefault: true },
  { name: 'Crown', code: 'Cr', color: 'bg-amber-100 text-amber-800 border-amber-300', isDefault: true },
  { name: 'Bridge', code: 'Br', color: 'bg-amber-100 text-amber-800 border-amber-300', isDefault: true },
  { name: 'Implant', code: 'I', color: 'bg-cyan-100 text-cyan-800 border-cyan-300', isDefault: true },
  { name: 'Missing', code: 'M', color: 'bg-slate-200 text-slate-600 border-slate-300 opacity-60', isDefault: true },
  { name: 'Extraction', code: 'X', color: 'bg-slate-200 text-slate-600 border-slate-300 opacity-60', isDefault: true },
  { name: 'Restored', code: 'Res', color: 'bg-teal-100 text-teal-800 border-teal-300', isDefault: true },
  { name: 'Prosthetic', code: 'P', color: 'bg-indigo-100 text-indigo-800 border-indigo-300', isDefault: true },
  { name: 'Mobility', code: 'Mob', color: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300', isDefault: true },
  { name: 'Other', code: 'O', color: 'bg-gray-100 text-gray-800 border-gray-300', isDefault: true },
];

// Helper to sanitize condition strings and strip duplicate [bracket] tags (e.g. "Moha [ME] [ME]" -> { name: "Moha", code: "ME", formatted: "Moha [ME]" })
function sanitizeCondition(raw) {
  if (!raw || typeof raw !== 'string') return { name: 'Healthy', code: 'H', formatted: 'Healthy [H]' };
  
  const bracketMatches = raw.match(/\[(.*?)\]/g);
  let code = '';
  if (bracketMatches && bracketMatches.length > 0) {
    code = bracketMatches[0].replace(/[\[\]]/g, '').trim().toUpperCase();
  }
  
  const cleanName = raw.replace(/\[.*?\]/g, '').trim() || 'Healthy';
  if (!code) {
    code = cleanName.slice(0, 3).toUpperCase();
  }
  
  return {
    name: cleanName,
    code,
    formatted: `${cleanName} [${code}]`,
  };
}

async function seedDefaultConditionsIfEmpty() {
  for (const def of DEFAULT_CONDITIONS) {
    const exists = await ToothCondition.findOne({
      name: { $regex: new RegExp(`^${def.name}$`, 'i') },
    });
    if (!exists) {
      await ToothCondition.create(def);
    }
  }
}

// GET /api/tooth-chart/conditions - Returns all active (non-deleted) tooth conditions
async function getToothConditions(req, res, next) {
  try {
    await seedDefaultConditionsIfEmpty();

    // Clean up any old corrupted conditions in DB (e.g. names stored with duplicate bracket tags)
    const allConditions = await ToothCondition.find();
    for (const c of allConditions) {
      if (c.name.includes('[') || c.name.includes(']')) {
        const parsed = sanitizeCondition(c.name);
        c.name = parsed.name;
        c.code = c.code || parsed.code;
        await c.save();
      }
    }

    const conditions = await ToothCondition.find({ isDeleted: { $ne: true } }).sort({ isDefault: -1, createdAt: 1 });
    
    // Strictly deduplicate by normalized name
    const seenNames = new Set();
    const uniqueConditions = [];
    for (const c of conditions) {
      const lower = c.name.toLowerCase().trim();
      if (!seenNames.has(lower)) {
        seenNames.add(lower);
        uniqueConditions.push(c);
      }
    }

    const formattedOptions = uniqueConditions.map((c) => `${c.name}${c.code ? ` [${c.code}]` : ''}`);

    return res.json({
      conditions: uniqueConditions.map((c) => ({
        _id: c._id,
        name: c.name,
        code: c.code,
        color: c.color,
        isDefault: c.isDefault,
        formatted: `${c.name}${c.code ? ` [${c.code}]` : ''}`,
      })),
      conditionNames: uniqueConditions.map((c) => c.name),
      options: formattedOptions,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/tooth-chart/conditions - Create or reactivate a condition
async function createToothCondition(req, res, next) {
  try {
    const { name, code, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Condition name is required.' });
    }

    const sanitized = sanitizeCondition(name);
    const cleanName = sanitized.name;
    const formattedCode = code ? code.replace(/[\[\]]/g, '').trim().toUpperCase() : sanitized.code;

    let existing = await ToothCondition.findOne({
      name: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    if (existing) {
      if (existing.isDeleted) {
        // Reactivate soft-deleted condition
        existing.isDeleted = false;
        existing.deletedAt = null;
        existing.deletedBy = null;
        existing.code = formattedCode;
        if (color) existing.color = color;
        await existing.save();
        return res.json({ message: `Condition "${existing.name}" restored successfully.`, condition: existing });
      }
      return res.status(400).json({ message: `Condition "${existing.name}" already exists.` });
    }

    const created = await ToothCondition.create({
      name: cleanName,
      code: formattedCode,
      color: color || 'bg-indigo-100 text-indigo-800 border-indigo-300',
      createdBy: req.user ? req.user._id : undefined,
    });

    await logAction(req, {
      action: `created condition ${created.name}`,
      entityType: 'ToothCondition',
      entityId: created._id,
      newValue: { name: created.name, code: created.code },
    });

    return res.status(201).json({ message: 'Condition created successfully.', condition: created });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/tooth-chart/conditions/:conditionId - Soft delete a condition from active use
async function deleteToothCondition(req, res, next) {
  try {
    const { conditionId } = req.params;

    const sanitized = sanitizeCondition(conditionId);
    const cleanName = sanitized.name;
    const escapedClean = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedRaw = conditionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    let conditionsToSoftDelete = [];

    if (conditionId.match(/^[0-9a-fA-F]{24}$/)) {
      const byId = await ToothCondition.findById(conditionId);
      if (byId) conditionsToSoftDelete.push(byId);
    }

    if (conditionsToSoftDelete.length === 0) {
      conditionsToSoftDelete = await ToothCondition.find({
        $or: [
          { name: { $regex: new RegExp(`^${escapedClean}$`, 'i') } },
          { name: { $regex: new RegExp(`^${escapedRaw}$`, 'i') } },
          { name: { $regex: new RegExp(`^${escapedClean}`, 'i') } },
          { code: { $regex: new RegExp(`^${escapedClean}$`, 'i') } },
        ],
      });
    }

    if (conditionsToSoftDelete.length > 0) {
      for (const cond of conditionsToSoftDelete) {
        cond.isDeleted = true;
        cond.deletedAt = new Date();
        cond.deletedBy = req.user ? req.user._id : undefined;
        await cond.save();

        await logAction(req, {
          action: `soft-deleted condition ${cond.name}`,
          entityType: 'ToothCondition',
          entityId: cond._id,
          oldValue: { name: cond.name, code: cond.code },
        });
      }
    } else {
      // If not previously recorded in ToothCondition collection, register as soft-deleted to keep excluded
      await ToothCondition.create({
        name: cleanName,
        code: sanitized.code,
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user ? req.user._id : undefined,
      });
    }

    return res.json({
      message: `Condition "${cleanName}" has been removed from active conditions.`,
      name: cleanName,
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
  updateToothHistoryEntry,
  deleteToothHistoryEntry,
  getToothConditions,
  createToothCondition,
  deleteToothCondition,
};
