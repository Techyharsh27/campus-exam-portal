const express = require('express');
const router = express.Router();
const { addQuestion, getQuestionsByExam, updateQuestion, deleteQuestion, bulkImportQuestions } = require('../controllers/questionController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.route('/exam/:examId')
  .post(protect, adminOnly, addQuestion)
  .get(protect, getQuestionsByExam); 

router.post('/exam/:examId/bulk-import', protect, adminOnly, upload.single('file'), bulkImportQuestions);

router.route('/:id')
  .put(protect, adminOnly, updateQuestion)
  .delete(protect, adminOnly, deleteQuestion);

module.exports = router;
