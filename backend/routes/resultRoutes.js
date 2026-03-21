const express = require('express');
const router = express.Router();
const { getMyResults, getAllResults, getExamResults, downloadResultPDF } = require('../controllers/resultController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/my-results', protect, getMyResults);
router.get('/all', protect, adminOnly, getAllResults);
router.get('/exam/:examId', protect, adminOnly, getExamResults);
router.get('/:id/pdf', protect, downloadResultPDF);

module.exports = router;
