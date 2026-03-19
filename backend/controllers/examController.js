const examService = require('../services/examService');

const createExam = async (req, res) => {
  try {
    const exam = await examService.createExam(req.body);
    res.status(201).json({ success: true, data: exam });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getExams = async (req, res) => {
  try {
    const exams = await examService.getExams();
    res.status(200).json({ success: true, data: exams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getExamById = async (req, res) => {
  try {
    const exam = await examService.getExamById(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    res.status(200).json({ success: true, data: exam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateExam = async (req, res) => {
  try {
    const exam = await examService.updateExam(req.params.id, req.body);
    res.status(200).json({ success: true, data: exam });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteExam = async (req, res) => {
  try {
    await examService.deleteExam(req.params.id);
    res.status(200).json({ success: true, message: 'Exam deleted' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  createExam,
  getExams,
  getExamById,
  updateExam,
  deleteExam
};
