require("dotenv").config();
const app = require("./src/app");
const { connectDb, getDatabaseStatus } = require("./src/db");

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const NODE_ENV = process.env.NODE_ENV || "development";

async function startServer() {
  console.log("==========================================");
  console.log("   StockQR - Enterprise Inventory System  ");
  console.log("==========================================");

  // Initialize database (MongoDB or local embedded fallback)
  await connectDb(MONGODB_URI);

  const dbStatus = getDatabaseStatus();
  console.log(`📦 Database: ${dbStatus.type} (${dbStatus.storage})`);

  // Start HTTP server
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Environment: ${NODE_ENV}`);
    console.log(`📚 Health check: http://localhost:${PORT}/api/health`);
    console.log("------------------------------------------");
    console.log("Default credentials:");
    console.log("  Admin:    admin / admin123");
    console.log("  Operator: operator / operator123");
    console.log("==========================================");
  });

  const shutdown = () => {
    console.log("\n🛑 Shutting down gracefully...");
    server.close(() => {
      console.log("✅ Server closed successfully");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

startServer().catch((err) => {
  console.error("❌ Fatal error during server startup:", err);
  process.exit(1);
});
