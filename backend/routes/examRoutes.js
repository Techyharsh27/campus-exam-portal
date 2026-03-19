const express = require('express');
const router = express.Router();
const { createExam, getExams, getExamById, updateExam, deleteExam } = require('../controllers/examController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, adminOnly, createExam)
  .get(protect, getExams);

router.route('/:id')
  .get(protect, getExamById)
  .put(protect, adminOnly, updateExam)
  .delete(protect, adminOnly, deleteExam);

module.exports = router;
