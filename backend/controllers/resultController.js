const resultService = require('../services/resultService');

const getMyResults = async (req, res) => {
    try {
        const results = await resultService.getStudentResults(req.user.id);
        res.status(200).json({ success: true, data: results });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getAllResults = async (req, res) => {
    try {
        const results = await resultService.getAllResults();
        res.status(200).json({ success: true, data: results });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getExamResults = async (req, res) => {
    try {
        const results = await resultService.getResultsByExam(req.params.examId);
        res.status(200).json({ success: true, data: results });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    getMyResults,
    getAllResults,
    getExamResults
};
