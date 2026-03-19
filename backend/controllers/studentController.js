const studentService = require('../services/studentService');

const uploadCSV = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    const results = await studentService.importStudentsFromCSV(req.file.path);
    res.status(200).json({
      success: true,
      message: 'CSV processing completed',
      data: results
    });
  } catch (error) {
    console.error('CSV Upload Error:', error);
    res.status(500).json({ success: false, message: 'Error processing CSV file', error: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const profile = await studentService.getStudentProfile(req.user.id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUpcomingExams = async (req, res) => {
  try {
    const exams = await studentService.getUpcomingExams();
    res.status(200).json({ success: true, data: exams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getActiveExams = async (req, res) => {
  try {
    const exams = await studentService.getActiveExams();
    res.status(200).json({ success: true, data: exams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getResults = async (req, res) => {
  try {
    const results = await studentService.getStudentResults(req.user.id);
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAuthorizedStudents = async (req, res) => {
  try {
    const students = await studentService.getAuthorizedStudents();
    res.status(200).json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDeletedStudents = async (req, res) => {
  try {
    const students = await studentService.getDeletedStudents();
    res.status(200).json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteStudent = async (req, res) => {
  try {
    const student = await studentService.softDeleteStudent(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Student removed successfully',
      data: student
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

const restoreStudent = async (req, res) => {
  try {
    const student = await studentService.restoreStudent(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Student restored successfully',
      data: student
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

module.exports = {
  uploadCSV,
  getProfile,
  getUpcomingExams,
  getActiveExams,
  getResults,
  getAuthorizedStudents,
  getDeletedStudents,
  deleteStudent,
  restoreStudent,
};
