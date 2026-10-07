require("dotenv").config();
const { callAI } = require("./config/ai");

async function test() {
  const response = await callAI(
    "You are a helpful medical assistant.",
    "What is Paracetamol used for? Reply in one sentence."
  );
  console.log("Gemini response:", response);
}

test();