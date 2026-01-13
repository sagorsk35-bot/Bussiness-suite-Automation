const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const config = require('../config');
const logger = require('../utils/logger');
// 1. Import the Knowledge Service to read facts from Supabase
const knowledgeService = require('./knowledgeService');

class AIService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.googleAI.apiKey);
    
    // 2. CONFIGURE MODEL WITH SAFETY SETTINGS (CRITICAL FIX)
    // This stops the "FetchError" by allowing the bot to speak freely without strict filters.
    // Without this, Gemini often blocks business responses thinking they are "unsafe".
    this.model = this.genAI.getGenerativeModel({ 
      model: config.googleAI.model,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    });
  }

  /**
   * Generate a response using Google AI
   */
  async generateResponse(userMessage, conversationHistory = [], userProfile = null) {
    try {
      // 3. FETCH DYNAMIC KNOWLEDGE FROM SUPABASE
      const learnedFacts = await knowledgeService.getKnowledgeBase();

      // 4. BUILD THE DYNAMIC SYSTEM PROMPT
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
      const response = await result.response;
      const text = response.text();

      logger.debug('AI response generated', {
        inputLength: userMessage.length,
        outputLength: text.length
      });

      return text.trim();
    } catch (error) {
      // LOG THE EXACT ERROR FOR DEBUGGING
      console.error('❌ Error generating AI response:', JSON.stringify(error, null, 2));

      // Return a fallback response
      return config.bot.defaultResponse + " (System Error: Please check logs)";
    }
  }

  /**
   * Analyze message intent for routing
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
      const response = await result.response;
      const text = response.text();

      // Try to parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return { intent: 'other', sentiment: 'neutral', urgency: 'low', keywords: [] };
    } catch (error) {
      console.error('Error analyzing intent:', error.message);
      return { intent: 'other', sentiment: 'neutral', urgency: 'low', keywords: [] };
    }
  }

  /**
   * Generate quick reply suggestions
   */
  async generateQuickReplies(botResponse, userMessage) {
    try {
      const prompt = `Based on this conversation, suggest 3 short quick reply options the customer might want to say next.

Bot said: "${botResponse}"
In response to customer saying: "${userMessage}"

Return ONLY a JSON array of 3 short strings (max 20 chars each), no other text:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Try to parse JSON array from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const replies = JSON.parse(jsonMatch[0]);
        return replies.slice(0, 3).map(r => r.substring(0, 20));
      }

      return ['Tell me more', 'Thanks!', 'I need help'];
    } catch (error) {
      console.error('Error generating quick replies:', error.message);
      return ['Tell me more', 'Thanks!', 'I need help'];
    }
  }

  /**
   * Generate a personalized welcome message
   */
  async generateWelcomeMessage(userProfile) {
    if (!userProfile?.first_name) {
      return config.bot.welcomeMessage;
    }

    try {
      const prompt = `Generate a short, friendly welcome message (under 200 characters) for a customer named ${userProfile.first_name} who just started chatting with a business assistant. Be warm but professional.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      return `Hi ${userProfile.first_name}! ${config.bot.welcomeMessage}`;
    }
  }
}

module.exports = new AIService();
