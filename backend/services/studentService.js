const fs = require('fs');
const csv = require('csv-parser');
const prisma = require('../config/db');

/**
 * Parses a CSV file and imports students into the ValidStudent table.
 */
const importStudentsFromCSV = async (filePath) => {
  const students = [];
  const results = { success: 0, skipped: 0, errors: [] };

  console.log(`[CSV Import] Starting student processing: ${filePath}`);

  let separator = ',';
  let content = '';
  
  try {
      const buffer = fs.readFileSync(filePath);
      if (buffer[0] === 0xFF && buffer[1] === 0xFE) content = buffer.toString('utf16le');
      else if (buffer[0] === 0xFE && buffer[1] === 0xFF) content = buffer.toString('utf16be');
      else content = buffer.toString('utf8');

      if (content.includes('\0')) content = content.replace(/\0/g, '');
  } catch (e) { 
      content = fs.readFileSync(filePath, 'utf8');
  }

  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return results;
  }

  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const pipeCount = (firstLine.match(/\|/g) || []).length;
  
  if (semiCount > commaCount && semiCount > tabCount && semiCount > pipeCount) separator = ';';
  else if (tabCount > commaCount && tabCount > semiCount && tabCount > pipeCount) separator = '\t';
  else if (pipeCount > commaCount && pipeCount > semiCount && pipeCount > tabCount) separator = '|';

    const { Readable } = require('stream');
    return new Promise((resolve, reject) => {
        Readable.from(content)
            .pipe(csv({
                separator: separator,
                mapHeaders: ({ header }) => {
                    const cleanHeader = header.replace(/[^\x20-\x7E]/g, '').trim();
                    const h = cleanHeader.toLowerCase();
                    if (h.includes('roll')) return 'university_rollno';
                    if (h === 'name' || h === 'student name' || h.includes('student_name')) return 'student_name';
                    if (h.includes('section')) return 'section';
                    if (h.includes('birth') || h.includes('dob')) return 'date_of_birth';
                    if (h.includes('email')) return 'official_email_id';
                    return cleanHeader;
                }
            }))
            .on('data', (row) => {
                // Ensure row is not completely empty
                if (Object.values(row).some(v => v && v.toString().trim())) {
                    students.push(row);
                }
            })
            .on('end', async () => {
                try {
                    console.log(`[CSV Import] Total students captured: ${students.length}`);
                    
                    if (students.length === 0) {
                        console.warn('[CSV Import] No valid data rows found in CSV.');
                        results.errors.push('No valid data rows found in CSV. Please check headers and content.');
                    }

                    for (let i = 0; i < students.length; i++) {
                        const row = students[i];
                        const data = {};
                        Object.keys(row).forEach(key => { data[key] = row[key] ? row[key].toString().trim() : ''; });

                        const { university_rollno, student_name, section, date_of_birth, official_email_id } = data;
                        const rowIndex = i + 2;

                        if (!student_name || !official_email_id || !university_rollno || !date_of_birth) {
                            results.errors.push(`Row ${rowIndex}: Missing required fields (Name, Roll, DOB, or Email).`);
                            results.skipped++;
                            continue;
                        }

                        let parsedDob = null;
                        if (date_of_birth) {
                            const dmyMatch = date_of_birth.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
                            if (dmyMatch) {
                                parsedDob = new Date(parseInt(dmyMatch[3], 10), parseInt(dmyMatch[2], 10) - 1, parseInt(dmyMatch[1], 10));
                            } else {
                                const isoMatch = date_of_birth.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
                                if (isoMatch) {
                                    parsedDob = new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
                                } else {
                                    const fallbackDate = new Date(date_of_birth);
                                    if (!isNaN(fallbackDate.getTime())) {
                                        parsedDob = fallbackDate;
                                    }
                                }
                            }
                        }

                        if (!parsedDob || isNaN(parsedDob.getTime())) {
                            results.errors.push(`Row ${rowIndex}: Invalid date format for ${official_email_id}. Use DD-MM-YYYY.`);
                            results.skipped++;
                            continue;
                        }

                        try {
                            // Sequential upsert for maximum reliability
                            await prisma.validStudent.upsert({
                                where: { email: official_email_id.toLowerCase() },
                                update: { 
                                    name: student_name, 
                                    rollNumber: university_rollno, 
                                    section: section || '', 
                                    dob: parsedDob 
                                },
                                create: { 
                                    name: student_name, 
                                    email: official_email_id.toLowerCase(), 
                                    rollNumber: university_rollno, 
                                    section: section || '', 
                                    dob: parsedDob, 
                                    isRegistered: false 
                                }
                            });
                            results.success++;
                        } catch (err) {
                            console.error(`[CSV Import] DB Error row ${rowIndex}:`, err.message);
                            results.errors.push(`Row ${rowIndex}: Database error (${err.message.substring(0, 50)}).`);
                            results.skipped++;
                        }
                    }
                    
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    resolve(results);
                } catch (error) {
                    console.error('[CSV Import] End handler error:', error);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    reject(error);
                }
            })
            .on('error', (error) => {
                console.error('[CSV Import] Stream error:', error);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                reject(error);
            });
    });
};

