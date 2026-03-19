const express = require('express');
const router = express.Router();
const { startExam, submitExam, saveState, getLeaderboard } = require('../controllers/studentExamController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:examId/start', protect, startExam);
router.post('/:examId/submit', protect, submitExam);
router.patch('/:examId/save-state', protect, saveState);
router.get('/:examId/leaderboard', protect, getLeaderboard);

module.exports = router;
