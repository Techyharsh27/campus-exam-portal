const prisma = require('../config/db');

const getStudentResults = async (studentId) => {
    return await prisma.result.findMany({
        where: { studentId },
        include: { exam: true },
        orderBy: { submittedAt: 'desc' }
    });
};

const getAllResults = async () => {
    return await prisma.result.findMany({
        include: { 
            student: { select: { name: true, rollNumber: true, email: true } }, 
            exam: { select: { title: true } } 
        },
        orderBy: { submittedAt: 'desc' }
    });
};

const getResultsByExam = async (examId) => {
    return await prisma.result.findMany({
        where: { examId },
        include: { student: { select: { name: true, rollNumber: true } } },
        orderBy: { totalScore: 'desc' }
    });
};

const getResultById = async (id) => {
    return await prisma.result.findUnique({
        where: { id },
        include: {
            student: true,
            exam: true
        }
    });
};

module.exports = {
    getStudentResults,
    getAllResults,
    getResultsByExam,
    getResultById
};
