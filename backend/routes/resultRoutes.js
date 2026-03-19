const express = require('express');
const router = express.Router();
const { getMyResults, getAllResults, getExamResults } = require('../controllers/resultController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/my-results', protect, getMyResults);
router.get('/all', protect, adminOnly, getAllResults);
router.get('/exam/:examId', protect, adminOnly, getExamResults);

module.exports = router;
