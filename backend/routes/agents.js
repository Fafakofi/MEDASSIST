const express = require("express");
const router  = express.Router();
const { authenticate } = require("../middleware/auth");
const { dispatch }     = require("../orchestrator/queueManager");
const { Medication }   = require("../models");

router.use(authenticate);

// Manually trigger refill agent
router.post("/trigger-refill", async (req, res) => {
  try {
    const { medicationId } = req.body;
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
    res.json({ message: "Refill agent triggered." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manually trigger interaction agent
router.post("/trigger-interaction", async (req, res) => {
  try {
    const medications = await Medication.find({
      userId: req.user._id,
      isActive: true,
    });
    if (medications.length < 2) {
      return res.json({ message: "Need at least 2 medications to check interactions." });
    }
    await dispatch.interaction({
      userId: req.user._id.toString(),
      medicationIds: medications.map((m) => m._id.toString()),
    });
    res.json({ message: "Interaction check triggered." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;