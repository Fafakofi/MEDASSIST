const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const { User } = require("../models");

const router = express.Router();

// ── Generate JWT ─────────────────────────────────────────────────────────────

const generateToken = (id) =>
  jwt.sign(
    { id },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );


// ── POST /api/auth/register ─────────────────────────────────────────────────

router.post(
  "/register",
  [
    body("name").trim().notEmpty(),
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 8 }),
    body("role")
      .optional()
      .isIn(["patient", "caregiver", "staff"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
        });
      }

      const {
        name,
        email,
        password,
        role,
        dateOfBirth,
        phone,
        emergencyContact,
      } = req.body;

      // Check if user already exists
      const exists = await User.findOne({ email });

      if (exists) {
        return res.status(409).json({
          error: "Email already registered.",
        });
      }

      // Hash password
      const hashed = await bcrypt.hash(password, 12);

      // Create user
      const user = await User.create({
        name,
        email,
        password: hashed,
        role,
        dateOfBirth,
        phone,
        emergencyContact,
      });

      // Generate token
      const token = generateToken(user._id.toString());

      res.status(201).json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);

      res.status(500).json({
        error: "Failed to register user.",
      });
    }
  }
);


// ── POST /api/auth/login ────────────────────────────────────────────────────

router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email });

      if (
        !user ||
        !(await bcrypt.compare(password, user.password))
      ) {
        return res.status(401).json({
          error: "Invalid credentials.",
        });
      }

      // Check account status
      if (!user.isActive) {
        return res.status(403).json({
          error: "Account deactivated.",
        });
      }

      // Generate token
      const token = generateToken(user._id.toString());

      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Login error:", error);

      res.status(500).json({
        error: "Failed to login.",
      });
    }
  }
);


// ── POST /api/auth/fcm-token ─────────────────────────────────────────────────

const { authenticate } = require("../middleware/auth");

router.post(
  "/fcm-token",
  authenticate,
  async (req, res) => {
    try {
      const { fcmToken } = req.body;

      await req.user.updateOne({
        fcmToken,
      });

      res.json({
        message: "FCM token updated.",
      });
    } catch (error) {
      console.error("FCM token update error:", error);

      res.status(500).json({
        error: "Failed to update FCM token.",
      });
    }
  }
);

  // PATCH /api/auth/profile
  router.patch("/profile", authenticate, async (req, res) => {
    try {
      const { name, phone, dateOfBirth, emergencyContact } = req.body;

      const updated = await User.findByIdAndUpdate(
        req.user._id,
        { name, phone, dateOfBirth, emergencyContact },
        { new: true, select: "-password" }
      );

      res.json({
        message: "Profile updated successfully.",
        user: {
          id:    updated._id,
          name:  updated.name,
          email: updated.email,
          role:  updated.role,
          phone: updated.phone,
          dateOfBirth:      updated.dateOfBirth,
          emergencyContact: updated.emergencyContact,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


module.exports = router;

