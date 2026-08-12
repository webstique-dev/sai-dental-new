const Appointment = require('../models/Appointment');
const QueueEntry = require('../models/QueueEntry');
const Patient = require('../models/Patient');
const FollowUp = require('../models/FollowUp');

function getTodayDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

// GET /api/reports/reception-summary
async function getReceptionSummary(req, res, next) {
  try {
    const { start, end } = getTodayDateRange();

    // 1. Today's Appointments count
    const todaysAppointments = await Appointment.countDocuments({
      date: { $gte: start, $lte: end },
    });

    // 2. Patients Waiting count today (status Waiting or Checked-In)
    const patientsWaiting = await QueueEntry.countDocuments({
      date: { $gte: start, $lte: end },
      status: { $in: ['Waiting', 'Checked-In'] },
    });

    // 3. New Registrations count created/registered today
    const newRegistrations = await Patient.countDocuments({
      $or: [
        { registrationDate: { $gte: start, $lte: end } },
        { createdAt: { $gte: start, $lte: end } },
      ],
    });

    // 4. Follow-Ups Due count (status Pending & recommendedDate <= end of today)
    const followUpsDue = await FollowUp.countDocuments({
      status: 'Pending',
      recommendedDate: { $lte: end },
    });

    return res.json({
      todaysAppointments,
      patientsWaiting,
      newRegistrations,
      followUpsDue,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getReceptionSummary,
};
