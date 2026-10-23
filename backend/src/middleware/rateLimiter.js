/**
 * Rate limiting middleware
 * Prevents abuse and DoS attacks while accommodating warehouse scanning throughput
 */

const { AppError } = require("./errorHandler");

class RateLimiter {
  constructor() {
    this.attempts = new Map();
    setInterval(() => this.cleanup(), 15 * 60 * 1000);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, data] of this.attempts.entries()) {
      if (now - data.resetTime > 15 * 60 * 1000) {
        this.attempts.delete(key);
      }
    }
  }

  checkLimit(key, maxAttempts, windowMs) {
    const now = Date.now();
    const data = this.attempts.get(key) || { count: 0, resetTime: now + windowMs };

    if (now > data.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: maxAttempts - 1, resetTime: now + windowMs };
    }

    if (data.count >= maxAttempts) {
      const retryAfter = Math.ceil((data.resetTime - now) / 1000);
      return { allowed: false, remaining: 0, resetTime: data.resetTime, retryAfter };
    }

    data.count++;
    this.attempts.set(key, data);
    return { allowed: true, remaining: maxAttempts - data.count, resetTime: data.resetTime };
  }
}

const limiter = new RateLimiter();

const createRateLimitMiddleware = (maxAttempts = 500, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || "local";
    const result = limiter.checkLimit(ip, maxAttempts, windowMs);

    res.set("X-RateLimit-Limit", maxAttempts);
    res.set("X-RateLimit-Remaining", result.remaining);

    if (!result.allowed) {
      res.set("Retry-After", result.retryAfter);
      return next(
        new AppError(
          `Rate limit exceeded. Try again in ${result.retryAfter} seconds`,
          429,
          "RATE_LIMIT_EXCEEDED"
        )
      );
    }

    next();
  };
};

// Generous limits for warehouse operations and multi-scan workflows
const authLimiter = createRateLimitMiddleware(100, 15 * 60 * 1000); // 100 login attempts per 15 mins
const apiLimiter = createRateLimitMiddleware(2000, 15 * 60 * 1000); // 2000 scan & stock queries per 15 mins

module.exports = {
  createRateLimitMiddleware,
  authLimiter,
  apiLimiter,
  RateLimiter,
};
