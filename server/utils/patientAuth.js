const Appointment = require('../models/Appointment');
const Consultation = require('../models/Consultation');
const QueueEntry = require('../models/QueueEntry');

async function canDoctorAccessPatient(doctorUserId, patientId) {
  if (!doctorUserId || !patientId) return false;

  const docId = doctorUserId._id ? doctorUserId._id : doctorUserId;

  // 1. Check Appointment assigned to this doctor (active or past)
  const hasAppointment = await Appointment.exists({
    patient: patientId,
    doctor: docId,
    isDeleted: { $ne: true },
  });
  if (hasAppointment) return true;

  // 2. Check Consultation assigned to this doctor (active or past)
  const hasConsultation = await Consultation.exists({
    patient: patientId,
    doctor: docId,
  });
  if (hasConsultation) return true;

  // 3. Check QueueEntry assigned to this doctor (waiting / in progress)
  const hasQueueEntry = await QueueEntry.exists({
    patient: patientId,
    doctor: docId,
  });
  if (hasQueueEntry) return true;

  return false;
}

module.exports = {
  canDoctorAccessPatient,
};
