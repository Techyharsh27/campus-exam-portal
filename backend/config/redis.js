const { createClient } = require('redis');

let redisClient = null;
let isRedisConnected = false;

// Check if REDIS_URL is valid before creating client
const redisUrl = process.env.REDIS_URL;
const isValidUrl = redisUrl && 
                  (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://')) && 
                  !redisUrl.includes('YOUR_');

if (isValidUrl) {
    try {
        redisClient = createClient({ 
            url: redisUrl,
            socket: {
                connectTimeout: 5000, // 5 seconds timeout
                reconnectStrategy: (retries) => {
                    if (retries > 3) return new Error('Max retries reached');
                    return 1000;
                }
            }
        });
        redisClient.on('error', (err) => console.log('Redis Client Error', err.message));
    } catch (err) {
        console.error('Failed to initialize Redis client:', err.message);
    }
}

const connectRedis = async () => {
    if (!redisClient) {
        console.warn('Skipping Redis connection: Client not initialized (missing or invalid URL).');
        return;
    }
    
    try {
        await redisClient.connect();
        isRedisConnected = true;
        console.log('Redis connected successfully');
    } catch (err) {
        console.error('Failed to connect to Redis. Application will continue without Redis features.', err.message);
    }
};

module.exports = {
    redisClient,
    connectRedis,
    get isConnected() { return isRedisConnected; }
};
