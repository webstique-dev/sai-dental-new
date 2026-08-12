const User = require('../models/User');
const generateToken = require('../utils/generateToken');

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

  if (user.status === 'disabled') {
    return res.status(403).json({ message: 'This account has been disabled. Contact your administrator.' });
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

// GET /api/auth/me
async function getMe(req, res) {
  res.json({ user: req.user.toSafeObject() });
}

// POST /api/auth/logout
// Stateless JWT: logout is handled client-side by discarding the token.
// This endpoint exists so the frontend has a consistent call to make,
// and so it's easy to extend later with token-blocklisting if needed.
async function logout(req, res) {
  res.json({ message: 'Logged out successfully.' });
}

module.exports = { login, getMe, logout };
