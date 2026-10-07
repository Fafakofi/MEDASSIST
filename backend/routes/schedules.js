const express = require("express");
const mongoose = require("mongoose");

const {
  Schedule,
  Medication,
  AdherenceLog,
} = require("../models");

const { dispatch } = require("../orchestrator/queueManager");

const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);


// ── GET /api/schedules ───────────────────────────────────────────────────────

router.get("/", async (req, res) => {
  try {
    const schedules = await Schedule.find({
      userId: req.user._id,
      isActive: true,
    })
      .populate("medicationId")
      .sort({ createdAt: -1 });

    res.json(schedules);
  } catch (error) {
    console.error("Get schedules error:", error);

    res.status(500).json({
      error: "Failed to retrieve schedules.",
    });
  }
});


// ── POST /api/schedules ──────────────────────────────────────────────────────

router.post("/", async (req, res) => {
  try {
    const {
      medicationId,
      frequency,
      times,
      daysOfWeek,
      withFood,
    } = req.body;

    // Validate medication ID
    if (!mongoose.Types.ObjectId.isValid(medicationId)) {
      return res.status(400).json({
        error: "Invalid medication ID.",
      });
    }

    // Make sure medication belongs to the authenticated user
    const med = await Medication.findOne({
      _id: medicationId,
      userId: req.user._id,
      isActive: true,
    });

    if (!med) {
      return res.status(404).json({
        error: "Medication not found.",
      });
    }

    // Create schedule
    const schedule = await Schedule.create({
      medicationId,
      userId: req.user._id,
      frequency,
      times,
      daysOfWeek,
      withFood,
    });

    // Trigger scheduling agent
    await dispatch.scheduling({
      userId: req.user._id.toString(),
      medicationId: medicationId.toString(),
    });

    res.status(201).json(schedule);
  } catch (error) {
    console.error("Create schedule error:", error);

    res.status(500).json({
      error: "Failed to create schedule.",
    });
  }
});


// ── PATCH /api/schedules/adherence/:logId ─────────────────────────────────────

router.patch("/adherence/:logId", async (req, res) => {
  try {
    const { logId } = req.params;

    // Validate log ID
    if (!mongoose.Types.ObjectId.isValid(logId)) {
      return res.status(400).json({
        error: "Invalid adherence log ID.",
      });
    }

    const log = await AdherenceLog.findOne({
      _id: logId,
      userId: req.user._id,
    });

    if (!log) {
      return res.status(404).json({
        error: "Log not found.",
      });
    }

    // Update adherence information
    log.status = req.body.status;

    log.takenAt =
      req.body.status === "taken"
        ? new Date()
        : null;

    if (req.body.notes !== undefined) {
      log.notes = req.body.notes;
    }

    await log.save();

    res.json(log);
  } catch (error) {
    console.error("Update adherence log error:", error);

    res.status(500).json({
      error: "Failed to update adherence log.",
    });
  }
});

// GET all adherence logs for this user
router.get("/adherence", async (req, res) => {
  try {
    const logs = await AdherenceLog.find({ userId: req.user._id })
      .populate("medicationId", "name dosage")
      .sort({ scheduledTime: -1 })
      .limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// POST /api/schedules/caregiver — caregiver creates schedule for a patient
router.post("/caregiver", requireRole("caregiver", "staff"), async (req, res) => {
  try {
    const { patientId, medicationId, frequency, times, withFood } = req.body;

    // Verify caregiver is assigned to this patient
    const { CaregiverPatient } = require("../models");
    const link = await CaregiverPatient.findOne({
      caregiverId: req.user._id,
      patientId,
      isActive: true,
    });

    if (!link) {
      return res.status(403).json({ error: "You are not assigned to this patient." });
    }

    // Verify medication belongs to patient
    const med = await Medication.findOne({
      _id: medicationId,
      userId: patientId,
      isActive: true,
    });

    if (!med) {
      return res.status(404).json({ error: "Medication not found for this patient." });
    }

    const schedule = await Schedule.create({
      medicationId,
      userId: patientId,
      frequency,
      times,
      withFood: withFood || false,
    });

    // Trigger scheduling agent for the patient
    await dispatch.scheduling({
      userId: patientId.toString(),
      medicationId: medicationId.toString(),
    });

    
    res.status(201).json({
      schedule,
      message: `Schedule created for patient. They will see it on their app immediately.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
  
});

module.exports = router;

