const { createClient } = require('redis');

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

let isRedisConnected = false;

const connectRedis = async () => {
    try {
        await redisClient.connect();
        isRedisConnected = true;
        console.log('Redis connected successfully');
    } catch (err) {
        console.error('Failed to connect to Redis', err);
    }
};

module.exports = {
    redisClient,
    connectRedis,
    isRedisConnected
};
