const express = require('express');
const { login, getMe, logout } = require('../controllers/authController');
const protect = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getMe);

module.exports = router;
