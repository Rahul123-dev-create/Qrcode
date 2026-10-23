const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const transactionRoutes = require("./routes/transactions");
const dashboardRoutes = require("./routes/dashboard");

const { errorHandler } = require("./middleware/errorHandler");
const { validateInput } = require("./middleware/validation");

const app = express();

// CORS Configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Input validation and sanitization
app.use(validateInput);

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/dashboard", dashboardRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    code: "NOT_FOUND",
    message: "Endpoint not found",
    statusCode: 404,
  });
});

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
