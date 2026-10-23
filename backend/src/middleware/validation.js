/**
 * Input validation and sanitization middleware
 * Prevents common security vulnerabilities
 */

const { AppError } = require("./errorHandler");

// Sanitize input to prevent XSS
const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;
  return input
    .replace(/[<>\"']/g, (match) => {
      const escapeMap = { "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" };
      return escapeMap[match];
    })
    .trim();
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
    // Sanitize body
    if (req.body && typeof req.body === "object") {
      Object.keys(req.body).forEach((key) => {
        if (typeof req.body[key] === "string") {
          req.body[key] = sanitizeInput(req.body[key]);
        }
      });
    }

    // Sanitize query
    if (req.query && typeof req.query === "object") {
      Object.keys(req.query).forEach((key) => {
        if (typeof req.query[key] === "string") {
          req.query[key] = sanitizeInput(req.query[key]);
        }
      });
    }

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
