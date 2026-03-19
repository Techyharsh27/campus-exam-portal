const studentExamService = require('../services/studentExamService');

const startExam = async (req, res) => {
    try {
        const studentId = req.user.id;
        const examId = req.params.examId;
        const { exam, attempt, questions } = await studentExamService.getExamForStudent(studentId, examId);
        
        res.status(200).json({ 
            success: true, 
            data: { 
                exam: {
                    id: exam.id,
                    title: exam.title,
                    duration: exam.duration,
                    endTime: exam.endTime
                },
                attemptId: attempt.id,
                currentQuestionIndex: attempt.currentQuestionIndex,
                remainingTime: attempt.remainingTime,
                questions 
            } 
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const submitExam = async (req, res) => {
    try {
        const { attemptId, answers } = req.body;
        const studentId = req.user.id;
        const examId = req.params.examId;

        const result = await studentExamService.submitExam(studentId, examId, attemptId, answers);
        res.status(201).json({ success: true, data: result, message: 'Exam submitted successfully' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const saveState = async (req, res) => {
    try {
        const studentId = req.user.id;
        const examId = req.params.examId;
        const { attemptId, currentQuestionIndex, remainingTime } = req.body;

        await studentExamService.saveExamState(studentId, attemptId, { currentQuestionIndex, remainingTime });
        res.status(200).json({ success: true, message: 'State saved' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getLeaderboard = async (req, res) => {
    try {
        const leaderboard = await studentExamService.getLeaderboard(req.params.examId);
        res.status(200).json({ success: true, data: leaderboard });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    startExam,
    submitExam,
    saveState,
    getLeaderboard
};
