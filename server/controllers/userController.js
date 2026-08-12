const User = require('../models/User');
const { logAction } = require('../middleware/auditLog');

// All routes here are mounted behind protect + allowRoles('admin') in routes/userRoutes.js
// per PRD section 27 (Admin User Management) and section 4 (only Admin manages users/roles).

// GET /api/users
async function listUsers(req, res) {
  const users = await User.find().sort({ createdAt: -1 });
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
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }
  user.status = user.status === 'active' ? 'disabled' : 'active';
  await user.save();
  res.json({ user: user.toSafeObject() });
}

// GET /api/users/doctors (accessible by Receptionist and Admin)
async function listDoctors(req, res) {
  try {
    const doctors = await User.find({ role: 'doctor', status: 'active' }).select('name email phone specialization role');
    res.json({
      doctors: doctors.map((d) => ({
        _id: d._id,
        id: d._id,
        name: d.name,
        email: d.email,
        phone: d.phone,
        specialization: d.specialization,
        role: d.role,
        status: d.status,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch doctors' });
  }
}

module.exports = { listUsers, createUser, updateUser, resetPassword, disableUser, listDoctors };
