const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPersistence() {
  console.log('--- DATABASE DIAGNOSTIC ---');
  try {
    const validCount = await prisma.validStudent.count({ where: { isActive: true } });
    const deletedCount = await prisma.validStudent.count({ where: { isActive: false } });
    const registeredCount = await prisma.student.count();
    
    console.log(`Active Valid Students: ${validCount}`);
    console.log(`Deleted Valid Students: ${deletedCount}`);
    console.log(`Registered Students: ${registeredCount}`);
    
    // List first 5 active
    const samples = await prisma.validStudent.findMany({ 
        where: { isActive: true }, 
        take: 5,
        orderBy: { createdAt: 'desc' }
    });
    console.log('Latest Active Samples:', samples.map(s => s.email));

  } catch (err) {
    console.error('Database query failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
  console.log('--- END DIAGNOSTIC ---');
}

testPersistence();
