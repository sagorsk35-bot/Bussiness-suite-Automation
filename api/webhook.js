const config = require('../src/config');
const facebookService = require('../src/services/facebookService');
const aiService = require('../src/services/aiService');
const conversationService = require('../src/services/conversationService');
const flowEngine = require('../src/flows/flowEngine');
const defaultFlows = require('../src/flows/defaultFlows');
// 1. Import the Knowledge Service (Supabase connection)
const knowledgeService = require('../src/services/knowledgeService');

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

  // --- 2. NEW TRAINING LOGIC START ---
  if (text.startsWith('!learn ')) {
    console.log(`Training command received from ${senderId}`);
    
    // Extract the fact (remove "!learn " from the start)
    const newFact = text.replace('!learn ', '').trim();

    if (newFact.length < 3) {
      await facebookService.sendTextMessage(senderId, "❌ That fact is too short to learn.");
      return;
    }

    // Save to Supabase
    const saved = await knowledgeService.addFact(newFact);

    // Reply to Admin
    if (saved) {
      await facebookService.sendTextMessage(senderId, `✅ I have learned this new fact:\n"${newFact}"`);
    } else {
      await facebookService.sendTextMessage(senderId, `❌ Failed to save to database. Please check Supabase connection.`);
    }
    
    // STOP HERE: Do not send this to the AI or save to conversation history
    return; 
  }
  // --- NEW TRAINING LOGIC END ---

  console.log(`Processing Message from ${senderId}: ${text}`);

  // Run these in parallel to be faster
  await Promise.all([
    facebookService.markSeen(senderId),
    facebookService.sendTypingIndicator(senderId)
  ]);

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

// --- MAIN VERCEL HANDLER ---
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

    // Log the incoming data so we can see it in Vercel logs
    console.log("--- INCOMING WEBHOOK ---");
    console.log(JSON.stringify(body, null, 2));

    if (body.object !== 'page') {
      return res.status(404).send('Not Found');
    }

    // --- CRITICAL: DO NOT SEND 200 HERE ---
    // We wait until the loop is finished
    
    try {
      // Process events
      for (const entry of body.entry || []) {
        const webhookEvent = entry.messaging?.[0];
        if (webhookEvent) {
          // await ensures the bot finishes talking before Vercel shuts down
          await handleMessage(webhookEvent);
        }
      }
    } catch (error) {
      console.error('Error processing event:', error);
    }

    // --- SEND 200 NOW ---
    console.log("--- FINISHED PROCESSING, SENDING 200 ---");
    return res.status(200).send('EVENT_RECEIVED');
  }

  return res.status(405).send('Method Not Allowed');
};
