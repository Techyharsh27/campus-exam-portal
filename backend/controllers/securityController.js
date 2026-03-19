const prisma = require('../config/db');

const reportViolation = async (req, res) => {
    try {
        const { attemptId, reason } = req.body;
        const studentId = req.user.id;

        // Force lock the attempt immediately as per requirements
        const updatedAttempt = await prisma.studentAttempt.update({
            where: { id: attemptId },
            data: {
                violationCount: 2,
                isLocked: true
            }
        });

        res.status(200).json({
            success: true,
            data: updatedAttempt,
            message: `Attempt locked due to: ${reason}`
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const unlockAttempt = async (req, res) => {
    try {
        const { attemptId } = req.body;
        
        // Only admins should reach here (middleware will handle this)
        const updatedAttempt = await prisma.studentAttempt.update({
            where: { id: attemptId },
            data: {
                violationCount: 0,
                isLocked: false
            }
        });

        res.status(200).json({
            success: true,
            data: updatedAttempt,
            message: 'Attempt unlocked successfully'
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getLockedAttempts = async (req, res) => {
    try {
        const lockedAttempts = await prisma.studentAttempt.findMany({
            where: { isLocked: true },
            include: {
                student: {
                    select: {
                        name: true,
                        rollNumber: true,
                        email: true
                    }
                },
                exam: {
                    select: {
                        title: true
                    }
                }
            }
        });

        res.status(200).json({
            success: true,
            data: lockedAttempts
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    reportViolation,
    unlockAttempt,
    getLockedAttempts
};
