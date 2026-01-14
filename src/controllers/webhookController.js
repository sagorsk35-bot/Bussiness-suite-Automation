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

    console.log('Webhook verification request:', { mode, token_present: !!token });

    if (mode && token) {
      if (mode === 'subscribe' && token === config.facebook.verifyToken) {
        console.log('Webhook verified successfully!');
        res.status(200).send(challenge);
      } else {
        console.error('Webhook verification failed - token mismatch');
        res.sendStatus(403);
      }
    } else {
      console.error('Webhook verification failed - missing parameters');
      res.sendStatus(400);
    }
  }

  /**
   * Handle incoming webhook events
   * POST /webhook
   */
  async handle(req, res) {
    const body = req.body;

    // DEBUG: Print the raw incoming data to Vercel logs
    console.log("--- INCOMING WEBHOOK DATA ---");
    console.log(JSON.stringify(body, null, 2));

    // Check if this is a page event
    if (body.object !== 'page') {
      console.log('Received non-page event:', body.object);
      res.sendStatus(404);
      return;
    }

    try {
      // Check if entry exists
      if (!body.entry || body.entry.length === 0) {
        console.log("No 'entry' found in webhook body.");
      }

      // Process each entry
      for (const entry of body.entry) {
        
        // Check if messaging array exists
        if (!entry.messaging) {
          // Sometimes Facebook sends 'standby' or 'changes' events, we skip those for now
          console.log("Skipping entry (no 'messaging' array):", JSON.stringify(entry));
          continue;
        }

        const webhookEvent = entry.messaging[0];

        console.log('Processing Event:', {
          sender: webhookEvent.sender?.id,
          type: this.getEventType(webhookEvent)
        });

        // Handle the event asynchronously and WAIT for it to finish
        await messageController.handleMessage(webhookEvent);
      }
    } catch (error) {
      // Log the full error to Vercel
      console.error('CRITICAL ERROR processing webhook:', error);
    }

    // Send 200 OK only after the work is done
    console.log("--- FINISHED PROCESSING, SENDING 200 OK ---");
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
