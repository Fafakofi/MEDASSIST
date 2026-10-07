const mongoose = require("mongoose");

const { callAI } = require("../config/ai");
const {
  Medication,
  RefillReminder,
} = require("../models");

const {
  sendPushNotification,
} = require("../utils/notifications");

const logger = require("../utils/logger");


const SYSTEM_PROMPT = `
You are a medication refill assistant.

Given a patient's medication supply data, calculate when they will run out and
generate a friendly, clear refill reminder message.

Respond in JSON:
{
  "estimatedRunOutDate": "YYYY-MM-DD",
  "message": "",
  "daysRemaining": 0
}
`;


// ── Refill Agent ─────────────────────────────────────────────────────────────

module.exports = async function refillAgent(job) {
  const { userId, medicationId } = job.data;

  logger.info(
    `[RefillAgent] Checking refill for medication ${medicationId}`
  );

  try {

    // ── Validate IDs ────────────────────────────────────────────────────────

    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(medicationId)
    ) {
      throw new Error("Invalid user or medication ID.");
    }


    // ── Find Medication ─────────────────────────────────────────────────────

    const medication = await Medication.findById(
      medicationId
    );

    if (!medication) {
      throw new Error(
        `Medication ${medicationId} not found`
      );
    }


    const {
      remainingQuantity,
      refillThreshold,
      name,
      dosage,
    } = medication;


    // ── Check Quantity Tracking ────────────────────────────────────────────

    if (remainingQuantity === null || remainingQuantity === undefined) {
      logger.info(
        "[RefillAgent] No quantity tracking — skipping."
      );

      return;
    }


    // ── Build Claude Prompt ─────────────────────────────────────────────────

    const prompt = `
Medication: ${name} ${dosage}

Remaining quantity: ${remainingQuantity} doses

Refill alert threshold: ${refillThreshold} days

Today's date:
${new Date().toISOString().split("T")[0]}

Generate a refill reminder with estimated run-out date.
`;


    // ── Call Claude ─────────────────────────────────────────────────────────

    const raw = await callAI(
      SYSTEM_PROMPT,
      prompt
    );

    const result = JSON.parse(raw);


    // ── Determine Whether Reminder Is Needed ───────────────────────────────

    if (
      result.daysRemaining <= refillThreshold
    ) {

      // Find an existing pending reminder
      let reminder = await RefillReminder.findOne({
        userId,
        medicationId,
        status: "pending",
      });


      // Create reminder if one doesn't exist
      if (!reminder) {
        reminder = await RefillReminder.create({
          userId,
          medicationId,
          estimatedRunOutDate:
            result.estimatedRunOutDate,
          status: "pending",
        });
      }


      // Send notification if reminder hasn't been sent
      if (
        reminder.status === "pending" &&
        !reminder.reminderSentAt
      ) {

        await sendPushNotification(
          userId,
          {
            title: "💊 Refill Reminder",
            body: result.message,
            data: {
              type: "refill",
              medicationId,
              reminderId: reminder._id.toString(),
            },
          }
        );


        reminder.reminderSentAt = new Date();
        reminder.status = "sent";

        await reminder.save();
      }
    }


    logger.info(
      `[RefillAgent] ${name} — ${result.daysRemaining} days remaining.`
    );

    return result;

  } catch (err) {
    logger.error(
      "[RefillAgent] Error:",
      err.message
    );

    throw err;
  }
};
