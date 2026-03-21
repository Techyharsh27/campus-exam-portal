const prisma = require('../config/db');

const createExam = async (data) => {
  const { title, duration, startTime, endTime } = data;
  console.log('Incoming create data:', data);
  try {
    const exam = await prisma.exam.create({
      data: {
        title,
        duration: parseInt(duration),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      },
    });
    console.log('Successfully created exam:', exam.id);
    return exam;
  } catch (error) {
    console.error('Prisma create error:', error);
    throw error;
  }
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
  console.log('Incoming update data for ID:', id, data);
  try {
    const updated = await prisma.exam.update({
      where: { id },
      data: {
        title,
        ...(duration && { duration: parseInt(duration) }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
      },
    });
    console.log('Successfully updated exam:', updated.id);
    return updated;
  } catch (error) {
    console.error('Prisma update error:', error);
    throw error;
  }
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
