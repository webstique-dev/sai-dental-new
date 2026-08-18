const User = require('../models/User');
const ClinicSettings = require('../models/ClinicSettings');
const { logAction } = require('../middleware/auditLog');
const { emitUserStatusUpdate } = require('../utils/socket');

// All routes here are mounted behind protect + allowRoles('admin') in routes/userRoutes.js
// per PRD section 27 (Admin User Management) and section 4 (only Admin manages users/roles).

// GET /api/users?role=
async function listUsers(req, res) {
  const filter = {};
  if (req.query.role) {
    filter.role = req.query.role;
  }
  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json({ users: users.map((u) => u.toSafeObject()) });
}

// POST /api/users
async function createUser(req, res) {
  const { name, email, phone, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Name, email, password, and role are required.' });
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return res.status(409).json({ message: 'A user with this email already exists.' });
  }

  const user = await User.create({ name, email, phone, password, role });
  res.status(201).json({ user: user.toSafeObject() });
}

// PATCH /api/users/:id
async function updateUser(req, res) {
  const { name, phone, role, status } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const oldRole = user.role;
  const isRoleChanged = role !== undefined && role !== oldRole;

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (role !== undefined) user.role = role;
  if (status !== undefined) user.status = status;

  await user.save();

  if (isRoleChanged) {
    await logAction(req, {
      action: 'changed user role',
      entityType: 'User',
      entityId: user._id,
      previousValue: { role: oldRole },
      newValue: { role: user.role, name: user.name },
    });
  }

  res.json({ user: user.toSafeObject() });
}

// POST /api/users/:id/reset-password
async function resetPassword(req, res) {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters.' });
  }

  const user = await User.findById(req.params.id).select('+password');
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  user.password = newPassword; // pre-save hook re-hashes
  await user.save();
  res.json({ message: 'Password reset successfully.' });
}

// PATCH /api/users/:id/disable
async function disableUser(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Prevent admin from deactivating their own account
    if (req.user && req.user._id && req.user._id.toString() === user._id.toString()) {
      return res.status(400).json({ message: 'You cannot deactivate your own active user account.' });
    }

    const isCurrentlyActive = (user.status || 'active').toLowerCase() === 'active';
    user.status = isCurrentlyActive ? 'inactive' : 'active';
    await user.save();

    const isNowActive = user.status === 'active';

    await logAction(
      req.user?._id || user._id,
      isNowActive ? 'USER_ENABLED' : 'USER_DISABLED',
      `User ${user.name} status changed to ${isNowActive ? 'Active' : 'Inactive'}`,
      { targetUserId: user._id }
    ).catch(() => {});

    const safeUser = user.toSafeObject();
    emitUserStatusUpdate(safeUser);

    return res.json({
      message: `User ${user.name} is now ${isNowActive ? 'Active' : 'Inactive'}.`,
      user: safeUser,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update user status.' });
  }
}

// GET /api/users/doctors (accessible by Receptionist, Admin, Doctor)
async function listDoctors(req, res) {
  try {
    const [doctors, settings] = await Promise.all([
      User.find({ role: 'doctor', status: 'active' }).select('name email phone specialization role status'),
      ClinicSettings.findOne().populate('primaryDoctor', 'name email phone specialization role status'),
    ]);

    const doctorsMap = new Map();

    // 1. If Primary Doctor is set, add primary doctor first
    if (settings && settings.primaryDoctor) {
      const pd = settings.primaryDoctor;
      const pdIdStr = pd._id.toString();
      doctorsMap.set(pdIdStr, {
        _id: pd._id,
        id: pd._id,
        name: pd.name,
        email: pd.email,
        phone: pd.phone,
        specialization: pd.specialization,
        role: pd.role,
        status: pd.status,
        isPrimary: true,
      });
    }

    // 2. Add remaining active doctors (deduplicating if already present)
    doctors.forEach((d) => {
      const dIdStr = d._id.toString();
      if (!doctorsMap.has(dIdStr)) {
        doctorsMap.set(dIdStr, {
          _id: d._id,
          id: d._id,
          name: d.name,
          email: d.email,
          phone: d.phone,
          specialization: d.specialization,
          role: d.role,
          status: d.status,
          isPrimary: false,
        });
      } else {
        const existing = doctorsMap.get(dIdStr);
        existing.isPrimary = true;
      }
    });

    const doctorList = Array.from(doctorsMap.values());

    res.json({
      doctors: doctorList,
      primaryDoctorId: settings?.primaryDoctor?._id || null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch doctors' });
  }
}

module.exports = { listUsers, createUser, updateUser, resetPassword, disableUser, listDoctors };
