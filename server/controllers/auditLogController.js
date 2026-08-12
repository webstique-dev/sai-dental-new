const AuditLog = require('../models/AuditLog');

// GET /api/audit-logs?user=&role=&patient=&entityType=&dateFrom=&dateTo=&page=&limit=
async function listAuditLogs(req, res, next) {
  try {
    const {
      user,
      role,
      patient,
      entityType,
      dateFrom,
      dateTo,
      page = 1,
      limit = 30,
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 30;
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (user) {
      filter.user = user;
    }
    if (role) {
      filter.role = role;
    }
    if (patient) {
      filter.patient = patient;
    }
    if (entityType) {
      filter.entityType = entityType;
    }

    if (dateFrom || dateTo) {
      filter.timestamp = {};
      if (dateFrom) {
        filter.timestamp.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        // End of the selected date to include whole day
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        filter.timestamp.$lte = end;
      }
    }

    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1, _id: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('user', 'name email role')
      .populate('patient', 'firstName lastName opNumber phone');

    return res.json({
      logs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listAuditLogs,
};
