const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const QueueEntry = require('../models/QueueEntry');
const Invoice = require('../models/Invoice');
const FollowUp = require('../models/FollowUp');
const Consultation = require('../models/Consultation');
const Examination = require('../models/Examination');
const ToothRecord = require('../models/ToothRecord');
const Diagnosis = require('../models/Diagnosis');
const TreatmentPlan = require('../models/TreatmentPlan');
const Prescription = require('../models/Prescription');
const Investigation = require('../models/Investigation');
const Document = require('../models/Document');
const ClinicSettings = require('../models/ClinicSettings');

// FUTURE ENHANCEMENT: Scheduled/automatic backups (e.g., node-cron job to S3/Cloud Storage)
// and database restore/import infrastructure are planned for future phases.

// GET /api/backup/export
async function exportBackup(req, res, next) {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const filename = `dental_clinic_backup_${todayStr}.json`;

    // Fetch all clinical and operational collections (excluding sensitive User credentials & AuditLogs)
    const [
      patients,
      appointments,
      queueEntries,
      invoices,
      followUps,
      consultations,
      examinations,
      toothRecords,
      diagnoses,
      treatmentPlans,
      prescriptions,
      investigations,
      documents,
      settings,
    ] = await Promise.all([
      Patient.find().lean(),
      Appointment.find().lean(),
      QueueEntry.find().lean(),
      Invoice.find().lean(),
      FollowUp.find().lean(),
      Consultation.find().lean(),
      Examination.find().lean(),
      ToothRecord.find().lean(),
      Diagnosis.find().lean(),
      TreatmentPlan.find().lean(),
      Prescription.find().lean(),
      Investigation.find().lean(),
      Document.find().lean(),
      ClinicSettings.find().lean(),
    ]);

    const backupPayload = {
      exportMetadata: {
        system: 'Dental Clinic Management System',
        exportedAt: new Date().toISOString(),
        exportedBy: req.user ? req.user.email : 'admin',
        schemaVersion: '1.0',
        counts: {
          patients: patients.length,
          appointments: appointments.length,
          queueEntries: queueEntries.length,
          invoices: invoices.length,
          followUps: followUps.length,
          consultations: consultations.length,
          examinations: examinations.length,
          toothRecords: toothRecords.length,
          diagnoses: diagnoses.length,
          treatmentPlans: treatmentPlans.length,
          prescriptions: prescriptions.length,
          investigations: investigations.length,
          documents: documents.length,
          settings: settings.length,
        },
      },
      collections: {
        patients,
        appointments,
        queueEntries,
        invoices,
        followUps,
        consultations,
        examinations,
        toothRecords,
        diagnoses,
        treatmentPlans,
        prescriptions,
        investigations,
        documents,
        settings,
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.send(JSON.stringify(backupPayload, null, 2));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  exportBackup,
};
