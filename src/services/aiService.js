const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');
const logger = require('../utils/logger');
// 1. Import the Knowledge Service to read facts from Supabase
const knowledgeService = require('./knowledgeService');

class AIService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.googleAI.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: config.googleAI.model });
  }

  /**
   * Generate a response using Google AI
   * @param {string} userMessage - The user's message
   * @param {Array} conversationHistory - Previous messages for context
   * @param {object} userProfile - User profile information
   */
  async generateResponse(userMessage, conversationHistory = [], userProfile = null) {
    try {
      // 2. FETCH DYNAMIC KNOWLEDGE FROM SUPABASE
      // This gets the latest facts you taught the bot via "!learn"
      const learnedFacts = await knowledgeService.getKnowledgeBase();

      // 3. BUILD THE DYNAMIC SYSTEM PROMPT
      // We reconstruct this every time so it includes the newest facts
      const systemPrompt = `You are ${config.bot.name}, a helpful and friendly AI assistant for a business.

HERE IS YOUR KNOWLEDGE BASE (Facts explicitly taught to you):
${learnedFacts ? learnedFacts : "No specific business facts learned yet."}

YOUR ROLE:
- Answer customer questions using the KNOWLEDGE BASE above.
- If the answer is found in the Knowledge Base, use it.
- If the answer is NOT in the Knowledge Base, politely say you don't know or ask them to contact support. Do not make up prices or hours.
- Be conversational but concise (under 500 characters).
- Use emojis sparingly.
- If a customer seems upset, acknowledge their feelings.`;

      // Build context from conversation history
      let contextPrompt = systemPrompt + '\n\n';

      if (userProfile?.first_name) {
        contextPrompt += `The customer's name is ${userProfile.first_name}. `;
      }

      if (conversationHistory.length > 0) {
        contextPrompt += '\nRecent conversation:\n';
        conversationHistory.slice(-config.conversation.maxContextMessages).forEach(msg => {
          const role = msg.isBot ? 'Assistant' : 'Customer';
          contextPrompt += `${role}: ${msg.text}\n`;
        });
      }

      contextPrompt += `\nCustomer: ${userMessage}\nAssistant:`;

      // Generate response
      const result = await this.model.generateContent(contextPrompt);
      const response = result.response;
      const text = response.text();

      logger.debug('AI response generated', {
        inputLength: userMessage.length,
        outputLength: text.length
      });

      return text.trim();
    } catch (error) {
      logger.error('Error generating AI response:', error);

      // Return a fallback response
      return config.bot.defaultResponse + " I apologize, but I'm having trouble processing your request right now. Please try again in a moment.";
    }
  }

  /**
   * Analyze message intent for routing
   * @param {string} message - The message to analyze
   */
  async analyzeIntent(message) {
    try {
      const prompt = `Analyze the following customer message and return ONLY a JSON object with these fields:
- intent: one of [greeting, question, complaint, support, purchase, feedback, goodbye, other]
- sentiment: one of [positive, neutral, negative]
- urgency: one of [low, medium, high]
- keywords: array of key topics mentioned

Message: "${message}"

Return ONLY valid JSON, no other text:`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();

      // Try to parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Default fallback
      return {
        intent: 'other',
        sentiment: 'neutral',
        urgency: 'low',
        keywords: []
      };
    } catch (error) {
      logger.error('Error analyzing intent:', error);
      return {
        intent: 'other',
        sentiment: 'neutral',
        urgency: 'low',
        keywords: []
      };
    }
  }

  /**
   * Generate quick reply suggestions based on context
   * @param {string} botResponse - The bot's response
   * @param {string} userMessage - The user's original message
   */
  async generateQuickReplies(botResponse, userMessage) {
    try {
      const prompt = `Based on this conversation, suggest 3 short quick reply options the customer might want to say next.

Bot said: "${botResponse}"
In response to customer saying: "${userMessage}"

Return ONLY a JSON array of 3 short strings (max 20 chars each), no other text:`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();

      // Try to parse JSON array from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const replies = JSON.parse(jsonMatch[0]);
        return replies.slice(0, 3).map(r => r.substring(0, 20));
      }

      return ['Tell me more', 'Thanks!', 'I need help'];
    } catch (error) {
      logger.error('Error generating quick replies:', error);
      return ['Tell me more', 'Thanks!', 'I need help'];
    }
  }

  /**
   * Generate a personalized welcome message
   * @param {object} userProfile - User profile with first_name, etc.
   */
  async generateWelcomeMessage(userProfile) {
    if (!userProfile?.first_name) {
      return config.bot.welcomeMessage;
    }

    try {
      const prompt = `Generate a short, friendly welcome message (under 200 characters) for a customer named ${userProfile.first_name} who just started chatting with a business assistant. Be warm but professional.`;

      const result = await this.model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      return `Hi ${userProfile.first_name}! ${config.bot.welcomeMessage}`;
    }
  }
}

module.exports = new AIService();