const getStudentProfile = async (studentId) => {
  return await prisma.student.findUnique({ where: { id: studentId }, select: { id: true, name: true, email: true, rollNumber: true, section: true, contactNumber: true } });
};

const getUpcomingExams = async () => {
  return await prisma.exam.findMany({ where: { startTime: { gt: new Date() } }, orderBy: { startTime: 'asc' } });
};

const getActiveExams = async () => {
  const now = new Date();
  return await prisma.exam.findMany({ where: { startTime: { lte: now }, endTime: { gte: now } }, orderBy: { startTime: 'asc' } });
};

const getStudentResults = async (studentId) => {
  return await prisma.result.findMany({ where: { studentId }, include: { exam: { select: { title: true, duration: true } } }, orderBy: { submittedAt: 'desc' } });
};

const getAuthorizedStudents = async () => {
  const students = await prisma.validStudent.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`[StudentService] Fetched ${students.length} authorized students`);
  return students;
};

const getDeletedStudents = async () => {
  return await prisma.validStudent.findMany({
    where: { isActive: false },
    orderBy: { deletedAt: 'desc' },
  });
};

const softDeleteStudent = async (id) => {
  const validStudent = await prisma.validStudent.findUnique({ where: { id } });
  if (!validStudent) throw new Error('Student authorization record not found');

  if (!validStudent.isActive) throw new Error('Student is already deleted');

  // Transaction to update both ValidStudent and Student (if exists)
  return await prisma.$transaction(async (tx) => {
    const updatedValid = await tx.validStudent.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });

    // Check if a registered Student exists with same email/rollNumber
    const student = await tx.student.findFirst({
      where: {
        OR: [{ email: validStudent.email }, { rollNumber: validStudent.rollNumber }],
      },
    });

    if (student) {
      await tx.student.update({
        where: { id: student.id },
        data: { isActive: false, deletedAt: new Date() },
      });
    }

    return updatedValid;
  });
};

const restoreStudent = async (id) => {
  const validStudent = await prisma.validStudent.findUnique({ where: { id } });
  if (!validStudent) throw new Error('Student authorization record not found');

  if (validStudent.isActive) throw new Error('Student is not deleted');

  return await prisma.$transaction(async (tx) => {
    const restoredValid = await tx.validStudent.update({
      where: { id },
      data: { isActive: true, deletedAt: null },
    });

    const student = await tx.student.findFirst({
      where: {
        OR: [{ email: validStudent.email }, { rollNumber: validStudent.rollNumber }],
      },
    });

    if (student) {
      await tx.student.update({
        where: { id: student.id },
        data: { isActive: true, deletedAt: null },
      });
    }

    return restoredValid;
  });
};

module.exports = {
  importStudentsFromCSV,
  getStudentProfile,
  getUpcomingExams,
  getActiveExams,
  getStudentResults,
  getAuthorizedStudents,
  getDeletedStudents,
  softDeleteStudent,
  restoreStudent,
};
