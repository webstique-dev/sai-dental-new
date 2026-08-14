const TreatmentPlan = require('../models/TreatmentPlan');
const TreatmentRecord = require('../models/TreatmentRecord');
const Consultation = require('../models/Consultation');

async function updateConsultationTotals(consultationId) {
  if (!consultationId) return;
  try {
    const [plans, records] = await Promise.all([
      TreatmentPlan.find({ consultation: consultationId, isDeleted: { $ne: true } }),
      TreatmentRecord.find({ consultation: consultationId, isDeleted: { $ne: true } }),
    ]);

    const totalEstimatedCharges = plans.reduce((sum, p) => sum + (p.estimatedCost || 0), 0);
    const totalPerformedCharges = records.reduce((sum, r) => sum + (r.charges || 0), 0);

    await Consultation.findByIdAndUpdate(consultationId, {
      totalEstimatedCharges,
      totalPerformedCharges,
    });
  } catch (err) {
    console.error('Error updating consultation totals:', err);
  }
}

module.exports = {
  updateConsultationTotals,
};
