const cron = require('node-cron');
const prisma = require('../config/db');

/**
 * Initializes background jobs.
 */
const initCronJobs = () => {
  // Run every hour to check for students to permanently delete
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Running permanent deletion job...');
    
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // 1. Find soft-deleted ValidStudents older than 24h
      const toDelete = await prisma.validStudent.findMany({
        where: {
          isActive: false,
          deletedAt: {
            lte: twentyFourHoursAgo
          }
        }
      });

      if (toDelete.length === 0) {
        console.log('[Cron] No students to permanently delete.');
        return;
      }

      console.log(`[Cron] Found ${toDelete.length} students to permanently delete.`);

      // 2. For each student, find and delete the registered Student record (if any)
      // This will trigger cascading deletes for Answer, Result, and StudentAttempt
      for (const validStudent of toDelete) {
        const student = await prisma.student.findFirst({
          where: {
            OR: [
              { email: validStudent.email },
              { rollNumber: validStudent.rollNumber }
            ]
          }
        });

        if (student) {
          await prisma.student.delete({
            where: { id: student.id }
          });
          console.log(`[Cron] Permanently deleted registered student: ${validStudent.email}`);
        }

        // 3. Delete the ValidStudent record
        await prisma.validStudent.delete({
          where: { id: validStudent.id }
        });
        console.log(`[Cron] Permanently deleted authorization record: ${validStudent.email}`);
      }

      console.log('[Cron] Permanent deletion job completed successfully.');
    } catch (error) {
      console.error('[Cron] Error in permanent deletion job:', error);
    }
  });

  console.log('[Cron] Background jobs initialized.');
};

module.exports = { initCronJobs };
