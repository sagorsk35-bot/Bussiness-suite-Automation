const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

class FacebookService {
  constructor() {
    this.apiUrl = `${config.facebook.graphApiUrl}/${config.facebook.apiVersion}`;
    this.pageAccessToken = config.facebook.pageAccessToken;
  }

  /**
   * Send a text message to a user
   * @param {string} recipientId - The PSID of the recipient
   * @param {string} text - The message text
   */
  async sendTextMessage(recipientId, text) {
    return this.sendMessage(recipientId, { text });
  }

  /**
   * Send a message with quick replies
   * @param {string} recipientId - The PSID of the recipient
   * @param {string} text - The message text
   * @param {Array} quickReplies - Array of quick reply options
   */
  async sendQuickReplies(recipientId, text, quickReplies) {
    const formattedReplies = quickReplies.map(reply => ({
      content_type: 'text',
      title: reply.title || reply,
      payload: reply.payload || reply.title || reply
    }));

    return this.sendMessage(recipientId, {
      text,
      quick_replies: formattedReplies
    });
  }

  /**
   * Send a message with buttons
   * @param {string} recipientId - The PSID of the recipient
   * @param {string} text - The message text
   * @param {Array} buttons - Array of button objects
   */
  async sendButtonTemplate(recipientId, text, buttons) {
    const formattedButtons = buttons.map(button => {
      if (button.url) {
        return {
          type: 'web_url',
          url: button.url,
          title: button.title
        };
      }
      return {
        type: 'postback',
        title: button.title,
        payload: button.payload || button.title
      };
    });

    return this.sendMessage(recipientId, {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text,
          buttons: formattedButtons
        }
      }
    });
  }

  /**
   * Send a generic template (carousel)
   * @param {string} recipientId - The PSID of the recipient
   * @param {Array} elements - Array of card elements
   */
  async sendGenericTemplate(recipientId, elements) {
    const formattedElements = elements.map(element => ({
      title: element.title,
      subtitle: element.subtitle,
      image_url: element.imageUrl,
      buttons: element.buttons?.map(btn => ({
        type: btn.url ? 'web_url' : 'postback',
        title: btn.title,
        url: btn.url,
        payload: btn.payload
      }))
    }));

    return this.sendMessage(recipientId, {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: formattedElements
        }
      }
    });
  }

  /**
   * Send typing indicator
   * @param {string} recipientId - The PSID of the recipient
   * @param {boolean} isTyping - Whether to show or hide typing indicator
   */
  async sendTypingIndicator(recipientId, isTyping = true) {
    try {
      await axios.post(
        `${this.apiUrl}/me/messages`,
        {
          recipient: { id: recipientId },
          sender_action: isTyping ? 'typing_on' : 'typing_off'
        },
        {
          params: { access_token: this.pageAccessToken }
        }
      );
    } catch (error) {
      logger.error('Error sending typing indicator:', error.response?.data || error.message);
    }
  }

  /**
   * Mark message as seen
   * @param {string} recipientId - The PSID of the recipient
   */
  async markSeen(recipientId) {
    try {
      await axios.post(
        `${this.apiUrl}/me/messages`,
        {
          recipient: { id: recipientId },
          sender_action: 'mark_seen'
        },
        {
          params: { access_token: this.pageAccessToken }
        }
      );
    } catch (error) {
      logger.error('Error marking message as seen:', error.response?.data || error.message);
    }
  }

  /**
   * Send a message to Facebook Messenger
   * @param {string} recipientId - The PSID of the recipient
   * @param {object} message - The message object
   */
  async sendMessage(recipientId, message) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/me/messages`,
        {
          recipient: { id: recipientId },
          message,
          messaging_type: 'RESPONSE'
        },
        {
          params: { access_token: this.pageAccessToken }
        }
      );

      logger.info(`Message sent to ${recipientId}`, { messageId: response.data.message_id });
      return response.data;
    } catch (error) {
      logger.error('Error sending message:', {
        recipientId,
        error: error.response?.data || error.message
      });
      throw error;
    }
  }

  /**
   * Get user profile information
   * @param {string} psid - The PSID of the user
   */
  async getUserProfile(psid) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/${psid}`,
        {
          params: {
            fields: 'first_name,last_name,profile_pic',
            access_token: this.pageAccessToken
          }
        }
      );
      return response.data;
    } catch (error) {
      logger.error('Error getting user profile:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Set up messenger profile (persistent menu, get started button, etc.)
   */
  async setupMessengerProfile() {
    try {
      // Set Get Started button
      await axios.post(
        `${this.apiUrl}/me/messenger_profile`,
        {
          get_started: {
            payload: 'GET_STARTED'
          }
        },
        {
          params: { access_token: this.pageAccessToken }
        }
      );

      // Set persistent menu
      await axios.post(
        `${this.apiUrl}/me/messenger_profile`,
        {
          persistent_menu: [
            {
              locale: 'default',
              composer_input_disabled: false,
              call_to_actions: [
                {
                  type: 'postback',
                  title: '🏠 Main Menu',
                  payload: 'MAIN_MENU'
                },
                {
                  type: 'postback',
                  title: '❓ Help',
                  payload: 'HELP'
                },
                {
                  type: 'postback',
                  title: '🔄 Restart',
                  payload: 'RESTART'
                }
              ]
            }
          ]
        },
        {
          params: { access_token: this.pageAccessToken }
        }
      );

      // Set greeting text
      await axios.post(
        `${this.apiUrl}/me/messenger_profile`,
        {
          greeting: [
            {
              locale: 'default',
              text: `Hi {{user_first_name}}! ${config.bot.welcomeMessage}`
            }
          ]
        },
        {
          params: { access_token: this.pageAccessToken }
        }
      );

      logger.info('Messenger profile setup complete');
      return true;
    } catch (error) {
      logger.error('Error setting up messenger profile:', error.response?.data || error.message);
      return false;
    }
  }
}

module.exports = new FacebookService();
