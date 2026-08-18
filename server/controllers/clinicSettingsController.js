const ClinicSettings = require('../models/ClinicSettings');

const defaultWorkingHours = [
  { day: 'Monday', open: '09:00', close: '18:00', isOpen: true },
  { day: 'Tuesday', open: '09:00', close: '18:00', isOpen: true },
  { day: 'Wednesday', open: '09:00', close: '18:00', isOpen: true },
  { day: 'Thursday', open: '09:00', close: '18:00', isOpen: true },
  { day: 'Friday', open: '09:00', close: '18:00', isOpen: true },
  { day: 'Saturday', open: '09:00', close: '17:00', isOpen: true },
  { day: 'Sunday', open: '10:00', close: '14:00', isOpen: false },
];

// GET /api/settings (singleton read - creates default if none exists)
async function getSettings(req, res, next) {
  try {
    let settings = await ClinicSettings.findOne()
      .populate('updatedBy', 'name email role')
      .populate('primaryDoctor', 'name email role phone specialization status');
    if (!settings) {
      settings = new ClinicSettings({
        workingHours: defaultWorkingHours,
      });
      await settings.save();
    }
    return res.json({ settings });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/settings (singleton update - protect + allowRoles('admin'))
async function updateSettings(req, res, next) {
  try {
    let settings = await ClinicSettings.findOne();
    if (!settings) {
      settings = new ClinicSettings({
        workingHours: defaultWorkingHours,
      });
    }

    const {
      clinicName,
      address,
      phone,
      email,
      primaryDoctor,
      workingHours,
      appointmentSlotDurationMinutes,
      taxRate,
      currency,
    } = req.body;

    if (clinicName !== undefined) settings.clinicName = clinicName;
    if (address !== undefined) settings.address = address;
    if (phone !== undefined) settings.phone = phone;
    if (email !== undefined) settings.email = email;
    if (primaryDoctor !== undefined) settings.primaryDoctor = primaryDoctor || null;
    if (workingHours !== undefined) settings.workingHours = workingHours;
    if (appointmentSlotDurationMinutes !== undefined) {
      settings.appointmentSlotDurationMinutes = Number(appointmentSlotDurationMinutes) || 30;
    }
    if (taxRate !== undefined) settings.taxRate = Number(taxRate) || 0;
    if (currency !== undefined) settings.currency = currency;

    if (req.user) {
      settings.updatedBy = req.user._id;
    }

    await settings.save();
    const updated = await ClinicSettings.findById(settings._id)
      .populate('updatedBy', 'name email role')
      .populate('primaryDoctor', 'name email role phone specialization status');

    return res.json({
      message: 'Clinic settings updated successfully.',
      settings: updated,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSettings,
  updateSettings,
};
