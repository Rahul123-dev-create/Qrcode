const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-me";

function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.username = decoded.username;
    req.userRole = decoded.role || "operator";
    req.userName = decoded.name || decoded.username;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: requires one of [${allowedRoles.join(", ")}] roles`,
      });
    }
    next();
  };
}

function signToken(userId, username, role = "operator", name = "") {
  return jwt.sign(
    { userId, username, role, name: name || username },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

module.exports = { requireAuth, requireRole, signToken };
