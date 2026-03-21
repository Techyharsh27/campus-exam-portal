// Auth service methods
import api from './apiClient';

export const authService = {
  registerStudent: (data) => api.post('auth/student/register', data),
  loginStudent: (data) => api.post('auth/student/login', data),
  loginAdmin: (data) => api.post('auth/admin/login', data),
  forgotPassword: (email) => api.post('auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('auth/reset-password', { token, password }),
};

// Exam service methods
export const examService = {
  getExams: () => api.get('exams'),
  getExamById: (id) => api.get(`exams/${id}`),
  createExam: (data) => api.post('exams', data),
  updateExam: (id, data) => api.put(`exams/${id}`, data),
  deleteExam: (id) => api.delete(`exams/${id}`),
};

// Question service methods
export const questionService = {
  getQuestionsByExam: (examId) => api.get(`questions/exam/${examId}`),
  addQuestion: (examId, data) => api.post(`questions/exam/${examId}`, data),
  updateQuestion: (id, data) => api.put(`questions/${id}`, data),
  deleteQuestion: (id) => api.delete(`questions/${id}`),
  bulkImportQuestions: (examId, formData) => api.post(`questions/exam/${examId}/bulk-import`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// Student exam service methods
export const studentExamService = {
  startExam: (examId) => api.get(`student/exams/${examId}/start`),
  submitExam: (examId, attemptId, answers) => api.post(`student/exams/${examId}/submit`, { attemptId, answers }),
  saveState: (examId, data) => api.patch(`student/exams/${examId}/save-state`, data),
  getLeaderboard: (examId) => api.get(`student/exams/${examId}/leaderboard`),
};

// Student data service methods (New)
export const studentService = {
  getProfile: () => api.get('student/profile'),
  getUpcomingExams: () => api.get('student/upcoming-exams'),
  getActiveExams: () => api.get('student/active-exams'),
  getResults: () => api.get('student/results'),
  uploadCSV: (formData) => api.post('student/upload-csv', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getAuthorizedStudents: () => api.get('student/authorized-students'),
  getDeletedStudents: () => api.get('student/deleted'),
  deleteStudent: (id) => api.delete(`student/${id}`),
  restoreStudent: (id) => api.patch(`student/${id}/restore`),
};

// Result service methods
export const resultService = {
  getMyResults: () => api.get('results/my-results'),
  getAllResults: () => api.get('results/all'),
  getExamResults: (examId) => api.get(`results/exam/${examId}`),
};

// Warning service method
export const warningService = {
  addWarning: (data) => api.post('warnings', data),
};

// Security service methods
export const securityService = {
    reportViolation: (attemptId, reason) => api.post('security/report-violation', { attemptId, reason }),
    getLockedAttempts: () => api.get('security/locked-attempts'),
    unlockAttempt: (attemptId) => api.post('security/unlock', { attemptId }),
};
