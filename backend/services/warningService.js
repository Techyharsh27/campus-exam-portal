const prisma = require('../config/db');
const { submitExam } = require('./studentExamService'); // Import existing logic for auto-submit

const addWarning = async (studentId, examId, reason, currentAnswers = {}) => {
    // 1. Increment warning for student
    const student = await prisma.student.update({
        where: { id: studentId },
        data: { warnings: { increment: 1 } }
    });

    const currentWarnings = student.warnings;

    // 2. Check if warnings reached limit (3)
    if (currentWarnings >= 3) {
        // Find if exam is already submitted
        const existingResult = await prisma.result.findFirst({
            where: { studentId, examId }
        });

        if (!existingResult) {
            // Auto submit exam
            await submitExam(studentId, examId, currentAnswers);
            return {
                warningCount: currentWarnings,
                message: `Warning added for ${reason}. Maximum warnings reached. Exam auto-submitted.`,
                autoSubmitted: true
            };
        } else {
             return {
                warningCount: currentWarnings,
                message: `Warning added for ${reason}. Exam was already submitted.`,
                autoSubmitted: true
            };
        }
    }

    return {
        warningCount: currentWarnings,
        message: `Warning added for ${reason}. Please do not switch tabs or exit fullscreen mode.`,
        autoSubmitted: false
    };
};

module.exports = {
    addWarning
};
