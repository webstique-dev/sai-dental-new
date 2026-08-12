const DoctorProfile = require('../models/DoctorProfile');
const User = require('../models/User');
const Consultation = require('../models/Consultation');
const TreatmentPlan = require('../models/TreatmentPlan');
const FollowUp = require('../models/FollowUp');

const defaultWorkingHours = [
  { day: 'Monday', startTime: '09:00', endTime: '18:00', isAvailable: true },
  { day: 'Tuesday', startTime: '09:00', endTime: '18:00', isAvailable: true },
  { day: 'Wednesday', startTime: '09:00', endTime: '18:00', isAvailable: true },
  { day: 'Thursday', startTime: '09:00', endTime: '18:00', isAvailable: true },
  { day: 'Friday', startTime: '09:00', endTime: '18:00', isAvailable: true },
  { day: 'Saturday', startTime: '09:00', endTime: '17:00', isAvailable: true },
  { day: 'Sunday', startTime: '10:00', endTime: '14:00', isAvailable: false },
];

// GET /api/doctor-profiles
async function listDoctorProfiles(req, res, next) {
  try {
    const doctors = await User.find({ role: 'doctor' }).select('name email phone status role specialization');

    const profiles = await DoctorProfile.find().populate('user', 'name email phone status role specialization');
    const profileMap = {};
    profiles.forEach((p) => {
      if (p.user) {
        const uId = p.user._id.toString();
        profileMap[uId] = p;
      }
    });

    const merged = doctors.map((doc) => {
      const docId = doc._id.toString();
      const existingProfile = profileMap[docId];
      if (existingProfile) {
        return existingProfile;
      }
      return {
        _id: null,
        user: doc,
        specialization: doc.specialization || 'General Dentistry',
        qualification: 'BDS',
        workingHours: defaultWorkingHours,
        consultationFee: 500,
      };
    });

    return res.json({ profiles: merged });
  } catch (err) {
    next(err);
  }
}

// GET /api/doctor-profiles/:userId
async function getDoctorProfileByUserId(req, res, next) {
  try {
    const { userId } = req.params;
    const userDoc = await User.findById(userId).select('name email phone status role specialization');

    if (!userDoc || userDoc.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor user account not found.' });
    }

    let profile = await DoctorProfile.findOne({ user: userId }).populate('user', 'name email phone status role specialization');
    if (!profile) {
      profile = {
        _id: null,
        user: userDoc,
        specialization: userDoc.specialization || 'General Dentistry',
        qualification: 'BDS',
        workingHours: defaultWorkingHours,
        consultationFee: 500,
      };
    }

    return res.json({ profile });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/doctor-profiles/:userId (Upsert)
async function upsertDoctorProfile(req, res, next) {
  try {
    const { userId } = req.params;
    const { specialization, qualification, workingHours, consultationFee } = req.body;

    const userDoc = await User.findById(userId);
    if (!userDoc || userDoc.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor user account not found.' });
    }

    let profile = await DoctorProfile.findOne({ user: userId });

    if (!profile) {
      profile = new DoctorProfile({
        user: userId,
        specialization: specialization || userDoc.specialization || 'General Dentistry',
        qualification: qualification || 'BDS',
        workingHours: Array.isArray(workingHours) ? workingHours : defaultWorkingHours,
        consultationFee: consultationFee !== undefined ? Number(consultationFee) : 500,
      });
    } else {
      if (specialization !== undefined) profile.specialization = specialization.trim();
      if (qualification !== undefined) profile.qualification = qualification.trim();
      if (Array.isArray(workingHours)) profile.workingHours = workingHours;
      if (consultationFee !== undefined) profile.consultationFee = Number(consultationFee);
    }

    await profile.save();

    // Also update User.specialization if updated
    if (specialization !== undefined) {
      userDoc.specialization = specialization.trim();
      await userDoc.save();
    }

    const populated = await DoctorProfile.findById(profile._id).populate('user', 'name email phone status role specialization');

    return res.json({
      message: 'Doctor profile updated successfully',
      profile: populated,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/doctor-profiles/:userId/stats
async function getDoctorStats(req, res, next) {
  try {
    const { userId } = req.params;

    // Distinct patients handled across doctor's consultations
    const uniquePatients = await Consultation.distinct('patient', { doctor: userId });

    // Consultations count
    const consultationsCount = await Consultation.countDocuments({ doctor: userId });

    // Completed treatment plans recorded by doctor
    const treatmentsCompleted = await TreatmentPlan.countDocuments({
      $or: [{ recordedBy: userId }, { doctor: userId }],
      status: 'Completed',
    });

    // Follow-ups assigned to doctor
    const followUpsCount = await FollowUp.countDocuments({ doctor: userId });

    return res.json({
      stats: {
        patientsHandled: uniquePatients.length,
        consultationsCount,
        treatmentsCompleted,
        followUpsCount,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listDoctorProfiles,
  getDoctorProfileByUserId,
  upsertDoctorProfile,
  getDoctorStats,
};
