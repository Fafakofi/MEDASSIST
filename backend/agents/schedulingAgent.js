const mongoose = require("mongoose");
const { callAI } = require("../config/ai");
const { Schedule, AdherenceLog, Medication } = require("../models");
const { sendPushNotification } = require("../utils/notifications");
const logger = require("../utils/logger");

const SYSTEM_PROMPT = `You are a medication scheduling assistant.
Given a patient's medication list and schedule, generate a clear daily schedule
and reminder messages. Always remind patients to take medications as prescribed.
IMPORTANT: Always include this disclaimer in your output:
"This schedule is a decision-support tool only. Always follow your doctor's instructions."
Respond in JSON format: { "schedule": [], "reminderMessages": [] }`;

module.exports = async function schedulingAgent(job) {
  const { userId, medicationId } = job.data;
  logger.info(`[SchedulingAgent] Processing job for user ${userId}`);

  try {
    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(medicationId)
    ) {
      throw new Error("Invalid user or medication ID.");
    }

    const medication = await Medication.findById(medicationId);
    if (!medication) throw new Error(`Medication ${medicationId} not found`);

    const schedule = await Schedule.findOne({
      medicationId,
      userId,
      isActive: true,
    });
    if (!schedule) throw new Error(`No active schedule for medication ${medicationId}`);

    // ── Create Adherence Logs FIRST (no AI needed) ────────────────────────
    let logsCreated = 0;
    try {
      for (const time of schedule.times || []) {
        const [hour, minute] = time.split(":").map(Number);
        const scheduledTime = new Date();
        scheduledTime.setHours(hour, minute, 0, 0);

        logger.info(`[SchedulingAgent] Creating log for time: ${time}`);

        const existingLog = await AdherenceLog.findOne({
          scheduleId:    schedule._id,
          userId,
          scheduledTime,
        });

        if (!existingLog) {
          await AdherenceLog.create({
            scheduleId:   schedule._id,
            userId,
            medicationId,
            scheduledTime,
            status: "pending",
          });
          logsCreated++;
          logger.info(`[SchedulingAgent] Log created for ${time}`);
        } else {
          logger.info(`[SchedulingAgent] Log already exists for ${time} — skipping`);
        }
      }
      logger.info(`[SchedulingAgent] ${logsCreated} adherence logs created.`);
    } catch (logErr) {
      logger.error(`[SchedulingAgent] Log creation error: ${logErr.message}`);
    }

    // ── Generate Reminder Messages via AI (optional) ──────────────────────
    try {
      const prompt = `
Patient medication: ${medication.name} ${medication.dosage}
Schedule frequency: ${schedule.frequency}
Scheduled times: ${schedule.times?.join(", ") || "Not specified"}
Instructions: ${medication.instructions || "None"}
Generate reminder messages for each scheduled dose.`;

      const raw = await callAI(SYSTEM_PROMPT, prompt);
      logger.info(`[SchedulingAgent] Raw Gemini response: ${raw}`);

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        for (const msg of result.reminderMessages || []) {
          await sendPushNotification(userId, {
            title: "💊 Medication Reminder",
            body:  msg,
            data:  { type: "reminder", medicationId },
          });
        }
      }
    } catch (aiErr) {
      // AI failure does not stop the agent — logs are already created
      logger.warn(`[SchedulingAgent] AI reminder generation failed: ${aiErr.message} — logs still created.`);
    }

    logger.info(`[SchedulingAgent] Done for user ${userId}, medication ${medicationId}`);

  } catch (err) {
    logger.error(`[SchedulingAgent] Full error: ${err.message}`);
    logger.error(`[SchedulingAgent] Stack: ${err.stack}`);
    throw err;
  }
};