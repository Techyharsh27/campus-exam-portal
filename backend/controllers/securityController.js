const prisma = require('../config/db');

const reportViolation = async (req, res) => {
    try {
        const { attemptId, reason } = req.body;
        const studentId = req.user.id;

        // Fetch current attempt
        const attempt = await prisma.studentAttempt.findUnique({
            where: { id: attemptId }
        });

        if (!attempt || attempt.studentId !== studentId) {
            return res.status(404).json({ success: false, message: 'Attempt not found' });
        }

        if (attempt.isLocked) {
             return res.status(400).json({ success: false, message: 'Attempt is already locked' });
        }

        // Increment violation count
        const newCount = attempt.violationCount + 1;
        const shouldLock = newCount >= 3; // NTA Standard Grace Threshold

        // Execute changes in a transaction
        const [updatedAttempt, warningLog] = await prisma.$transaction([
            prisma.studentAttempt.update({
                where: { id: attemptId },
                data: {
                    violationCount: newCount,
                    isLocked: shouldLock
                }
            }),
            prisma.examWarningLog.create({
                data: {
                    attemptId,
                    reason
                }
            }),
            prisma.student.update({
                where: { id: studentId },
                data: { warnings: { increment: 1 } }
            })
        ]);

        res.status(200).json({
            success: true,
            data: updatedAttempt,
            message: shouldLock 
                ? `Attempt locked due to multiple violations. Last: ${reason}`
                : `Warning ${newCount}/3 recorded: ${reason}`
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
