const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { 
  uploadCSV, 
  getProfile, 
  getUpcomingExams, 
  getActiveExams, 
  getResults,
  getAuthorizedStudents,
  getDeletedStudents,
  deleteStudent,
  restoreStudent
} = require('../controllers/studentController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    if (ext !== '.csv') {
      return cb(new Error('Only CSV files are allowed'), false);
    }
    cb(null, true);
  }
});

// Admin route to upload CSV of valid students
router.post('/upload-csv', protect, adminOnly, upload.single('file'), uploadCSV);
router.get('/authorized-students', protect, adminOnly, getAuthorizedStudents);
router.get('/deleted', protect, adminOnly, getDeletedStudents);
router.delete('/:id', protect, adminOnly, deleteStudent);
router.patch('/:id/restore', protect, adminOnly, restoreStudent);

// Student routes
router.get('/profile', protect, getProfile);
router.get('/upcoming-exams', protect, getUpcomingExams);
router.get('/active-exams', protect, getActiveExams);
router.get('/results', protect, getResults);

module.exports = router;
