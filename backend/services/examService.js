const prisma = require('../config/db');

const createExam = async (data) => {
  const { title, duration, startTime, endTime } = data;
  return await prisma.exam.create({
    data: {
      title,
      duration: parseInt(duration),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    },
  });
};

const getExams = async () => {
  return await prisma.exam.findMany({
    orderBy: { createdAt: 'desc' }
  });
};

const getExamById = async (id) => {
  return await prisma.exam.findUnique({
    where: { id },
    include: { questions: true }
  });
};

const updateExam = async (id, data) => {
  const { title, duration, startTime, endTime } = data;
  return await prisma.exam.update({
    where: { id },
    data: {
      title,
      ...(duration && { duration: parseInt(duration) }),
      ...(startTime && { startTime: new Date(startTime) }),
      ...(endTime && { endTime: new Date(endTime) }),
    },
  });
};

const deleteExam = async (id) => {
  return await prisma.exam.delete({
    where: { id },
  });
};

module.exports = {
  createExam,
  getExams,
  getExamById,
  updateExam,
  deleteExam
};
