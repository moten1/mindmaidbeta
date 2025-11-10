// ============================================
// ⚡ Node-Cache Configuration
// ============================================

import NodeCache from "node-cache";

// Create cache instance
const cache = new NodeCache({
  stdTTL: 600, // Default TTL: 10 minutes
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false, // Faster but be careful with mutations
  deleteOnExpire: true,
  maxKeys: 1000, // Maximum number of keys
});

// Cache statistics
cache.on("set", (key, value) => {
  console.log(`📦 Cache SET: ${key}`);
});

cache.on("del", (key, value) => {
  console.log(`🗑️ Cache DELETE: ${key}`);
});

cache.on("expired", (key, value) => {
  console.log(`⏰ Cache EXPIRED: ${key}`);
});

cache.on("flush", () => {
  console.log(`🧹 Cache FLUSHED`);
});

// Helper functions
export const cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    if (req.method !== "GET") {
      return next();
    }

    const key = `__express__${req.originalUrl || req.url}`;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      console.log(`✅ Cache HIT: ${key}`);
      return res.json(cachedResponse);
    }

    console.log(`❌ Cache MISS: ${key}`);
    res.originalJson = res.json;
    res.json = (body) => {
      cache.set(key, body, duration);
      res.originalJson(body);
    };
    next();
  };
};

export default cache;