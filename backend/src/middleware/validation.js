/**
 * Input validation and sanitization middleware
 * Prevents common security vulnerabilities
 */

const { AppError } = require("./errorHandler");

// Control characters are never valid in user-supplied text and only exist to
// corrupt stored data or smuggle payloads through logs/headers.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * Normalises a string value: trims surrounding whitespace and strips control
 * characters.
 *
 * NOTE: we intentionally do NOT HTML-entity-encode `" < > '`. This is a JSON
 * API and the React client escapes on render, so encoding here gave no
 * security benefit while corrupting legitimate data — a QR scan payload of
 * `{"id":"...","sku":"..."}` was rewritten to `{&quot;id&quot;:...}`, which
 * broke every scan lookup, and names such as "Men's Shirt" were mangled.
 */
const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;
  return input.replace(CONTROL_CHARS, "").trim();
};

// Keys used for NoSQL operator injection ($gt, $ne, $where, dotted paths).
const isUnsafeKey = (key) => key.startsWith("$") || key.includes(".");

/**
 * In-place sanitisation of a request body/query object:
 *  - string values are normalised via sanitizeInput
 *  - nested objects/arrays are traversed recursively
 *  - operator-injection keys are removed
 */
const sanitizeObject = (target) => {
  if (!target || typeof target !== "object") return target;

  Object.keys(target).forEach((key) => {
    if (isUnsafeKey(key)) {
      delete target[key];
      return;
    }

    const value = target[key];
    if (typeof value === "string") {
      target[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      target[key] = value.map((item) =>
        item && typeof item === "object" ? sanitizeObject(item) : sanitizeInput(item)
      );
    } else if (value && typeof value === "object") {
      target[key] = sanitizeObject(value);
    }
  });

  return target;
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
const validatePassword = (password) => {
  if (!password || password.length < 6) {
    return "Password must be at least 6 characters";
  }
  return null;
};

// Validate required fields
const validateRequired = (data, requiredFields) => {
  const missing = requiredFields.filter((field) => !data[field]);
  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(", ")}`;
  }
  return null;
};

// Main validation middleware
const validateInput = (req, _res, next) => {
  try {
    sanitizeObject(req.body);
    sanitizeObject(req.query);
    next();
  } catch (err) {
    next(err);
  }
};

// Validate pagination params
const validatePaginationQuery = (req, _res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  if (page < 1) throw new AppError("Page must be at least 1", 400, "INVALID_PAGE");
  if (limit < 1 || limit > 100) throw new AppError("Limit must be between 1 and 100", 400, "INVALID_LIMIT");

  req.pagination = { page, limit };
  next();
};

module.exports = {
  sanitizeInput,
  isValidEmail,
  validatePassword,
  validateRequired,
  validateInput,
  validatePaginationQuery,
};
