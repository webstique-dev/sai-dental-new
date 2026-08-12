const AuditLog = require('../models/AuditLog');

async function logAction(req, { action, entityType, entityId, patient, previousValue, newValue }) {
  try {
    const userId = req?.user?._id || req?.user?.id || null;
    const role = req?.user?.role || 'system';

    const logEntry = new AuditLog({
      user: userId,
      role,
      action,
      entityType,
      entityId: entityId || null,
      patient: patient || null,
      previousValue: previousValue !== undefined ? previousValue : null,
      newValue: newValue !== undefined ? newValue : null,
      timestamp: new Date(),
    });

    await logEntry.save();
  } catch (err) {
    console.error('AuditLog recording exception:', err);
    // Non-blocking log recording helper ensures main response logic never fails
  }
}

module.exports = { logAction };
