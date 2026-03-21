const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Verify Session ID for students
      if (decoded.role === 'STUDENT' && decoded.sessionId) {
        const student = await prisma.student.findUnique({ where: { id: decoded.id } });
        if (!student || student.currentSessionId !== decoded.sessionId) {
          return res.status(401).json({ success: false, message: 'Session invalidated. You logged in from another device.' });
        }
      }

      // Add user info to request
      req.user = decoded;

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Not authorized as an admin' });
  }
};

module.exports = { protect, adminOnly };
