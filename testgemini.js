// Load environment variables
require('dotenv').config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Get API key from environment variables
const apiKey = process.env.GEMINI_API_KEY;

// Check if API key is available
if (!apiKey) {
  console.error("Error: GEMINI_API_KEY environment variable is not set");
  console.error("Please add GEMINI_API_KEY to your .env file");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const prompt = "Explain how AI works";

async function runAI() {
  try {
    const result = await model.generateContent(prompt);
    console.log(result.response.text());
  } catch (error) {
    console.error("Error:", error.message);
  }
}

runAI();