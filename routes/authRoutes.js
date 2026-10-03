const express = require('express');
const router = express.Router();
const { login, signupStudent, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/signup', signupStudent);
router.post('/signup/student', signupStudent);
router.post('/register', signupStudent);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;
