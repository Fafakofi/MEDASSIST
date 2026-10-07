const logger = require("../utils/logger");

// ── Dispatch Helpers ─────────────────────────────────────────────────────────
// Agents are lazy-loaded inside each function to avoid circular dependencies.
// (queueManager → agent → queueManager would cause a circular require warning)

const dispatch = {
  scheduling: (data) => {
    const agent = require("../agents/schedulingAgent");
    return agent({ data }).catch((err) =>
      logger.error(`[Dispatch] scheduling: ${err.message}`)
    );
  },
  interaction: (data) => {
    const agent = require("../agents/interactionAgent");
    return agent({ data }).catch((err) =>
      logger.error(`[Dispatch] interaction: ${err.message}`)
    );
  },
  sideEffect: (data) => {
    const agent = require("../agents/sideEffectAgent");
    return agent({ data }).catch((err) =>
      logger.error(`[Dispatch] sideEffect: ${err.message}`)
    );
  },
  refill: (data) => {
    const agent = require("../agents/refillAgent");
    return agent({ data }).catch((err) =>
      logger.error(`[Dispatch] refill: ${err.message}`)
    );
  },
  escalation: (data) => {
    const agent = require("../agents/escalationAgent");
    return agent({ data }).catch((err) =>
      logger.error(`[Dispatch] escalation: ${err.message}`)
    );
  },
};

function initQueues() {
  logger.info("Agent dispatcher ready (direct mode — no Redis required).");
}

module.exports = { initQueues, dispatch };