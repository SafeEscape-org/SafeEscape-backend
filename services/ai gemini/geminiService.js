const { GoogleGenerativeAI } = require("@google/generative-ai");

// Store chat sessions (in production, use a database)
const chatSessions = new Map();

// System prompt for emergency and first aid context
const SYSTEM_PROMPT = `You are the SafeEscape Emergency Assistant, an AI trained to provide 
helpful guidance during emergencies and first aid situations. Always prioritize user safety.
For medical emergencies, always remind users to call emergency services (911 in US) first.
Provide clear, concise instructions for first aid based on established medical guidelines.
For natural disasters, provide safety protocols and evacuation guidance.
Don't speculate beyond your knowledge or provide potentially harmful advice.
If you're uncertain, clearly state that professional medical/emergency help should be sought.`;

class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('Warning: GEMINI_API_KEY is not set in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY");
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async startChat(emergencyType = "general", location = "unknown") {
    const sessionId = Date.now().toString();
    
    // Create a chat with history capability
    const chat = this.model.startChat({
      history: [],
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_ONLY_HIGH",
        },
      ],
    });

    // Initialize context with system prompt and emergency info
    const initialPrompt = `${SYSTEM_PROMPT}\n\nCurrent emergency type: ${emergencyType}. Location: ${location}. Please provide appropriate guidance.`;
    
    const result = await chat.sendMessage(initialPrompt);
    const response = result.response.text();
    
    // Store session
    chatSessions.set(sessionId, {
      chat,
      emergencyType,
      location,
      history: [
        { role: "system", content: initialPrompt },
        { role: "model", content: response }
      ],
      createdAt: new Date(),
      lastActivity: new Date()
    });

    return { sessionId, message: response };
  }

  async sendMessage(sessionId, message) {
    const session = chatSessions.get(sessionId);
    if (!session) {
      throw new Error("Chat session not found or expired");
    }

    // Update last activity
    session.lastActivity = new Date();
    
    // Enhance message with emergency context if keywords detected
    let enhancedMessage = message;
    if (this.containsEmergencyKeywords(message)) {
      enhancedMessage = `URGENT QUERY about ${this.detectEmergencyType(message)}: ${message}`;
    }

    // Send message to Gemini
    const result = await session.chat.sendMessage(enhancedMessage);
    const response = result.response.text();
    
    // Update session history
    session.history.push(
      { role: "user", content: message },
      { role: "model", content: response }
    );
    
    return { response };
  }

  getSessionHistory(sessionId) {
    const session = chatSessions.get(sessionId);
    if (!session) {
      throw new Error("Chat session not found");
    }
    return session.history;
  }

  endSession(sessionId) {
    if (!chatSessions.has(sessionId)) {
      throw new Error("Chat session not found");
    }
    chatSessions.delete(sessionId);
    return true;
  }

  containsEmergencyKeywords(message) {
    const emergencyKeywords = [
      "emergency", "help", "urgent", "hurt", "injured", "bleeding", 
      "pain", "accident", "disaster", "flood", "fire", "earthquake", 
      "hurricane", "tornado", "trapped", "dying", "ambulance", "rescue"
    ];
    
    return emergencyKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }

  detectEmergencyType(message) {
    const messageLC = message.toLowerCase();
    
    // First aid and medical emergencies
    if (/bleeding|cut|wound|fracture|broken|unconscious|heart attack|stroke|choking|burn/i.test(messageLC)) {
      return "medical emergency";
    }
    
    // Natural disasters
    if (/flood|fire|earthquake|hurricane|tornado|tsunami|storm/i.test(messageLC)) {
      return "natural disaster";
    }
    
    // Other emergency types
    if (/trapped|stuck|stranded/i.test(messageLC)) {
      return "rescue situation";
    }
    
    return "emergency situation";
  }

  // Call this method to initialize the cleanup timer
  initSessionCleanup() {
    setInterval(() => {
      const now = new Date();
      for (const [sessionId, session] of chatSessions.entries()) {
        // Remove sessions older than 2 hours
        if (now - session.lastActivity > 2 * 60 * 60 * 1000) {
          chatSessions.delete(sessionId);
        }
      }
    }, 15 * 60 * 1000); // Run every 15 minutes
  }
}

// Create and export a singleton instance
const geminiService = new GeminiService();
geminiService.initSessionCleanup();
module.exports = geminiService;