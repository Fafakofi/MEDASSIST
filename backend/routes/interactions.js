const express = require("express");
const { InteractionAlert } = require("../models");
const { authenticate } = require("../middleware/auth");
const router = express.Router();

router.use(authenticate);

// GET all interaction alerts for this user
router.get("/", async (req, res) => {
  const alerts = await InteractionAlert.find({ userId: req.user._id })
    .sort({ createdAt: -1 });
  res.json(alerts);
});

// PATCH acknowledge an alert
router.patch("/:id/acknowledge", async (req, res) => {
  const alert = await InteractionAlert.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { acknowledged: true, acknowledgedBy: req.user._id },
    { new: true }
  );
  if (!alert) return res.status(404).json({ error: "Alert not found." });
  res.json(alert);
});

module.exports = router;