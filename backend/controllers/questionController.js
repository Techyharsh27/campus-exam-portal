const questionService = require('../services/questionService');

const addQuestion = async (req, res) => {
  try {
    const question = await questionService.addQuestion(req.params.examId, req.body);
    res.status(201).json({ success: true, data: question });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getQuestionsByExam = async (req, res) => {
  try {
    const questions = await questionService.getQuestionsByExam(req.params.examId);
    res.status(200).json({ success: true, data: questions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateQuestion = async (req, res) => {
  try {
    const question = await questionService.updateQuestion(req.params.id, req.body);
    res.status(200).json({ success: true, data: question });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    await questionService.deleteQuestion(req.params.id);
    res.status(200).json({ success: true, message: 'Question deleted' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const bulkImportQuestions = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    const results = await questionService.bulkImportQuestions(req.params.examId, req.file.path);
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  addQuestion,
  getQuestionsByExam,
  updateQuestion,
  deleteQuestion,
  bulkImportQuestions,
};
