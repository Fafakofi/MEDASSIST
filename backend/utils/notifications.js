const logger = require("./logger");

async function sendPushNotification(userId, { title, body, data = {} }) {
  try {
    // TODO: wire up firebase-admin for real push notifications
    logger.info(`[Notification] → User ${userId}: "${title}" — ${body}`);
  } catch (err) {
    logger.error("[Notification] Failed:", err.message);
  }
}

module.exports = { sendPushNotification };
