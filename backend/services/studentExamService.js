const prisma = require('../config/db');
const { redisClient } = require('../config/redis');

// Utility function to shuffle array (Fisher-Yates)
const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

const getExamForStudent = async (studentId, examId) => {
    let exam = null;
    const cacheKey = `exam_full:${examId}`;

    // Try Redis cache first to avoid DB locking under 1000+ concurrent loads
    if (redisClient && redisClient.isReady) {
        try {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                exam = JSON.parse(cachedData);
                // Hydrate date fields
                exam.startTime = new Date(exam.startTime);
                exam.endTime = new Date(exam.endTime);
                exam.createdAt = new Date(exam.createdAt);
            }
        } catch (err) {
            console.error('Redis cache exam read error:', err);
        }
    }

    if (!exam) {
        exam = await prisma.exam.findUnique({
            where: { id: examId },
            include: { questions: true }
        });

        // Store in Redis for 5 minutes (300 seconds)
        if (exam && redisClient && redisClient.isReady) {
            try {
                await redisClient.setEx(cacheKey, 300, JSON.stringify(exam));
            } catch (err) {
                console.error('Redis cache exam write error:', err);
            }
        }
    }

    if (!exam) throw new Error('Exam not found');

    const now = new Date();
    if (now < exam.startTime) throw new Error('Exam has not started yet');    // Allow submission even if endTime is passed by a small margin, but start only if before endTime
    if (now > exam.endTime) throw new Error('Exam has already ended');

    // Check if student already has a submitted attempt
    const existingAttempt = await prisma.studentAttempt.findFirst({
        where: { studentId, examId }
    });

    if (existingAttempt && existingAttempt.status === 'SUBMITTED') {
        throw new Error('You have already submitted this exam.');
    }

    if (existingAttempt && existingAttempt.isLocked) {
        throw new Error('Exam is locked due to suspicious activity. Please contact admin.');
    }

    if (existingAttempt) {
        // Return existing order for consistency
        const questionsWithOrder = reconstructQuestions(exam.questions, existingAttempt.questionOrder);
        return { 
            exam, 
            attempt: {
                ...existingAttempt,
                ...existingAttempt,
                isLocked: existingAttempt.isLocked,
                violationCount: existingAttempt.violationCount,
                currentQuestionIndex: existingAttempt.currentQuestionIndex,
                remainingTime: existingAttempt.remainingTime
            }, 
            questions: questionsWithOrder 
        };
    }

    // Create new attempt with randomization
    const sections = ['REASONING', 'VERBAL', 'NUMERICAL', 'CORE'];
    const questionOrder = {};
    const finalQuestions = [];

    sections.forEach(section => {
        const sectionQuestions = exam.questions.filter(q => q.section === section);
        const shuffled = shuffleArray(sectionQuestions).slice(0, 20); // Ensure 20 per section
        
        questionOrder[section] = shuffled.map(q => {
            const options = [q.optionA, q.optionB, q.optionC, q.optionD];
            const shuffledOptions = shuffleArray(options);
            return {
                id: q.id,
                options: shuffledOptions // Store the shuffled options order
            };
        });

        shuffled.forEach(q => {
            const orderObj = questionOrder[section].find(o => o.id === q.id);
            finalQuestions.push({
                ...q,
                options: orderObj.options, // Pass internal array of shuffled options to frontend
                correctAnswer: undefined, // Remove answer for student payload
                optionA: undefined,
                optionB: undefined,
                optionC: undefined,
                optionD: undefined
            });
        });
    });

    const attempt = await prisma.studentAttempt.create({
        data: {
            studentId,
            examId,
            questionOrder,
            status: 'STARTED',
            startTime: new Date()
        }
    });

    return { exam, attempt, questions: finalQuestions };
};

const reconstructQuestions = (allQuestions, questionOrder) => {
    const finalQuestions = [];
    Object.keys(questionOrder).forEach(section => {
        questionOrder[section].forEach(orderObj => {
            const q = allQuestions.find(q => q.id === orderObj.id);
            if (q) {
                finalQuestions.push({
                    ...q,
                    options: orderObj.options,
                    correctAnswer: undefined,
                    optionA: undefined,
                    optionB: undefined,
                    optionC: undefined,
                    optionD: undefined
                });
            }
        });
    });
    return finalQuestions;
};

