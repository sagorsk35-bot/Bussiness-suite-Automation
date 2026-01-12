const facebookService = require('../services/facebookService');
const aiService = require('../services/aiService');
const conversationService = require('../services/conversationService');
const flowEngine = require('../flows/flowEngine');
const logger = require('../utils/logger');
const config = require('../config');

class MessageController {
  /**
   * Handle incoming messaging events from Facebook
   * @param {object} event - The messaging event
   */
  async handleMessage(event) {
    const senderId = event.sender.id;

    try {
      // Get or fetch user profile
      let userProfile = conversationService.getUserProfile(senderId);
      if (!userProfile) {
        userProfile = await facebookService.getUserProfile(senderId);
        if (userProfile) {
          conversationService.setUserProfile(senderId, userProfile);
        }
      }

      // Handle different message types
      if (event.message) {
        await this.handleTextMessage(senderId, event.message, userProfile);
      } else if (event.postback) {
        await this.handlePostback(senderId, event.postback, userProfile);
      }
    } catch (error) {
      logger.error('Error handling message:', error);
      await this.sendErrorMessage(senderId);
    }
  }

  /**
   * Handle text messages
   */
  async handleTextMessage(senderId, message, userProfile) {
    const text = message.text;

    if (!text) {
      // Handle non-text messages (images, stickers, etc.)
      await facebookService.sendTextMessage(
        senderId,
        "I received your message! Currently, I can only process text messages. How can I help you? 😊"
      );
      return;
    }

    logger.info(`Message from ${senderId}: ${text}`);

    // Mark as seen and show typing
    await facebookService.markSeen(senderId);
    await facebookService.sendTypingIndicator(senderId);

    // Store the user's message
    conversationService.addMessage(senderId, text, false);

    // Check if user is in an active flow
    const { flow, step } = conversationService.getFlowState(senderId);
    if (flow && step) {
      const handled = await flowEngine.handleFlowInput(senderId, text);
      if (handled) {
        return;
      }
    }

    // Check for flow triggers
    const triggeredFlow = flowEngine.checkTriggers(text, senderId);
    if (triggeredFlow) {
      await flowEngine.startFlow(senderId, triggeredFlow);
      return;
    }

    // Check for quick reply payload
    if (message.quick_reply?.payload) {
      await this.handlePayload(senderId, message.quick_reply.payload, userProfile);
      return;
    }

    // Default: Use AI to generate a response
    await this.handleAIResponse(senderId, text, userProfile);
  }

  /**
   * Handle postback events (button clicks, get started, etc.)
   */
  async handlePostback(senderId, postback, userProfile) {
    const payload = postback.payload;
    logger.info(`Postback from ${senderId}: ${payload}`);

    await facebookService.markSeen(senderId);
    await facebookService.sendTypingIndicator(senderId);

    await this.handlePayload(senderId, payload, userProfile);
  }

  /**
   * Handle payloads from buttons and quick replies
   */
  async handlePayload(senderId, payload, userProfile) {
    // Check if payload triggers a flow
    const triggeredFlow = flowEngine.checkTriggers(payload, senderId);
    if (triggeredFlow) {
      await flowEngine.startFlow(senderId, triggeredFlow);
      return;
    }

    // Handle common payloads
    switch (payload) {
      case 'GET_STARTED':
        await flowEngine.startFlow(senderId, 'welcome');
        break;

      case 'MAIN_MENU':
        await flowEngine.startFlow(senderId, 'main_menu');
        break;

      case 'RESTART':
        conversationService.resetConversation(senderId);
        await flowEngine.startFlow(senderId, 'welcome');
        break;

      case 'DONE':
        await facebookService.sendTextMessage(
          senderId,
          "Great! Have a wonderful day! 🌟"
        );
        break;

      default:
        // Unknown payload, use AI to respond
        await this.handleAIResponse(senderId, `User selected: ${payload}`, userProfile);
    }
  }

  /**
   * Generate and send an AI response
   */
  async handleAIResponse(senderId, text, userProfile) {
    try {
      // Get conversation history
      const history = conversationService.getHistory(senderId);

      // Analyze intent for better routing
      const intent = await aiService.analyzeIntent(text);
      logger.debug(`Intent analysis:`, intent);

      // Check if we should route to a specific flow based on intent
      if (intent.intent === 'complaint' && intent.urgency === 'high') {
        await flowEngine.startFlow(senderId, 'human_agent');
        return;
      }

      // Generate AI response
      const response = await aiService.generateResponse(text, history, userProfile);

      // Send the response
      await facebookService.sendTextMessage(senderId, response);
      conversationService.addMessage(senderId, response, true);

      // Generate and send quick replies for better engagement
      if (intent.intent !== 'goodbye') {
        const quickReplies = await aiService.generateQuickReplies(response, text);
        if (quickReplies.length > 0) {
          await this.delay(500);
          await facebookService.sendQuickReplies(
            senderId,
            'Would you like to know more?',
            quickReplies.concat(['🏠 Menu'])
          );
        }
      }
    } catch (error) {
      logger.error('Error generating AI response:', error);
      await this.sendErrorMessage(senderId);
    }
  }

  /**
   * Send an error message
   */
  async sendErrorMessage(senderId) {
    try {
      await facebookService.sendTextMessage(
        senderId,
        "I'm sorry, I encountered an error processing your message. Please try again or type 'menu' for options."
      );
    } catch (error) {
      logger.error('Error sending error message:', error);
    }
  }

  /**
   * Helper delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new MessageController();
