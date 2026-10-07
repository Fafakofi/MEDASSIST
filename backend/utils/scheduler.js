const cron = require("node-cron");
const logger = require("./logger");
const { dispatch } = require("../orchestrator/queueManager");
const { Medication, User, AdherenceLog } = require("../models");

function initScheduler() {

  // ── Run Refill Agent every day at 8:00 AM ────────────────────────────────
  cron.schedule("0 8 * * *", async () => {
    logger.info("[Scheduler] Running daily refill check...");
    try {
      const medications = await Medication.find({ isActive: true });

      for (const med of medications) {
        if (med.remainingQuantity != null && med.remainingQuantity <= (med.refillThreshold * 2)) {
          await dispatch.refill({
            userId: med.userId.toString(),
            medicationId: med._id.toString(),
          });
        }
      }

      logger.info(`[Scheduler] Refill check complete — ${medications.length} medications checked.`);
    } catch (err) {
      logger.error(`[Scheduler] Refill check failed: ${err.message}`);
    }
  });

  // ── Run Interaction check every day at 9:00 AM ───────────────────────────
  cron.schedule("0 9 * * *", async () => {
    logger.info("[Scheduler] Running daily interaction check...");
    try {
      const users = await User.find({ role: "patient", isActive: true });

      for (const user of users) {
        const meds = await Medication.find({ userId: user._id, isActive: true });
        if (meds.length >= 2) {
          await dispatch.interaction({
            userId: user._id.toString(),
            medicationIds: meds.map((m) => m._id.toString()),
          });
        }
      }

      logger.info(`[Scheduler] Interaction check complete — ${users.length} patients checked.`);
    } catch (err) {
      logger.error(`[Scheduler] Interaction check failed: ${err.message}`);
    }
  });

  // ── Auto-mark missed doses every hour ────────────────────────────────────
cron.schedule("0 * * * *", async () => {
  logger.info("[Scheduler] Checking for missed doses...");
  try {
    const now = new Date();

    const missedLogs = await AdherenceLog.find({
      status: "pending",
      scheduledTime: { $lt: now },
    });

    if (missedLogs.length > 0) {
      await AdherenceLog.updateMany(
        {
          status: "pending",
          scheduledTime: { $lt: now },
        },
        { status: "missed" }
      );
      logger.info(`[Scheduler] Marked ${missedLogs.length} doses as missed.`);
    }
  } catch (err) {
    logger.error(`[Scheduler] Missed dose check failed: ${err.message}`);
  }
});

  logger.info("[Scheduler] Daily jobs scheduled — refill at 08:00, interactions at 09:00.");
}

module.exports = { initScheduler };