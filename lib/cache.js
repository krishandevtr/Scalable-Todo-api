const redis = require('redis');

class CacheService {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            if (process.env.REDIS_URL) {
                this.client = redis.createClient({
                    url: process.env.REDIS_URL,
                    password: process.env.REDIS_PASSWORD || undefined,
                    db: parseInt(process.env.REDIS_DB) || 0,
                    retry_strategy: (options) => {
                        if (options.error && options.error.code === 'ECONNREFUSED') {
                            console.log('Redis connection refused, retrying...');
                        }
                        if (options.total_retry_time > 1000 * 60 * 60) {
                            return new Error('Retry time exhausted');
                        }
                        if (options.attempt > 10) {
                            return undefined;
                        }
                        return Math.min(options.attempt * 100, 3000);
                    }
                });

                this.client.on('error', (err) => {
                    console.error('Redis Client Error:', err);
                    this.isConnected = false;
                });

                this.client.on('connect', () => {
                    console.log('✅ Redis connected');
                    this.isConnected = true;
                });

                this.client.on('ready', () => {
                    console.log('✅ Redis ready');
                    this.isConnected = true;
                });

                this.client.on('end', () => {
                    console.log('📤 Redis connection ended');
                    this.isConnected = false;
                });

                await this.client.connect();
            } else {
                console.log('⚠️ Redis URL not provided, caching disabled');
            }
        } catch (error) {
            console.error('❌ Failed to connect to Redis:', error.message);
            this.isConnected = false;
        }
    }

    async get(key) {
        if (!this.isConnected || !this.client) {
            return null;
        }

        try {
            const result = await this.client.get(key);
            return result ? JSON.parse(result) : null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    async set(key, value, ttlSeconds = 300) { // Default 5 minutes
        if (!this.isConnected || !this.client) {
            return false;
        }

        try {
            await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }

    async del(key) {
        if (!this.isConnected || !this.client) {
            return false;
        }

        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            console.error('Cache delete error:', error);
            return false;
        }
    }

    async delPattern(pattern) {
        if (!this.isConnected || !this.client) {
            return false;
        }

        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(keys);
            }
            return true;
        } catch (error) {
            console.error('Cache delete pattern error:', error);
            return false;
        }
    }

    async exists(key) {
        if (!this.isConnected || !this.client) {
            return false;
        }

        try {
            const result = await this.client.exists(key);
            return result === 1;
        } catch (error) {
            console.error('Cache exists error:', error);
            return false;
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.quit();
            this.isConnected = false;
        }
    }

    // Helper methods for common cache patterns
    getUserTodosKey(userId, queryParams = {}) {
        const query = new URLSearchParams(queryParams).toString();
        return `todos:user:${userId}:${query}`;
    }

    getUserStatsKey(userId) {
        return `stats:user:${userId}`;
    }

    getTodoKey(todoId) {
        return `todo:${todoId}`;
    }

    getUserKey(userId) {
        return `user:${userId}`;
    }
}

// Create a singleton instance
const cache = new CacheService();

// Cache invalidation helpers
const invalidateUserCache = async (userId) => {
    await cache.delPattern(`todos:user:${userId}:*`);
    await cache.del(cache.getUserStatsKey(userId));
};

const invalidateTodoCache = async (todoId, userId) => {
    await cache.del(cache.getTodoKey(todoId));
    await invalidateUserCache(userId);
};

module.exports = {
    cache,
    invalidateUserCache,
    invalidateTodoCache
};