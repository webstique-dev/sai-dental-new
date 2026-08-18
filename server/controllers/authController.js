const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { validateUserData } = require('../middleware/inputValidation');

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const userStatus = (user.status || 'active').toLowerCase();
  if (userStatus === 'disabled' || userStatus === 'inactive') {
    return res.status(403).json({ message: 'Your account has been deactivated. Please contact the administrator.' });
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const token = generateToken(user);

  res.json({
    token,
    user: user.toSafeObject(),
  });
}

// POST /api/auth/signup (Public registration)
async function signup(req, res, next) {
  try {
    const { name, email, phone, password, role } = req.body;

    const errors = validateUserData(req.body, false);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors[0], errors });
    }

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password, and role are required.' });
    }

    const validRoles = User.ROLES || ['admin', 'receptionist', 'doctor'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role selected.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ message: 'A user account with this email already exists.' });
    }

    const user = new User({
      name: name.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : '',
      password,
      role,
      status: 'active',
    });

    await user.save();

    const token = generateToken(user);

    return res.status(201).json({
      token,
      user: user.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
async function getMe(req, res) {
  res.json({ user: req.user.toSafeObject() });
}

// POST /api/auth/logout
async function logout(req, res) {
  res.json({ message: 'Logged out successfully.' });
}

module.exports = { login, signup, getMe, logout };
