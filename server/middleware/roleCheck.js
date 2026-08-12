// Usage: router.post('/patients', protect, allowRoles('receptionist', 'admin'), handler)
//
// This is the backend enforcement of the PRD's role rules (section 4 / 34).
// The frontend hides buttons for UX, but this middleware is what actually
// prevents a Doctor token from, say, creating an appointment even if the
// request is sent directly to the API.
function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. This action requires one of the following roles: ${roles.join(', ')}.`,
      });
    }
    next();
  };
}

module.exports = allowRoles;
