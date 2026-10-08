require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { initScheduler } = require("./utils/scheduler");

const { sequelize } = require("./models");
const { initQueues } = require("./orchestrator/queueManager");
const logger = require("./utils/logger");

// Routes
const authRoutes = require("./routes/auth");
const medicationRoutes = require("./routes/medications");
const scheduleRoutes = require("./routes/schedules");
const sideEffectRoutes = require("./routes/sideEffects");
const interactionRoutes = require("./routes/interactions");
const refillRoutes = require("./routes/refills");
const dashboardRoutes = require("./routes/dashboard");
const agentRoutes = require("./routes/agents");
const patientRoutes = require("./routes/patients");

const app = express();

// ── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://medassist-fafakofi.vercel.app",
  ],
  credentials: true,
}));
app.use(express.json({ limit: "10kb" }));
app.use((req, res, next) => {
  res.setHeader("ngrok-skip-browser-warning", "true");
  next();
});
app.use("/api/patients", patientRoutes);

// Global rate limiter
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", limiter);

// ── Safety Disclaimer Middleware ─────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader(
    "X-Medical-Disclaimer",
    "This system is a decision-support tool only and does not replace professional medical advice."
  );
  next();
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/medications", medicationRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/side-effects", sideEffectRoutes);
app.use("/api/interactions", interactionRoutes);
app.use("/api/refills", refillRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/agents", agentRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    disclaimer:
      "This system is a decision-support tool only. Always consult a qualified healthcare professional.",
  });
});

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    disclaimer:
      "If this is a medical emergency, please contact your healthcare provider or call emergency services immediately.",
  });
});

// ── Boot ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    logger.info("MongoDB connected successfully.");

    initQueues();
    logger.info("Agent job queues initialized.");
    initScheduler();

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (err) {
    logger.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
