const cluster = require('cluster');
const os = require('os');
const logger = require('./config/logger');

// Check if current process is master.
if (cluster.isMaster || cluster.isPrimary) {
  // Count the machine's CPUs
  const cpuCount = os.cpus().length;

  logger.info(`Primary ${process.pid} is running. Starting ${cpuCount} workers...`);

  // Create a worker for each CPU
  for (let i = 0; i < cpuCount; i++) {
    cluster.fork();
  }

  // Listen for dying workers and restart them
  cluster.on('exit', (worker, code, signal) => {
    logger.error(`Worker ${worker.process.pid} died. Code: ${code}, Signal: ${signal}. Restarting...`);
    cluster.fork();
  });
} else {
  // Require the server file to start the express app
  // Workers can share any TCP connection, in this case it is an HTTP server
  require('./server.js');
  logger.info(`Worker ${process.pid} started`);
}
