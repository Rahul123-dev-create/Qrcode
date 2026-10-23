/**
 * Centralized error handling middleware
 * Catches all errors and returns consistent error responses
 */

class AppError extends Error {
  constructor(message, statusCode, code = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();
  }
}

const errorHandler = (err, _req, res, _next) => {
  const isDevelopment = process.env.NODE_ENV === "development";
  
  // Log error
  console.error(`[${err.timestamp || new Date().toISOString()}] Error:`, {
    code: err.code || "INTERNAL_ERROR",
    message: err.message,
    statusCode: err.statusCode || 500,
    path: _req.path,
    method: _req.method,
    ...(isDevelopment && { stack: err.stack }),
  });

  // Handle Mongoose validation errors
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message,
      statusCode: 400,
    });
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      code: "DUPLICATE_ENTRY",
      message: `${field} already exists`,
      statusCode: 409,
    });
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      code: "INVALID_TOKEN",
      message: "Invalid or malformed token",
      statusCode: 401,
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      code: "TOKEN_EXPIRED",
      message: "Token has expired",
      statusCode: 401,
    });
  }

  // Handle custom AppErrors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
    });
  }

  // Handle unknown errors
  res.status(500).json({
    success: false,
    code: "INTERNAL_ERROR",
    message: isDevelopment ? err.message : "Internal server error",
    statusCode: 500,
  });
};

module.exports = { errorHandler, AppError };
