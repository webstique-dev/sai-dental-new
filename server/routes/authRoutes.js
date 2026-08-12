const express = require('express');
const { login, signup, getMe, logout } = require('../controllers/authController');
const protect = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/signup', signup);
router.post('/logout', logout);
router.get('/me', protect, getMe);

module.exports = router;
