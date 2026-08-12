const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verifies the Bearer token, loads the user, and rejects disabled accounts.
// Every protected route in the system must apply this before roleCheck.
async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Not authorized. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'Not authorized. User no longer exists.' });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({ message: 'This account has been disabled.' });
    }

    req.user = user; // full mongoose doc, password excluded by schema select:false
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized. Invalid or expired token.' });
  }
}

module.exports = protect;
