const NodeCache = require('node-cache');
const config = require('../config');
const logger = require('../utils/logger');

class ConversationService {
  constructor() {
    // Cache for conversation states with auto-expiry
    this.conversations = new NodeCache({
      stdTTL: config.conversation.timeoutMinutes * 60,
      checkperiod: 60
    });

    // Cache for user profiles
    this.userProfiles = new NodeCache({
      stdTTL: 3600 // 1 hour
    });

    // Cache for user data/variables (like ManyChat custom fields)
    this.userData = new NodeCache({
      stdTTL: 86400 // 24 hours
    });
  }

  /**
   * Get or create a conversation for a user
   * @param {string} userId - The user's PSID
   */
  getConversation(userId) {
    let conversation = this.conversations.get(userId);

    if (!conversation) {
      conversation = {
        userId,
        messages: [],
        currentFlow: null,
        currentStep: null,
        variables: {},
        startedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
      this.conversations.set(userId, conversation);
    }

    return conversation;
  }

  /**
   * Add a message to conversation history
   * @param {string} userId - The user's PSID
   * @param {string} text - The message text
   * @param {boolean} isBot - Whether the message is from the bot
   */
  addMessage(userId, text, isBot = false) {
    const conversation = this.getConversation(userId);

    conversation.messages.push({
      text,
      isBot,
      timestamp: new Date().toISOString()
    });

    // Keep only the last N messages
    if (conversation.messages.length > config.conversation.maxContextMessages * 2) {
      conversation.messages = conversation.messages.slice(-config.conversation.maxContextMessages * 2);
    }

    conversation.lastActivity = new Date().toISOString();
    this.conversations.set(userId, conversation);

    return conversation;
  }

  /**
   * Get conversation history for a user
   * @param {string} userId - The user's PSID
   * @param {number} limit - Maximum number of messages to return
   */
  getHistory(userId, limit = null) {
    const conversation = this.getConversation(userId);
    const messages = conversation.messages;

    if (limit) {
      return messages.slice(-limit);
    }

    return messages;
  }

  /**
   * Set the current flow for a user
   * @param {string} userId - The user's PSID
   * @param {string} flowName - The name of the flow
   * @param {string} stepName - The current step in the flow
   */
  setFlow(userId, flowName, stepName = 'start') {
    const conversation = this.getConversation(userId);
    conversation.currentFlow = flowName;
    conversation.currentStep = stepName;
    this.conversations.set(userId, conversation);
  }

  /**
   * Get the current flow state for a user
   * @param {string} userId - The user's PSID
   */
  getFlowState(userId) {
    const conversation = this.getConversation(userId);
    return {
      flow: conversation.currentFlow,
      step: conversation.currentStep
    };
  }

  /**
   * Clear the current flow for a user
   * @param {string} userId - The user's PSID
   */
  clearFlow(userId) {
    const conversation = this.getConversation(userId);
    conversation.currentFlow = null;
    conversation.currentStep = null;
    this.conversations.set(userId, conversation);
  }

  /**
   * Set a variable for a user (like ManyChat custom fields)
   * @param {string} userId - The user's PSID
   * @param {string} key - Variable name
   * @param {any} value - Variable value
   */
  setVariable(userId, key, value) {
    const conversation = this.getConversation(userId);
    conversation.variables[key] = value;
    this.conversations.set(userId, conversation);

    // Also store in persistent user data
    const userData = this.userData.get(userId) || {};
    userData[key] = value;
    this.userData.set(userId, userData);
  }

  /**
   * Get a variable for a user
   * @param {string} userId - The user's PSID
   * @param {string} key - Variable name
   */
  getVariable(userId, key) {
    const conversation = this.getConversation(userId);
    return conversation.variables[key] || this.userData.get(userId)?.[key];
  }

  /**
   * Get all variables for a user
   * @param {string} userId - The user's PSID
   */
  getAllVariables(userId) {
    const conversation = this.getConversation(userId);
    const persistentData = this.userData.get(userId) || {};
    return { ...persistentData, ...conversation.variables };
  }

  /**
   * Store user profile
   * @param {string} userId - The user's PSID
   * @param {object} profile - Profile data
   */
  setUserProfile(userId, profile) {
    this.userProfiles.set(userId, profile);
  }

  /**
   * Get user profile
   * @param {string} userId - The user's PSID
   */
  getUserProfile(userId) {
    return this.userProfiles.get(userId);
  }

  /**
   * Reset conversation for a user
   * @param {string} userId - The user's PSID
   */
  resetConversation(userId) {
    this.conversations.del(userId);
    logger.info(`Conversation reset for user ${userId}`);
  }

  /**
   * Get conversation statistics
   */
  getStats() {
    return {
      activeConversations: this.conversations.keys().length,
      cachedProfiles: this.userProfiles.keys().length,
      cachedUserData: this.userData.keys().length
    };
  }
}

module.exports = new ConversationService();
