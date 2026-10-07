const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middleware/auth");
const {
  User, CaregiverPatient, Medication,
  AdherenceLog, SideEffectReport, InteractionAlert,
} = require("../models");

router.use(authenticate);

// ── GET all patients assigned to this caregiver ───────────────────────────
router.get("/", requireRole("caregiver", "staff"), async (req, res) => {
  try {
    const links = await CaregiverPatient.find({
      caregiverId: req.user._id,
      isActive: true,
    }).populate("patientId", "name email phone dateOfBirth emergencyContact");

    const patients = links.map((l) => l.patientId);
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET a single patient's full overview ──────────────────────────────────
router.get("/:patientId/overview", requireRole("caregiver", "staff"), async (req, res) => {
  try {
    const { patientId } = req.params;

    // Verify this caregiver is assigned to this patient
    const link = await CaregiverPatient.findOne({
      caregiverId: req.user._id,
      patientId,
      isActive: true,
    });

    if (!link) {
      return res.status(403).json({ error: "You are not assigned to this patient." });
    }

    // Fetch all patient data in parallel
    const [medications, adherenceLogs, sideEffects, alerts] = await Promise.all([
      Medication.find({ userId: patientId, isActive: true }),
      AdherenceLog.find({ userId: patientId })
        .populate("medicationId", "name dosage")
        .sort({ scheduledTime: -1 })
        .limit(30),
      SideEffectReport.find({ userId: patientId })
        .sort({ createdAt: -1 })
        .limit(10),
      InteractionAlert.find({ userId: patientId, acknowledged: false })
        .sort({ createdAt: -1 }),
    ]);

    const taken  = adherenceLogs.filter((l) => l.status === "taken").length;
    const total  = adherenceLogs.filter((l) => l.status !== "pending").length;
    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : null;

    res.json({
      medications,
      adherenceLogs,
      sideEffects,
      alerts,
      summary: {
        totalMedications:  medications.length,
        adherenceRate,
        activeAlerts:      alerts.length,
        flaggedSideEffects: sideEffects.filter((s) => s.flaggedForReview).length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Assign a patient to this caregiver ───────────────────────────────────
router.post("/assign", requireRole("caregiver", "staff"), async (req, res) => {
  try {
    const { patientEmail, notes } = req.body;

    const patient = await User.findOne({ email: patientEmail, role: "patient" });
    if (!patient) {
      return res.status(404).json({ error: "Patient not found with that email." });
    }

    const existing = await CaregiverPatient.findOne({
      caregiverId: req.user._id,
      patientId: patient._id,
    });

    if (existing) {
      await existing.updateOne({ isActive: true, notes });
      return res.json({ message: "Patient reassigned successfully." });
    }

    const link = await CaregiverPatient.create({
      caregiverId: req.user._id,
      patientId: patient._id,
      notes,
    });

    res.status(201).json({
      message: `Patient ${patient.name} assigned successfully.`,
      link,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Remove a patient from this caregiver ─────────────────────────────────
router.delete("/:patientId", requireRole("caregiver", "staff"), async (req, res) => {
  try {
    await CaregiverPatient.findOneAndUpdate(
      { caregiverId: req.user._id, patientId: req.params.patientId },
      { isActive: false }
    );
    res.json({ message: "Patient unassigned." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;