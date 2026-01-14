const config = require('../src/config');
const facebookService = require('../src/services/facebookService');
const conversationService = require('../src/services/conversationService');

// Simple keyword-based responses (No AI needed)
const keywordResponses = {
  // Greetings
  'hi': 'Hello! 👋 Welcome to our business. How can I help you today?',
  'hello': 'Hi there! 👋 Thanks for reaching out. What can I do for you?',
  'hey': 'Hey! 👋 Good to hear from you. How can I assist?',
  'good morning': 'Good morning! ☀️ How can I help you today?',
  'good afternoon': 'Good afternoon! How can I assist you?',
  'good evening': 'Good evening! What can I do for you?',

  // Common questions
  'price': 'For pricing information, please let us know which product you\'re interested in, or type "products" to see our catalog.',
  'cost': 'For pricing details, please specify which item you\'re asking about, or type "products" to browse.',
  'how much': 'Please let me know which product you\'d like pricing for. Type "products" to see our options.',

  // Products
  'product': 'We have a variety of products! Please specify what you\'re looking for or type "menu" to see options.',
  'catalog': 'Check out our products! What category interests you? Type "menu" for options.',
  'order': 'To place an order, please tell us what you\'d like. We\'ll help you through the process!',
  'buy': 'Great! What would you like to purchase? Let us know and we\'ll assist you.',

  // Support
  'help': 'I\'m here to help! 🙌 What do you need assistance with?',
  'support': 'Our support team is ready to help! Please describe your issue.',
  'problem': 'Sorry to hear you\'re having issues. Please tell me more so I can help.',
  'issue': 'I\'d like to help resolve your issue. Can you provide more details?',

  // Contact
  'contact': '📞 You can reach us at:\n📧 Email: support@example.com\n📱 Phone: +1 (555) 123-4567',
  'phone': '📱 Our phone number is: +1 (555) 123-4567',
  'email': '📧 Our email is: support@example.com',
  'location': '📍 We\'re located at: 123 Business Street, City',
  'address': '📍 Our address is: 123 Business Street, City',
  'hours': '⏰ Our business hours are: Mon-Fri 9AM-6PM',

  // Thanks & Bye
  'thank': 'You\'re welcome! 😊 Is there anything else I can help with?',
  'thanks': 'You\'re welcome! 😊 Let me know if you need anything else.',
  'bye': 'Goodbye! 👋 Thanks for chatting. Feel free to message us anytime!',
  'goodbye': 'Take care! 👋 We\'re here whenever you need us.',

  // Menu
  'menu': 'Here\'s what I can help with:\n📦 Products\n💬 Support\n📍 Contact\n❓ Help\n\nJust type what you need!',
  'start': 'Welcome! 👋 I can help you with:\n📦 Products\n💬 Support\n📍 Contact\n\nWhat would you like to know?'
};

// Default quick replies
const defaultQuickReplies = [
  { title: '📦 Products', payload: 'PRODUCTS' },
  { title: '💬 Support', payload: 'SUPPORT' },
  { title: '📍 Contact', payload: 'CONTACT' },
  { title: '📋 Menu', payload: 'MENU' }
];

// Find matching response based on keywords
function findResponse(text) {
  const lowerText = text.toLowerCase();

  for (const [keyword, response] of Object.entries(keywordResponses)) {
    if (lowerText.includes(keyword)) {
      return response;
    }
  }

  return null;
}

// Message handler
async function handleMessage(event) {
  const senderId = event.sender.id;

  try {
    if (event.message) {
      await handleTextMessage(senderId, event.message);
    } else if (event.postback) {
      await handlePostback(senderId, event.postback);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    await sendErrorMessage(senderId);
  }
}

async function handleTextMessage(senderId, message) {
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

  // Store message
  conversationService.addMessage(senderId, text, false);

  // Handle quick reply payload
  if (message.quick_reply?.payload) {
    await handlePayload(senderId, message.quick_reply.payload);
    return;
  }

  // Find keyword-based response
  const response = findResponse(text);

  if (response) {
    await facebookService.sendTextMessage(senderId, response);
    conversationService.addMessage(senderId, response, true);
  } else {
    // Default response for unknown messages
    await facebookService.sendTextMessage(
      senderId,
      `Thanks for your message! 📩\n\nI received: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"\n\nHow can I help you with this?`
    );
  }

  // Always send quick replies for easy navigation
  await facebookService.sendQuickReplies(
    senderId,
    'What would you like to do next?',
    defaultQuickReplies
  );
}

async function handlePostback(senderId, postback) {
  const payload = postback.payload;
  console.log(`Postback from ${senderId}: ${payload}`);

  await facebookService.markSeen(senderId);
  await facebookService.sendTypingIndicator(senderId);

  await handlePayload(senderId, payload);
}

async function handlePayload(senderId, payload) {
  let response = '';

  switch (payload) {
    case 'GET_STARTED':
      response = 'Welcome! 👋 I\'m your business assistant. How can I help you today?';
      break;
    case 'MENU':
    case 'MAIN_MENU':
      response = '📋 Main Menu:\n\n📦 Products - Browse our catalog\n💬 Support - Get help\n📍 Contact - Reach us\n❓ Help - More options';
      break;
    case 'PRODUCTS':
      response = '📦 Products:\n\nWe offer various products and services. Please tell us what you\'re looking for, and we\'ll provide details and pricing!';
      break;
    case 'SUPPORT':
      response = '💬 Support:\n\nHow can we help you? Please describe your issue or question, and our team will assist you.';
      break;
    case 'CONTACT':
      response = '📍 Contact Us:\n\n📧 Email: support@example.com\n📱 Phone: +1 (555) 123-4567\n⏰ Hours: Mon-Fri 9AM-6PM';
      break;
    case 'HELP':
      response = '❓ Help:\n\nI can assist you with:\n• Product information\n• Pricing & orders\n• Support requests\n• Contact details\n\nJust type what you need!';
      break;
    case 'RESTART':
      conversationService.resetConversation(senderId);
      response = 'Conversation restarted! 🔄 How can I help you?';
      break;
    default:
      response = `You selected: ${payload}. How can I help you with this?`;
  }

  await facebookService.sendTextMessage(senderId, response);

  // Send quick replies
  await facebookService.sendQuickReplies(
    senderId,
    'What else can I help with?',
    defaultQuickReplies
  );
}

async function sendErrorMessage(senderId) {
  try {
    await facebookService.sendTextMessage(
      senderId,
      "I'm sorry, something went wrong. Please try again or type 'menu' for options."
    );
  } catch (error) {
    console.error('Error sending error message:', error);
  }
}

// Vercel serverless handler
module.exports = async (req, res) => {
  console.log('--- INCOMING WEBHOOK ---');
  console.log(JSON.stringify(req.body, null, 2));

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

    console.log('--- FINISHED PROCESSING ---');
    return;
  }

  return res.status(405).send('Method Not Allowed');
};
