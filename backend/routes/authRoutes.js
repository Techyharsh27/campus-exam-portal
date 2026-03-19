const express = require('express');
const router = express.Router();
const {
  registerStudent,
  loginStudent,
  loginAdmin,
  getMe,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const { body } = require('express-validator');
const validate = require('../middleware/validateMiddleware');

const registerValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('rollNumber').notEmpty().withMessage('Roll number is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/student/register', validate(registerValidation), registerStudent);
router.post('/student/login', validate(loginValidation), loginStudent);
router.post('/admin/login', loginAdmin);
router.get('/me', protect, getMe);
router.post('/forgot-password', [body('email').isEmail()], validate([]), forgotPassword);
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 })
], validate([]), resetPassword);

module.exports = router;
