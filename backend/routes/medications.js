const express = require("express");
const { body, validationResult } = require("express-validator");
const mongoose = require("mongoose");

const { Medication } = require("../models");
const { authenticate } = require("../middleware/auth");
const { dispatch } = require("../orchestrator/queueManager");

const router = express.Router();

router.use(authenticate);


// ── GET /api/medications ─────────────────────────────────────────────────────

router.get("/", async (req, res) => {
  try {
    const medications = await Medication.find({
      userId: req.user._id,
      isActive: true,
    }).sort({ createdAt: -1 });

    res.json(medications);
  } catch (error) {
    console.error("Get medications error:", error);

    res.status(500).json({
      error: "Failed to retrieve medications.",
    });
  }
});


// ── POST /api/medications ────────────────────────────────────────────────────

router.post(
  "/",
  [
    body("name").trim().notEmpty(),
    body("dosage").notEmpty(),
    body("genericName").optional().trim(),
    body("rxcui").optional().trim(),
    body("totalQuantity").optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
        });
      }

      const medication = await Medication.create({
        ...req.body,
        userId: req.user._id,
      });

      // Get all active medications for this user
      const allMeds = await Medication.find({
        userId: req.user._id,
        isActive: true,
      }).select("_id");

      // Trigger interaction check if user has more than one medication
      if (allMeds.length > 1) {
        await dispatch.interaction({
          userId: req.user._id.toString(),
          medicationIds: allMeds.map((m) => m._id.toString()),
        });
      }

      res.status(201).json({
        medication,
        disclaimer:
          "Always consult your healthcare provider before making changes to your medications.",
      });
    } catch (error) {
      console.error("Create medication error:", error);

      res.status(500).json({
        error: "Failed to create medication.",
      });
    }
  }
);


// ── PATCH /api/medications/:id ────────────────────────────────────────────────

router.patch("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: "Invalid medication ID.",
      });
    }

    const medication = await Medication.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!medication) {
      return res.status(404).json({
        error: "Medication not found.",
      });
    }

    Object.assign(medication, req.body);

    await medication.save();

    res.json(medication);
  } catch (error) {
    console.error("Update medication error:", error);

    res.status(500).json({
      error: "Failed to update medication.",
    });
  }
});


// ── DELETE /api/medications/:id ───────────────────────────────────────────────
// Soft delete

router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: "Invalid medication ID.",
      });
    }

    const medication = await Medication.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!medication) {
      return res.status(404).json({
        error: "Medication not found.",
      });
    }

    medication.isActive = false;

    await medication.save();

    res.json({
      message: "Medication removed.",
    });
  } catch (error) {
    console.error("Delete medication error:", error);

    res.status(500).json({
      error: "Failed to remove medication.",
    });
  }
});


module.exports = router;

