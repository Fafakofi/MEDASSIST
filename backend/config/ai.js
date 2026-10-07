const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash" });

async function callAI(systemPrompt, userMessage, retries = 3) {
  try {
    const fullPrompt = `${systemPrompt}\n\n${userMessage}`;

    // Race between Gemini call and a 30 second timeout
    const result = await Promise.race([
      model.generateContent(fullPrompt),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Gemini request timed out after 30s")), 30000)
      ),
    ]);

    return result.response.text();
  } catch (error) {
    const isRetryable =
      error.status === 503 ||
      error.status === 429 ||
      error.message?.includes("timed out");

    if (retries > 0 && isRetryable) {
      const waitTime = error.status === 429 ? 10000 : 8000;
      console.log(`[AI] ${error.message} — retrying in ${waitTime / 1000}s... (${retries} retries left)`);
      await new Promise((res) => setTimeout(res, waitTime));
      return callAI(systemPrompt, userMessage, retries - 1);
    }

    console.error("Error in callAI:", error.message);
    throw error;
  }
}

module.exports = { callAI };