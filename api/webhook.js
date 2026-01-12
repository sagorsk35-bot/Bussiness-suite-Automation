const config = require('../src/config');
const facebookService = require('../src/services/facebookService');
const aiService = require('../src/services/aiService');
const conversationService = require('../src/services/conversationService');
const flowEngine = require('../src/flows/flowEngine');
const defaultFlows = require('../src/flows/defaultFlows');

// Initialize flows
let flowsInitialized = false;
function initializeFlows() {
  if (flowsInitialized) return;
  Object.values(defaultFlows).forEach(flow => {
    flowEngine.registerFlow(flow.name, flow);
  });
  flowsInitialized = true;
}

// Message handler
async function handleMessage(event) {
  const senderId = event.sender.id;

  try {
    let userProfile = conversationService.getUserProfile(senderId);
    if (!userProfile) {
      userProfile = await facebookService.getUserProfile(senderId);
      if (userProfile) {
        conversationService.setUserProfile(senderId, userProfile);
      }
    }

    if (event.message) {
      await handleTextMessage(senderId, event.message, userProfile);
    } else if (event.postback) {
      await handlePostback(senderId, event.postback, userProfile);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    await sendErrorMessage(senderId);
  }
}

async function handleTextMessage(senderId, message, userProfile) {
  const text = message.text;

  if (!text) {
    await facebookService.sendTextMessage(
      senderId,
      "I received your message! Currently, I can only process text. How can I help you?"
    );
    return;
  }

  console.log(`Message from ${senderId}: ${text}`);

  await facebookService.markSeen(senderId);
  await facebookService.sendTypingIndicator(senderId);

  conversationService.addMessage(senderId, text, false);

  // Check active flow
  const { flow, step } = conversationService.getFlowState(senderId);
  if (flow && step) {
    const handled = await flowEngine.handleFlowInput(senderId, text);
    if (handled) return;
  }

  // Check flow triggers
  const triggeredFlow = flowEngine.checkTriggers(text, senderId);
  if (triggeredFlow) {
    await flowEngine.startFlow(senderId, triggeredFlow);
    return;
  }

  // Quick reply payload
  if (message.quick_reply?.payload) {
    await handlePayload(senderId, message.quick_reply.payload, userProfile);
    return;
  }

  // Default: AI response
  await handleAIResponse(senderId, text, userProfile);
}

async function handlePostback(senderId, postback, userProfile) {
  const payload = postback.payload;
  console.log(`Postback from ${senderId}: ${payload}`);

  await facebookService.markSeen(senderId);
  await facebookService.sendTypingIndicator(senderId);

  await handlePayload(senderId, payload, userProfile);
}

async function handlePayload(senderId, payload, userProfile) {
  const triggeredFlow = flowEngine.checkTriggers(payload, senderId);
  if (triggeredFlow) {
    await flowEngine.startFlow(senderId, triggeredFlow);
    return;
  }

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
      await facebookService.sendTextMessage(senderId, "Great! Have a wonderful day!");
      break;
    default:
      await handleAIResponse(senderId, `User selected: ${payload}`, userProfile);
  }
}

async function handleAIResponse(senderId, text, userProfile) {
  try {
    const history = conversationService.getHistory(senderId);
    const response = await aiService.generateResponse(text, history, userProfile);

    await facebookService.sendTextMessage(senderId, response);
    conversationService.addMessage(senderId, response, true);

    // Add quick replies
    const quickReplies = await aiService.generateQuickReplies(response, text);
    if (quickReplies.length > 0) {
      await facebookService.sendQuickReplies(
        senderId,
        'Would you like to know more?',
        quickReplies.concat(['Menu'])
      );
    }
  } catch (error) {
    console.error('Error generating AI response:', error);
    await sendErrorMessage(senderId);
  }
}

async function sendErrorMessage(senderId) {
  try {
    await facebookService.sendTextMessage(
      senderId,
      "I'm sorry, I encountered an error. Please try again or type 'menu' for options."
    );
  } catch (error) {
    console.error('Error sending error message:', error);
  }
}

// Vercel serverless handler
module.exports = async (req, res) => {
  initializeFlows();

  // GET - Webhook verification
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('Webhook verification:', { mode, tokenPresent: !!token });

    if (mode === 'subscribe' && token === config.facebook.verifyToken) {
      console.log('Webhook verified!');
      return res.status(200).send(challenge);
    } else {
      console.log('Webhook verification failed');
      return res.status(403).send('Forbidden');
    }
  }

  // POST - Handle webhook events
  if (req.method === 'POST') {
    const body = req.body;

    if (body.object !== 'page') {
      return res.status(404).send('Not Found');
    }

    // Respond immediately
    res.status(200).send('EVENT_RECEIVED');

    // Process events
    for (const entry of body.entry || []) {
      const webhookEvent = entry.messaging?.[0];
      if (webhookEvent) {
        try {
          await handleMessage(webhookEvent);
        } catch (error) {
          console.error('Error processing event:', error);
        }
      }
    }

    return;
  }

  return res.status(405).send('Method Not Allowed');
};
