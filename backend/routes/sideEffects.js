const express = require("express");
const mongoose = require("mongoose");

const { SideEffectReport } = require("../models");
const { authenticate } = require("../middleware/auth");
const { dispatch } = require("../orchestrator/queueManager");

const router = express.Router();

router.use(authenticate);


// ── POST /api/side-effects ───────────────────────────────────────────────────
// Patient reports symptoms

router.post("/", async (req, res) => {
  try {
    const {
      symptoms,
      severity,
      description,
      medicationId,
    } = req.body;

    // Validate symptoms
    if (!symptoms?.length) {
      return res.status(400).json({
        error: "At least one symptom required.",
      });
    }

    // Validate medication ID if provided
    if (
      medicationId &&
      !mongoose.Types.ObjectId.isValid(medicationId)
    ) {
      return res.status(400).json({
        error: "Invalid medication ID.",
      });
    }

    // Create side-effect report
    const report = await SideEffectReport.create({
      userId: req.user._id,
      symptoms,
      severity,
      description,
      medicationId,
    });

    // Trigger side-effect analysis agent
    await dispatch.sideEffect({
      userId: req.user._id.toString(),
      reportId: report._id.toString(),
    });

    res.status(201).json({
      report,
      message:
        "Report submitted. Our system will analyze your symptoms.",
      disclaimer:
        "If you are experiencing a medical emergency, call emergency services immediately.",
    });
  } catch (error) {
    console.error("Side-effect report error:", error);

    res.status(500).json({
      error: "Failed to submit side-effect report.",
    });
  }
});


// ── GET /api/side-effects ────────────────────────────────────────────────────
// Patient's own reports

router.get("/", async (req, res) => {
  try {
    const reports = await SideEffectReport.find({
      userId: req.user._id,
    })
      .sort({ createdAt: -1 })
      .populate("medicationId");

    res.json(reports);
  } catch (error) {
    console.error("Get side-effect reports error:", error);

    res.status(500).json({
      error: "Failed to retrieve side-effect reports.",
    });
  }
});


module.exports = router;

