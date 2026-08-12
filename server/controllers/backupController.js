const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Invoice = require('../models/Invoice');
const FollowUp = require('../models/FollowUp');
const Consultation = require('../models/Consultation');
const Diagnosis = require('../models/Diagnosis');
const TreatmentPlan = require('../models/TreatmentPlan');
const Prescription = require('../models/Prescription');
const ClinicSettings = require('../models/ClinicSettings');
const { generateBackupWorkbook } = require('../utils/generateBackupWorkbook');

// FUTURE ENHANCEMENT: Scheduled/automatic backups (e.g., node-cron job to S3/Cloud Storage)
// and database restore/import infrastructure are planned for future phases.

// GET /api/backup/export
async function exportBackup(req, res, next) {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const filename = `clinic-backup-${todayStr}.xlsx`;

    // Fetch all clinical and operational collections with populate for readable names
    const [
      patients,
      appointments,
      invoices,
      treatmentPlans,
      consultations,
      diagnoses,
      prescriptions,
      followUps,
      settingsDoc,
    ] = await Promise.all([
      Patient.find().sort({ createdAt: -1 }),
      Appointment.find().populate('patient', 'firstName lastName').populate('doctor', 'name'),
      Invoice.find().populate('patient', 'firstName lastName').populate('doctor', 'name'),
      TreatmentPlan.find().populate('patient', 'firstName lastName'),
      Consultation.find().populate('patient', 'firstName lastName').populate('doctor', 'name'),
      Diagnosis.find().populate('patient', 'firstName lastName'),
      Prescription.find().populate('patient', 'firstName lastName'),
      FollowUp.find().populate('patient', 'firstName lastName'),
      ClinicSettings.findOne(),
    ]);

    const data = {
      patients,
      appointments,
      invoices,
      treatmentPlans,
      consultations,
      diagnoses,
      prescriptions,
      followUps,
      settings: settingsDoc,
    };

    const workbook = await generateBackupWorkbook(data, req.user);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    return res.end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  exportBackup,
};
