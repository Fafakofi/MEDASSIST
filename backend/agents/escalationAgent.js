const mongoose = require("mongoose");
const { callAI } = require("../config/ai");
const { User, CaregiverPatient } = require("../models");
const { sendPushNotification } = require("../utils/notifications");
const logger = require("../utils/logger");

const SYSTEM_PROMPT = `
You are a medical safety escalation assistant.
A patient has experienced a critical event requiring escalation to their caregiver
or healthcare provider.
Generate a calm, clear escalation message for both the patient and caregiver.
ALWAYS include:
"If this is a medical emergency, call emergency services (e.g. 911) immediately."
Respond in JSON:
{
  "patientMessage": "",
  "caregiverMessage": "",
  "emergencyPrompt": "If this is a medical emergency, call emergency services immediately."
}
`;

module.exports = async function escalationAgent(job) {
  const { userId, reason, analysis, reportId } = job.data;
  logger.warn(`[EscalationAgent] ESCALATION for user ${userId} — reason: ${reason}`);

  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID.");
    }

    const user = await User.findById(userId);
    if (!user) throw new Error(`User ${userId} not found`);

    const prompt = `
Patient: ${user.name}
Escalation reason: ${reason}
Agent analysis summary: ${JSON.stringify(analysis || {})}
Emergency contact: ${JSON.stringify(user.emergencyContact || {})}
Generate escalation messages for patient and caregiver.
`;

    const raw = await callAI(SYSTEM_PROMPT, prompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    const messages = JSON.parse(jsonMatch[0]);

    // ── Notify Patient ──────────────────────────────────────────────────────
    await sendPushNotification(userId, {
      title: "🚨 Important Health Alert",
      body: messages.patientMessage,
      data: { type: "escalation", urgent: true },
    });

    // ── Notify Assigned Caregiver ───────────────────────────────────────────
    const caregiverLink = await CaregiverPatient.findOne({
      patientId: userId,
      isActive: true,
    }).populate("caregiverId", "name email fcmToken");

    if (caregiverLink?.caregiverId) {
      const caregiver = caregiverLink.caregiverId;
      logger.warn(`[EscalationAgent] Notifying caregiver ${caregiver.name} for patient ${user.name}`);

      await sendPushNotification(caregiver._id.toString(), {
        title: `🚨 Patient Alert — ${user.name}`,
        body: messages.caregiverMessage,
        data: {
          type: "escalation",
          patientId: userId,
          urgent: true,
          ...(reportId && { reportId: reportId.toString() }),
        },
      });
    } else {
      logger.warn(`[EscalationAgent] No caregiver found for patient ${userId}`);
    }

    logger.warn(`[EscalationAgent] Escalation complete for user ${userId}`);
    return messages;

  } catch (err) {
    logger.error(`[EscalationAgent] Full error: ${err.message}`);
    logger.error(`[EscalationAgent] Stack: ${err.stack}`);
    throw err;
  }
};