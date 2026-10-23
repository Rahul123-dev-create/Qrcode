const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const authService = require("../services/authService");
const { authLimiter } = require("../middleware/rateLimiter");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { username, password, name, role } = req.body;
    const result = await authService.register(username, password, name, role);
    res.status(201).json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/auth/login
 * Login an existing user
 */
router.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const result = await authService.login(username, password);
    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await authService.getUserById(req.userId);
    res.json({
      success: true,
      data: user,
    });
  })
);

/**
 * GET /api/auth/users
 * List all users (admin only)
 */
router.get(
  "/users",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (_req, res) => {
    const users = await authService.getAllUsers();
    res.json({
      success: true,
      data: users,
    });
  })
);

/**
 * POST /api/auth/users
 * Create a new user (admin only)
 */
router.post(
  "/users",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const result = await authService.createUser(req.body);
    res.status(201).json({
      success: true,
      data: result,
    });
  })
);

/**
 * DELETE /api/auth/users/:id
 * Delete a user (admin only)
 */
router.delete(
  "/users/:id",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const result = await authService.deleteUser(req.userId, req.params.id);
    res.json({
      success: true,
      data: result,
    });
  })
);

module.exports = router;
