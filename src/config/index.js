// Load dotenv only if .env file exists (local development)
try {
  require('dotenv').config();
} catch (e) {
  // In Vercel, env vars are set directly
}

module.exports = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Facebook/Meta Configuration
  facebook: {
    // We check both common names for these variables to be safe
    pageAccessToken: process.env.PAGE_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
    verifyToken: process.env.VERIFY_TOKEN || process.env.FACEBOOK_VERIFY_TOKEN || 'my_verify_token',
    appSecret: process.env.APP_SECRET || process.env.FACEBOOK_APP_SECRET,
    // Update to latest API version
    apiVersion: 'v21.0',
    graphApiUrl: 'https://graph.facebook.com'
  },

  // Google AI (Gemini) Configuration
  googleAI: {
    apiKey: process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY,
    // ⚠️ FIXED: 'gemini-pro' causes 404 errors now. 
    // We use 'gemini-1.5-flash' which is faster, cheaper, and currently active.
    model: 'gemini-1.5-flash',
    maxTokens: 1024,
    temperature: 0.7
  },

  // Bot Configuration
  bot: {
    name: process.env.BOT_NAME || 'AI Assistant',
    welcomeMessage: process.env.WELCOME_MESSAGE || 'Hello! How can I help you today?',
    defaultResponse: process.env.DEFAULT_RESPONSE || 'I\'m processing your request.',
    typingDelay: 1000 // milliseconds to show typing indicator
  },

  // Conversation Settings
  conversation: {
    timeoutMinutes: parseInt(process.env.CONVERSATION_TIMEOUT_MINUTES) || 30,
    maxContextMessages: parseInt(process.env.MAX_CONTEXT_MESSAGES) || 10
  }
};
