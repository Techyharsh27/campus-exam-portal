const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
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
  // Only exit if DATABASE_URL or JWT_SECRET are missing, as they are truly critical for any operation
  const fatalVars = ['DATABASE_URL', 'JWT_SECRET'];
  const missingFatal = missingEnvVars.filter(v => fatalVars.includes(v));
  if (missingFatal.length > 0 && process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet());

// Dynamic CORS configuration
const frontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : null;
const allowedOrigins = [
  frontendUrl,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Log for debugging on Render
    console.log('CORS Request Origin:', origin);
    console.log('Allowed Origins:', allowedOrigins);

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production';
    console.log('CORS Allowed:', isAllowed);
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Request Logger for debugging
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.method !== 'GET') console.log('Body:', req.body);
  }
  next();
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Increased to 5000 to handle multiple devices on same NAT IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // Increased for better UX during campus-wide logins
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api/auth', authLimiter);

// Built-in Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
