
const mongoose = require("mongoose");

const { callAI } = require("../config/ai");

const {
  SideEffectReport,
  Medication,
} = require("../models");


const logger = require("../utils/logger");


const SYSTEM_PROMPT = `
You are a clinical safety monitoring assistant.

A patient has reported symptoms while taking medications. Your job is to:

1. Assess whether symptoms may be related to their medications
2. Identify any red-flag symptoms requiring urgent care
3. Provide general guidance

MANDATORY DISCLAIMER: Always include:

"This assessment is for informational purposes only and does not constitute medical advice.
If symptoms are severe or worsening, seek immediate medical attention or call emergency services."

Respond in JSON:

{
  "possibleCauses": [],
  "redFlags": [],
  "recommendation": "",
  "urgency": "routine | soon | urgent | emergency",
  "disclaimer": ""
}
`;


// ── Side Effect Agent ────────────────────────────────────────────────────────

module.exports = async function sideEffectAgent(job) {
  const { userId, reportId } = job.data;

  logger.info(
    `[SideEffectAgent] Analyzing report ${reportId} for user ${userId}`
  );

  try {

    // ── Validate IDs ────────────────────────────────────────────────────────

    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(reportId)
    ) {
      throw new Error("Invalid user or report ID.");
    }


    // ── Find Side Effect Report ─────────────────────────────────────────────

    const report = await SideEffectReport.findById(reportId)
      .populate("medicationId");

    if (!report) {
      throw new Error(
        `Report ${reportId} not found`
      );
    }


    // ── Get Current Medications ─────────────────────────────────────────────

    const medications = await Medication.find({
      userId,
      isActive: true,
    });


    // ── Build Claude Prompt ─────────────────────────────────────────────────

    const prompt = `
Patient reported symptoms:
${report.symptoms.join(", ")}

Severity self-reported:
${report.severity}

Description:
${report.description || "None"}

Current medications:
${
  medications
    .map(
      (m) => `- ${m.name} ${m.dosage}`
    )
    .join("\n") || "Not specified"
}

Analyze these symptoms in context of the patient's medications.
`;


    // ── Call Claude ─────────────────────────────────────────────────────────

    const raw = await callAI(
      SYSTEM_PROMPT,
      prompt
    );

    logger.info(`[SideEffectAgent] Raw Gemini response: ${raw}`);

    let analysis;
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in response");
        analysis = JSON.parse(jsonMatch[0]);
      } catch (parseErr) 
      {
        logger.error("[SideEffectAgent] Failed to parse Gemini response:", raw);
        throw new Error("Invalid JSON response from AI");
      }


    // ── Determine Escalation ────────────────────────────────────────────────

    const shouldFlag = ["urgent", "emergency"].includes(analysis.urgency) || analysis.redFlags?.length > 0;
    const shouldEscalate = ["urgent", "emergency"].includes(analysis.urgency);

  await report.updateOne({
    agentAnalysis: analysis,
    flaggedForReview: shouldFlag,
    escalated: shouldEscalate,
  });

  if (shouldEscalate) {
  const escalationAgent = require("../agents/escalationAgent");
  await escalationAgent({
    data: {
      userId,
      reportId: report._id,
      reason: `${analysis.urgency}_side_effect`,
      analysis,
    },
  });
}

  logger.info(`[SideEffectAgent] Report ${reportId} — urgency: ${analysis.urgency}, flagged: ${shouldFlag}, escalated: ${shouldEscalate}`);


    logger.info(
      `[SideEffectAgent] Report ${reportId} — urgency: ${analysis.urgency}`
    );

    return analysis;

  } 
  catch (err) {
  logger.error(`[SideEffectAgent] Full error: ${err.message}`);
  logger.error(`[SideEffectAgent] Stack: ${err.stack}`);
  throw err;
}
};
