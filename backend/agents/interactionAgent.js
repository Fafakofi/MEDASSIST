

const mongoose = require("mongoose");
const axios = require("axios");

const { callAI } = require("../config/ai");
const {
  InteractionAlert,
  Medication,
} = require("../models");

const {
  sendPushNotification,
} = require("../utils/notifications");

const logger = require("../utils/logger");


const SYSTEM_PROMPT = `
You are a clinical pharmacology assistant specializing in drug interaction analysis.

Given a list of medications a patient is taking, identify any potential drug-drug interactions.

Rate severity as:
- minor
- moderate
- major
- contraindicated

CRITICAL DISCLAIMER:
Always include this in your response:

"This analysis is for decision-support only. A licensed pharmacist or physician must review all interactions."

Respond in JSON:

{
  "interactions": [
    {
      "drugs": [],
      "severity": "",
      "description": "",
      "recommendation": ""
    }
  ]
}
`;


// ── OpenFDA Interaction Lookup ───────────────────────────────────────────────

async function fetchFdaInteractions(rxcuis) {
  try {
    const query = rxcuis.join("+");

    const url =
      `https://api.fda.gov/drug/label.json` +
      `?search=drug_interactions:"${query}"&limit=5`;

    const { data } = await axios.get(url, {
      timeout: 5000,
    });

    return (
      data.results
        ?.map((r) => r.drug_interactions)
        .flat() || []
    );

  } catch (error) {
    logger.warn(
      "[InteractionAgent] OpenFDA unavailable — continuing without FDA data."
    );

    return [];
  }
}


// ── Interaction Agent ────────────────────────────────────────────────────────

module.exports = async function interactionAgent(job) {
  const {
    userId,
    medicationIds,
  } = job.data;

  logger.info(
    `[InteractionAgent] Checking interactions for user ${userId}`
  );

  try {

    // ── Validate IDs ────────────────────────────────────────────────────────

    if (
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      throw new Error("Invalid user ID.");
    }

    if (
      !Array.isArray(medicationIds) ||
      medicationIds.length === 0
    ) {
      return {
        interactions: [],
      };
    }


    // Validate medication IDs
    const validMedicationIds =
      medicationIds.filter((id) =>
        mongoose.Types.ObjectId.isValid(id)
      );

    if (
      validMedicationIds.length !== medicationIds.length
    ) {
      throw new Error(
        "One or more medication IDs are invalid."
      );
    }


    // ── Get Patient's Active Medications ─────────────────────────────────────

    const medications = await Medication.find({
      _id: {
        $in: validMedicationIds,
      },
      userId,
      isActive: true,
    });


    if (medications.length < 2) {
      logger.info(
        "[InteractionAgent] Fewer than 2 medications — no interactions to check."
      );

      return {
        interactions: [],
      };
    }


    // ── Fetch FDA Data ──────────────────────────────────────────────────────

    const rxcuis = medications
      .map((medication) => medication.rxcui)
      .filter(Boolean);

    const fdaData =
      await fetchFdaInteractions(rxcuis);


    // ── Build Claude Prompt ─────────────────────────────────────────────────

    const prompt = `
Patient is taking these medications:

${medications
  .map(
    (m) =>
      `- ${m.name} ${m.dosage} (${m.genericName || ""})`
  )
  .join("\n")}

FDA interaction data found:

${
  fdaData.slice(0, 3).join("\n") ||
  "None available"
}

Analyze for potential interactions and provide recommendations.
`;


    // ── Call Claude ─────────────────────────────────────────────────────────

   const raw = await callAI(SYSTEM_PROMPT, prompt);
    logger.info(`[InteractionAgent] Raw Gemini response: ${raw}`);
    let result;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      result = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      logger.error(`[InteractionAgent] JSON parse failed: ${parseErr.message}`);
      logger.error(`[InteractionAgent] Raw response was: ${raw}`);
      throw new Error("Invalid JSON response from AI");
    }


    // ── Persist Interaction Alerts ──────────────────────────────────────────

  for (const interaction of result.interactions || []) {
  try {
    const alert = await InteractionAlert.create({
      userId,
      medicationIds,
      severity: interaction.severity,
      description: interaction.description,
      source: "agent",
    });

    if (["major", "contraindicated"].includes(interaction.severity)) {
      await sendPushNotification(userId, {
        title: "⚠️ Drug Interaction Alert",
        body: `${interaction.severity.toUpperCase()}: ${interaction.description?.slice(0, 100)}`,
        data: { type: "interaction", alertId: alert._id.toString() },
      });
    }
  } catch (createErr) {
    logger.error(`[InteractionAgent] Failed to create alert: ${createErr.message}`);
  }
}

    logger.info(
      `[InteractionAgent] Found ${
        result.interactions?.length || 0
      } interactions.`
    );

    return result;

  } catch (err) {
  logger.error(`[InteractionAgent] Full error: ${err.message}`);
  logger.error(`[InteractionAgent] Stack: ${err.stack}`);
  throw err;
}
};
