const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { User } = require("../models");


// ── Authenticate User ────────────────────────────────────────────────────────

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Make sure the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(decoded.id)) {
      return res.status(401).json({
        error: "Invalid user ID.",
      });
    }

    // Find user in MongoDB
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: "User not found or deactivated.",
      });
    }

    // Attach user to request
    req.user = user;

    next();
  } catch (err) {
    return res.status(401).json({
      error: "Invalid or expired token.",
    });
  }
};


// ── Require Specific Role ────────────────────────────────────────────────────

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      error: "Insufficient permissions.",
    });
  }

  next();
};


module.exports = {
  authenticate,
  requireRole,
};

