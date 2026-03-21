const express = require('express');
const router = express.Router();
const { addQuestion, getQuestionsByExam, updateQuestion, deleteQuestion, bulkImportQuestions } = require('../controllers/questionController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Use OS temp dir for CSV uploads — works on both localhost and Render cloud
const csvTempDir = path.join(os.tmpdir(), 'campus_csv_imports');
if (!fs.existsSync(csvTempDir)) {
  fs.mkdirSync(csvTempDir, { recursive: true });
}

const csvUpload = multer({ dest: csvTempDir });

router.route('/exam/:examId')
  .post(protect, adminOnly, addQuestion)
  .get(protect, getQuestionsByExam); 

router.post('/exam/:examId/bulk-import', protect, adminOnly, csvUpload.single('file'), bulkImportQuestions);

router.route('/:id')
  .put(protect, adminOnly, updateQuestion)
  .delete(protect, adminOnly, deleteQuestion);

module.exports = router;
