const warningService = require('../services/warningService');

const addWarning = async (req, res) => {
    try {
        const { examId, reason, currentAnswers } = req.body;
        const studentId = req.user.id;

        const result = await warningService.addWarning(studentId, examId, reason, currentAnswers);
        
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    addWarning
};
