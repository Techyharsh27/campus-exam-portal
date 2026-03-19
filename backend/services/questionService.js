const prisma = require('../config/db');

const addQuestion = async (examId, data) => {
  const { questionText, optionA, optionB, optionC, optionD, correctAnswer, section, questionType, graphData, graphType } = data;
  return await prisma.question.create({
    data: {
      examId,
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      section,
      questionType: questionType || 'MCQ',
      graphData: graphData || null,
      graphType: graphType || null,
    },
  });
};

const getQuestionsByExam = async (examId) => {
  return await prisma.question.findMany({
    where: { examId },
  });
};

const updateQuestion = async (id, data) => {
  const { questionText, optionA, optionB, optionC, optionD, correctAnswer, section, questionType, graphData, graphType } = data;
  return await prisma.question.update({
    where: { id },
    data: {
      ...(questionText && { questionText }),
      ...(optionA && { optionA }),
      ...(optionB && { optionB }),
      ...(optionC && { optionC }),
      ...(optionD && { optionD }),
      ...(correctAnswer && { correctAnswer }),
      ...(section && { section }),
      ...(questionType && { questionType }),
      ...(graphData !== undefined && { graphData }),
      ...(graphType !== undefined && { graphType }),
    },
  });
};

const deleteQuestion = async (id) => {
  return await prisma.question.delete({
    where: { id },
  });
};

const bulkImportService = require('./bulkImportService');

const bulkImportQuestions = async (examId, filePath) => {
  return await bulkImportService.importQuestionsFromCSV(examId, filePath);
};

module.exports = {
  addQuestion,
  getQuestionsByExam,
  updateQuestion,
  deleteQuestion,
  bulkImportQuestions,
};
