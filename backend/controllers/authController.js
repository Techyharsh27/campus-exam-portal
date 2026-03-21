const authService = require('../services/authService');

const registerStudent = async (req, res) => {
  try {
    const data = await authService.registerStudent(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const logger = require('../config/logger');

const loginStudent = async (req, res) => {
  const { email } = req.body;
  logger.info(`Login attempt for student: ${email}`);
  try {
    const { email, password } = req.body;
    const data = await authService.loginStudent(email, password);
    logger.info(`Successful login for student: ${email}`);
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error(`Failed login attempt for student: ${email} - Error: ${error.message}`);
    res.status(401).json({ success: false, message: error.message });
  }
};

const loginAdmin = async (req, res) => {
  const { username } = req.body;
  logger.info(`Login attempt for admin: ${username}`);
  try {
    const { username, password } = req.body;
    const data = await authService.loginAdmin(username, password);
    logger.info(`Successful login for admin: ${username}`);
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error(`Failed login attempt for admin: ${username} - Error: ${error.message}`);
    res.status(401).json({ success: false, message: error.message });
  }
};

const getMe = async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    await authService.forgotPassword(email);
    // Always return success to prevent email enumeration
    res.status(200).json({
      success: true,
      message: 'If that email is registered, a password reset link has been sent.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and password are required' });
    }
    await authService.resetPassword(token, password);
    res.status(200).json({ success: true, message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  registerStudent,
  loginStudent,
  loginAdmin,
  getMe,
  forgotPassword,
  resetPassword,
};
