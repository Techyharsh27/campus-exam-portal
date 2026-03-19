const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { reportViolation, unlockAttempt, getLockedAttempts } = require('../controllers/securityController');

router.post('/report-violation', protect, reportViolation);
router.post('/unlock', protect, adminOnly, unlockAttempt);
router.get('/locked-attempts', protect, adminOnly, getLockedAttempts);

module.exports = router;
