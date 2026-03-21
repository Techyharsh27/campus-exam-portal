const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/db');
const { sendEmail } = require('../config/email');

// Generate JWT token
const generateToken = (id, role, sessionId = null) => {
  return jwt.sign({ id, role, sessionId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const registerStudent = async (data) => {
  const { name, section, rollNumber, email, contactNumber, password } = data;

  // Validate password length
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  // 1. Check if student is authorized (exists in ValidStudent table)
  // Match using email AND rollNumber as per requirements
  const validStudent = await prisma.validStudent.findFirst({
    where: {
      email: email.trim().toLowerCase(),
      rollNumber: rollNumber.trim(),
      isActive: true
    }
  });

  if (!validStudent) {
    throw new Error('Unauthorized student. Your email and roll number must be pre-authorized by admin.');
  }

  // 2. Check if student already registered in Student table
  const studentExists = await prisma.student.findFirst({
    where: {
      OR: [{ email }, { rollNumber }]
    }
  });

  if (studentExists) {
    throw new Error('This student is already registered. Please login.');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const sessionId = crypto.randomUUID();

  // Create student and update ValidStudent flag in a transaction
  const [student] = await prisma.$transaction([
    prisma.student.create({
      data: {
        name: validStudent.name,
        section: validStudent.section || section || '',
        rollNumber: validStudent.rollNumber,
        email: validStudent.email,
        dob: validStudent.dob,
        contactNumber: contactNumber || '',
        password: hashedPassword,
        currentSessionId: sessionId,
      },
    }),
    prisma.validStudent.update({
      where: { id: validStudent.id },
      data: { isRegistered: true },
    }),
  ]);

  if (student) {
    return {
      _id: student.id,
      name: student.name,
      email: student.email,
      rollNumber: student.rollNumber,
      section: student.section,
      contactNumber: student.contactNumber,
      role: student.role,
      token: generateToken(student.id, student.role, sessionId),
    };
  } else {
    throw new Error('Failed to create student account');
  }
};

const loginStudent = async (email, password) => {
  const student = await prisma.student.findUnique({
    where: { email, isActive: true }
  });

  if (student && (await bcrypt.compare(password, student.password))) {
    const sessionId = crypto.randomUUID();
    
    // Update the student's current session in DB
    await prisma.student.update({
      where: { id: student.id },
      data: { currentSessionId: sessionId }
    });

    return {
      _id: student.id,
      name: student.name,
      email: student.email,
      rollNumber: student.rollNumber,
      section: student.section,
      contactNumber: student.contactNumber,
      warnings: student.warnings,
      role: student.role,
      token: generateToken(student.id, student.role, sessionId),
    };
  } else {
    throw new Error('Invalid email or password');
  }
};

const loginAdmin = async (username, password) => {
  const admin = await prisma.admin.findUnique({ where: { username } });

  if (admin && (await bcrypt.compare(password, admin.password))) {
    return {
      _id: admin.id,
      username: admin.username,
      role: admin.role,
      token: generateToken(admin.id, admin.role),
    };
  } else {
    const defaultUsername = process.env.ADMIN_USERNAME || 'BBDUSOE2026';
    const defaultPassword = process.env.ADMIN_PASSWORD || 'Harsh@2004';

    if (username === defaultUsername && password === defaultPassword && !admin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(defaultPassword, salt);
      const newAdmin = await prisma.admin.create({
        data: { username: defaultUsername, password: hashedPassword }
      });
      return {
        _id: newAdmin.id,
        username: newAdmin.username,
        role: newAdmin.role,
        token: generateToken(newAdmin.id, newAdmin.role),
      };
    }
    throw new Error('Invalid admin username or password');
  }
};

const forgotPassword = async (email) => {
  const student = await prisma.student.findUnique({ where: { email } });

  // Always respond with success to prevent email enumeration
  if (!student) return;

  // Delete any existing unused tokens for this email
  await prisma.passwordResetToken.deleteMany({
    where: { email, used: false }
  });

  // Generate secure random token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await prisma.passwordResetToken.create({
    data: { token, email, expiresAt }
  });

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 40px 20px;">
      <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="background: linear-gradient(135deg, #4F46E5, #6366F1); width: 60px; height: 60px; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 16px;">🎓</div>
          <h1 style="color: #1a1a2e; margin: 0; font-size: 24px;">Password Reset Request</h1>
          <p style="color: #6b7280; margin-top: 8px;">CAMPUS Online Examination Portal</p>
        </div>
        <p style="color: #374151; line-height: 1.6;">Hi <strong>${student.name}</strong>,</p>
        <p style="color: #374151; line-height: 1.6;">We received a request to reset your password. Click the button below to create a new password. This link is valid for <strong>15 minutes</strong>.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background: linear-gradient(135deg, #4F46E5, #6366F1); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block;">Reset My Password</a>
        </div>
        <p style="color: #9ca3af; font-size: 13px; line-height: 1.6;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} CAMPUS Exam Portal. All rights reserved.</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Reset your CAMPUS Password',
    html,
  });
};

const resetPassword = async (token, newPassword) => {
  if (!newPassword || newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token }
  });

  if (!resetToken) {
    throw new Error('Invalid or expired reset link');
  }

  if (resetToken.used) {
    throw new Error('This reset link has already been used');
  }

  if (new Date() > resetToken.expiresAt) {
    throw new Error('Reset link has expired. Please request a new one');
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  // Update student password
  await prisma.student.update({
    where: { email: resetToken.email },
    data: { password: hashedPassword },
  });

  // Mark token as used
  await prisma.passwordResetToken.update({
    where: { token },
    data: { used: true },
  });
};

module.exports = {
  registerStudent,
  loginStudent,
  loginAdmin,
  forgotPassword,
  resetPassword,
};