const submitExam = async (studentId, examId, attemptId, answers) => {
    const attempt = await prisma.studentAttempt.findUnique({
        where: { id: attemptId },
        include: { exam: { include: { questions: true } } }
    });

    if (!attempt || attempt.studentId !== studentId) throw new Error('Invalid attempt');
    if (attempt.status === 'SUBMITTED') throw new Error('Exam already submitted');
    if (attempt.isLocked) throw new Error('Exam is locked due to suspicious activity. Please contact admin.');

    const now = new Date();
    const startTime = new Date(attempt.startTime);
    const timeTaken = Math.floor((now - startTime) / 1000); // in seconds

    const scores = {
        REASONING: 0,
        VERBAL: 0,
        NUMERICAL: 0,
        CORE: 0
    };

    // Create a map of correct answers
    const questionMap = new Map();
    attempt.exam.questions.forEach(q => questionMap.set(q.id, { answer: q.correctAnswer, section: q.section }));

    // Calculate scores
    for (const [questionId, selectedOption] of Object.entries(answers)) {
        // Skip keys that are not UUIDs (e.g. legacy leakage like 'isConfirming')
        if (!/^[0-9a-f-]{36}$/i.test(questionId)) continue;
        
        // Skip if selectedOption is not a string
        if (typeof selectedOption !== 'string') continue;

        const qData = questionMap.get(questionId);
        if (!qData) continue;

        let actualSelectedContent = selectedOption;

        // If selectedOption is a label (A, B, C, D), map it to the actual shuffled content
        const labels = ['A', 'B', 'C', 'D'];
        if (labels.includes(selectedOption)) {
            const sectionOrder = attempt.questionOrder[qData.section];
            const orderObj = sectionOrder?.find(o => o.id === questionId);
            if (orderObj) {
                const labelIndex = labels.indexOf(selectedOption);
                actualSelectedContent = orderObj.options[labelIndex];
            }
        }

        if (qData.answer === actualSelectedContent) {
            scores[qData.section]++;
        }
        
        // Save individual answer for audit (save the label if provided)
        await prisma.answer.create({
            data: {
                attemptId,
                questionId,
                selectedOption: selectedOption
            }
        });
    }

    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const totalQuestions = attempt.exam.questions.length; // Or should we use total attempted count? Requirements say 80 total.
    const percentage = (totalScore / 80) * 100;

    // Update attempt status
    await prisma.studentAttempt.update({
        where: { id: attemptId },
        data: {
            status: 'SUBMITTED',
            endTime: now
        }
    });

    // Create Result
    const result = await prisma.result.create({
        data: {
            studentId,
            examId,
            reasoningScore: scores.REASONING,
            verbalScore: scores.VERBAL,
            numericalScore: scores.NUMERICAL,
            coreScore: scores.CORE,
            totalScore,
            percentage,
            timeTaken,
            submittedAt: now
        }
    });

    // Calculate Rank
    const rank = await prisma.result.count({
        where: {
            examId,
            OR: [
                { totalScore: { gt: totalScore } },
                {
                    totalScore: totalScore,
                    timeTaken: { lt: timeTaken }
                }
            ]
        }
    }) + 1;

    return { ...result, rank };
};

const getLeaderboard = async (examId) => {
    const results = await prisma.result.findMany({
        where: { examId },
        include: { student: { select: { name: true } } },
        orderBy: [
            { totalScore: 'desc' },
            { timeTaken: 'asc' }
        ]
    });

    return results.map((r, index) => ({
        rank: index + 1,
        studentId: r.studentId,
        name: r.student.name,
        score: r.totalScore,
        timeTaken: r.timeTaken,
        sectionWise: {
            reasoning: r.reasoningScore,
            verbal: r.verbalScore,
            numerical: r.numericalScore,
            core: r.coreScore
        }
    }));
};

const saveExamState = async (studentId, attemptId, data) => {
    const { currentQuestionIndex, remainingTime, answers } = data;
    
    return await prisma.studentAttempt.update({
        where: { id: attemptId, studentId },
        data: {
            currentQuestionIndex,
            remainingTime,
            savedAnswers: answers || {},
            lastActiveAt: new Date()
        }
    });
};

module.exports = {
    getExamForStudent,
    submitExam,
    getLeaderboard,
    saveExamState
};
