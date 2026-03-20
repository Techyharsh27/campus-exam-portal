const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
require('express-async-errors'); // Async error handling

// Load environment variables
dotenv.config();

const { connectRedis } = require('./config/redis');
const prisma = require('./config/db');
const { initCronJobs } = require('./services/cronService');

// Environment variable validation
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'FRONTEND_URL']; // REDIS_URL is now optional
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar] || process.env[envVar].includes('YOUR_'));

if (missingEnvVars.length > 0) {
  console.error(`CRITICAL ERROR: Missing or placeholder environment variables: ${missingEnvVars.join(', ')}`);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet());

// Dynamic CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174' // Support local development fallback port
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window`
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // More restrictive for auth
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api/auth', authLimiter);

// Built-in Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const logger = require('./config/logger');

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/auth', require('./routes/authRoutes')); // Fallback for some frontend environments

app.use('/api/exams', require('./routes/examRoutes'));
app.use('/exams', require('./routes/examRoutes')); // Fallback

app.use('/api/questions', require('./routes/questionRoutes'));
app.use('/questions', require('./routes/questionRoutes')); // Fallback
app.use('/api/student/exams', require('./routes/studentExamRoutes'));
app.use('/api/results', require('./routes/resultRoutes'));
app.use('/api/warnings', require('./routes/warningRoutes'));
app.use('/api/student', require('./routes/studentRoutes'));
app.use('/api/security', require('./routes/securityRoutes'));

// Basic Route for testing
app.get('/', async (req, res) => {
  res.status(200).json({ message: 'CAMPUS Exam Portal API is running' });
});

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    // Start Redis connection in the background - don't let it block server startup
    connectRedis().catch(err => logger.error('Background Redis connection error:', err));
    
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server is running on port ${PORT}`);
      initCronJobs(); // Start background jobs
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
