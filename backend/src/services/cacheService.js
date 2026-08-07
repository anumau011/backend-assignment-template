const Redis = require("ioredis");
const env = require("../config/env");

class MemoryCacheService {
  constructor() {
    this.store = new Map();
  }

  async get(key) {
    const record = this.store.get(key);

    if (!record) {
      return null;
    }

    if (record.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return record.value;
  }

  async set(key, value, ttlSeconds = env.cacheTtlSeconds) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key) {
    this.store.delete(key);
  }

  async flush() {
    this.store.clear();
  }
}

class CacheService {
  constructor() {
    this.memoryCache = new MemoryCacheService();
    this.redisClient = null;
    this.useRedis = false;

    if (env.redisUrl) {
      try {
        this.redisClient = new Redis(env.redisUrl, {
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        });

        this.redisClient.on("connect", () => {
          console.log("Connected to Redis cache server.");
          this.useRedis = true;
        });

        this.redisClient.on("error", (err) => {
          console.warn("Redis client error, falling back to in-memory cache:", err.message);
          this.useRedis = false;
        });
      } catch (err) {
        console.warn("Redis initialization failed, using in-memory cache:", err.message);
        this.useRedis = false;
      }
    }
  }

  async get(key) {
    if (this.useRedis && this.redisClient) {
      try {
        const raw = await this.redisClient.get(key);
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        return this.memoryCache.get(key);
      }
    }
    return this.memoryCache.get(key);
  }

  async set(key, value, ttlSeconds = env.cacheTtlSeconds) {
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
        return;
      } catch (error) {
        await this.memoryCache.set(key, value, ttlSeconds);
        return;
      }
    }
    await this.memoryCache.set(key, value, ttlSeconds);
  }

  async delete(key) {
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (error) {
        await this.memoryCache.delete(key);
      }
    }
    await this.memoryCache.delete(key);
  }

  async flush() {
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.flushdb();
      } catch (error) {
        await this.memoryCache.flush();
      }
    }
    await this.memoryCache.flush();
  }
}

module.exports = new CacheService();
