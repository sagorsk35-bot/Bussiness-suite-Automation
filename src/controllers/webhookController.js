const config = require('../config');
const logger = require('../utils/logger');
const messageController = require('./messageController');

class WebhookController {
  /**
   * Verify webhook for Facebook
   * GET /webhook
   */
  verify(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    logger.info('Webhook verification request received', { mode, token: token ? 'present' : 'missing' });

    if (mode && token) {
      if (mode === 'subscribe' && token === config.facebook.verifyToken) {
        logger.info('Webhook verified successfully!');
        res.status(200).send(challenge);
      } else {
        logger.warn('Webhook verification failed - token mismatch');
        res.sendStatus(403);
      }
    } else {
      logger.warn('Webhook verification failed - missing parameters');
      res.sendStatus(400);
    }
  }

  /**
   * Handle incoming webhook events
   * POST /webhook
   */
  async handle(req, res) {
    const body = req.body;

    // Check if this is a page event
    if (body.object !== 'page') {
      logger.warn('Received non-page event:', body.object);
      res.sendStatus(404);
      return;
    }

    try {
      // Process each entry
      for (const entry of body.entry) {
        // Get the messaging events
        const webhookEvent = entry.messaging?.[0];

        if (!webhookEvent) {
          logger.debug('No messaging event in entry');
          continue;
        }

        logger.debug('Webhook event received:', {
          sender: webhookEvent.sender?.id,
          type: this.getEventType(webhookEvent)
        });

        // Handle the event asynchronously and wait for it to finish
        await messageController.handleMessage(webhookEvent);
      }
    } catch (error) {
      logger.error('Error processing webhook event:', error);
    }

    // Send 200 OK only after the work is done
    res.status(200).send('EVENT_RECEIVED');
  }

  /**
   * Get the type of webhook event
   */
  getEventType(event) {
    if (event.message?.text) return 'text_message';
    if (event.message?.attachments) return 'attachment';
    if (event.message?.quick_reply) return 'quick_reply';
    if (event.postback) return 'postback';
    if (event.referral) return 'referral';
    if (event.read) return 'message_read';
    if (event.delivery) return 'message_delivered';
    return 'unknown';
  }
}

module.exports = new WebhookController();
