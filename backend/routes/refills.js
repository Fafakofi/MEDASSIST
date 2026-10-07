const express = require("express");
const router = express.Router();
const { RefillReminder, Medication } = require("../models");
const { authenticate } = require("../middleware/auth");
const { dispatch } = require("../orchestrator/queueManager");

router.use(authenticate);

// GET all refill reminders for this user
router.get("/", async (req, res) => {
  try {
    const refills = await RefillReminder.find({ userId: req.user._id })
      .populate("medicationId", "name dosage remainingQuantity")
      .sort({ createdAt: -1 });
    res.json(refills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST manually trigger refill check for a medication
router.post("/check", async (req, res) => {
  try {
    const { medicationId } = req.body;
    if (!medicationId) {
      return res.status(400).json({ error: "medicationId is required." });
    }

    const med = await Medication.findOne({
      _id: medicationId,
      userId: req.user._id,
      isActive: true,
    });

    if (!med) return res.status(404).json({ error: "Medication not found." });

    await dispatch.refill({
      userId: req.user._id.toString(),
      medicationId: medicationId.toString(),
    });

    res.json({ message: "Refill check triggered." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update refill status (dismissed or refilled)
router.patch("/:id", async (req, res) => {
  try {
    const refill = await RefillReminder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: req.body.status },
      { new: true }
    );
    if (!refill) return res.status(404).json({ error: "Refill reminder not found." });
    res.json(refill);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;