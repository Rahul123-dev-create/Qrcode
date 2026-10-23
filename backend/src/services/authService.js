/**
 * Authentication Service
 * Handles user registration, login, and token management
 */

const { User } = require("../db");
const { signToken } = require("../middleware/auth");
const { AppError } = require("../middleware/errorHandler");
const { validatePassword, validateRequired } = require("../middleware/validation");

class AuthService {
  async register(username, password, name = "", role = "operator") {
    const validationError = validateRequired(
      { username, password },
      ["username", "password"]
    );
    if (validationError) {
      throw new AppError(validationError, 400, "VALIDATION_ERROR");
    }

    if (username.length < 3 || username.length > 50) {
      throw new AppError("Username must be between 3 and 50 characters", 400, "INVALID_USERNAME");
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      throw new AppError("Username can only contain letters, numbers, underscore, and dash", 400, "INVALID_USERNAME");
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      throw new AppError(passwordError, 400, "WEAK_PASSWORD");
    }

    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      throw new AppError("Username already taken", 409, "USER_EXISTS");
    }

    // Assign role
    const assignedRole = ["admin", "operator"].includes(role) ? role : "operator";

    const user = new User({
      username: username.toLowerCase().trim(),
      password,
      name: name?.trim() || username,
      role: assignedRole,
    });
    await user.save();

    const token = signToken(String(user._id), user.username, user.role, user.name);

    return {
      token,
      user: {
        id: String(user._id),
        username: user.username,
        name: user.name,
        role: user.role,
      },
    };
  }

  async login(username, password) {
    const validationError = validateRequired(
      { username, password },
      ["username", "password"]
    );
    if (validationError) {
      throw new AppError(validationError, 400, "VALIDATION_ERROR");
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const token = signToken(String(user._id), user.username, user.role || "operator", user.name || user.username);

    return {
      token,
      user: {
        id: String(user._id),
        username: user.username,
        name: user.name || user.username,
        role: user.role || "operator",
      },
    };
  }

  async getUserById(userId) {
    const user = await User.findById(userId).select("-password");
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }
    return {
      id: String(user._id),
      username: user.username,
      name: user.name || user.username,
      role: user.role || "operator",
      createdAt: user.createdAt,
    };
  }

  async getAllUsers() {
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });
    return users.map((u) => ({
      id: String(u._id),
      username: u.username,
      name: u.name || u.username,
      role: u.role || "operator",
      createdAt: u.createdAt,
    }));
  }

  async createUser(data) {
    const { username, password, name, role } = data;
    return this.register(username, password, name, role);
  }

  async deleteUser(adminUserId, targetUserId) {
    if (String(adminUserId) === String(targetUserId)) {
      throw new AppError("You cannot delete your own account", 400, "CANNOT_DELETE_SELF");
    }
    const user = await User.findById(targetUserId);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }
    if (typeof User.findByIdAndDelete === "function") {
      await User.findByIdAndDelete(targetUserId);
    }
    return { success: true, message: "User deleted successfully" };
  }
}

module.exports = new AuthService();
