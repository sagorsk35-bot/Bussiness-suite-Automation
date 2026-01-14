const config = require('../src/config');
const facebookService = require('../src/services/facebookService');
const conversationService = require('../src/services/conversationService');

// ============================================
// RATROVA BUSINESS INFO
// ============================================
const businessInfo = {
  name: 'Ratrova',
  brand: 'Mother Brand Ratrova',
  hours: 'Saturday to Thursday: 10:00 AM - 7:00 PM',
  closedDays: 'Friday',

  // Locations
  hqAddress: `RATROVA HQ
Al-Modina Tower
2nd Floor, Flat-3E
Sonr Bangla Project, Godabagh
Keranigonj, Dhaka-1310`,

  productionAddress: `Paperbox Production House
House # 7, Zindabahar
Road # 1, Nayabazar
Dhaka-1100`,

  // Products & Pricing
  pizzaBoxPrices: `🍕 PIZZA BOX PRICES:

📦 8 inches:
   • 11 TK/pc (1000 pcs minimum)
   • 14 TK/pc (500 pcs minimum)

📦 10 inches:
   • 14 TK/pc (1000 pcs minimum)
   • 18 TK/pc (500 pcs minimum)

📦 12 inches:
   • 16 TK/pc (1000 pcs minimum)
   • 20 TK/pc (500 pcs minimum)`,

  burgerBoxPrices: `🍔 BURGER BOX PRICES:

📦 Burger Box: 8 TK/pc (1000 pcs minimum)`,

  allPrices: `📋 RATROVA PRICE LIST:

🍕 PIZZA BOXES:
• 8" - 11tk (1000pcs) | 14tk (500pcs)
• 10" - 14tk (1000pcs) | 18tk (500pcs)
• 12" - 16tk (1000pcs) | 20tk (500pcs)

🍔 BURGER BOXES:
• 8tk/pc (1000pcs minimum)

💡 Bulk orders welcome!`
};

// ============================================
// KEYWORD RESPONSES
// ============================================
const keywordResponses = {
  // Greetings
  'hi': `Hello! 👋 Welcome to ${businessInfo.name}!\n\nWe specialize in pizza boxes and burger boxes.\n\nHow can I help you today?`,
  'hello': `Hi there! 👋 Welcome to ${businessInfo.name}!\n\nWhat can I do for you?`,
  'hey': `Hey! 👋 Thanks for contacting ${businessInfo.name}. How can I assist?`,
  'assalamualaikum': `Walaikum Assalam! 🙏 Welcome to ${businessInfo.name}. How can I help you?`,
  'good morning': `Good morning! ☀️ Welcome to ${businessInfo.name}. How can I help you today?`,
  'good afternoon': `Good afternoon! Welcome to ${businessInfo.name}. How can I assist you?`,
  'good evening': `Good evening! Welcome to ${businessInfo.name}. What can I do for you?`,

  // Pizza Box
  'pizza': businessInfo.pizzaBoxPrices,
  'pizza box': businessInfo.pizzaBoxPrices,

  // Burger Box
  'burger': businessInfo.burgerBoxPrices,
  'burger box': businessInfo.burgerBoxPrices,

  // General Prices
  'price': businessInfo.allPrices,
  'cost': businessInfo.allPrices,
  'rate': businessInfo.allPrices,
  'dam': businessInfo.allPrices,  // Bengali for price
  'daam': businessInfo.allPrices,
  'how much': businessInfo.allPrices,
  'koto': businessInfo.allPrices, // Bengali

  // Products
  'product': `📦 ${businessInfo.name} Products:\n\n🍕 Pizza Boxes (8", 10", 12")\n🍔 Burger Boxes\n\nType "pizza" or "burger" for detailed pricing!`,
  'box': `📦 We offer:\n\n🍕 Pizza Boxes - Multiple sizes\n🍔 Burger Boxes\n\nType "price" to see all rates!`,

  // Orders
  'order': `📝 To place an order:\n\n1. Tell us what you need (pizza box size/burger box)\n2. Quantity required\n3. Delivery location\n\nOur team will confirm and process your order!\n\n📞 Or call us for quick orders.`,
  'buy': `Great! 🛒 What would you like to order?\n\n🍕 Pizza Boxes\n🍔 Burger Boxes\n\nJust tell us the size and quantity!`,

  // Location
  'location': `📍 ${businessInfo.name} Locations:\n\n🏢 HEAD OFFICE:\n${businessInfo.hqAddress}\n\n🏭 PRODUCTION:\n${businessInfo.productionAddress}`,
  'address': `📍 ${businessInfo.name} Locations:\n\n🏢 HEAD OFFICE:\n${businessInfo.hqAddress}\n\n🏭 PRODUCTION:\n${businessInfo.productionAddress}`,
  'office': `🏢 RATROVA HQ:\n${businessInfo.hqAddress}`,
  'production': `🏭 Production House:\n${businessInfo.productionAddress}`,
  'factory': `🏭 Production House:\n${businessInfo.productionAddress}`,
  'thikana': `📍 ${businessInfo.name} Locations:\n\n🏢 HEAD OFFICE:\n${businessInfo.hqAddress}\n\n🏭 PRODUCTION:\n${businessInfo.productionAddress}`,

  // Hours
  'hour': `⏰ Business Hours:\n\n${businessInfo.hours}\n\n🚫 Closed: ${businessInfo.closedDays}`,
  'time': `⏰ Business Hours:\n\n${businessInfo.hours}\n\n🚫 Closed: ${businessInfo.closedDays}`,
  'open': `⏰ We're open:\n${businessInfo.hours}\n\n🚫 Closed: ${businessInfo.closedDays}`,
  'close': `⏰ Business Hours:\n${businessInfo.hours}\n\n🚫 Closed: ${businessInfo.closedDays}`,
  'somoy': `⏰ Business Hours:\n${businessInfo.hours}\n\n🚫 বন্ধ: ${businessInfo.closedDays}`,

  // Support
  'help': `I'm here to help! 🙌\n\nI can assist with:\n📦 Product info & pricing\n📍 Locations\n⏰ Business hours\n📝 Orders\n\nWhat do you need?`,
  'support': `💬 How can we help?\n\nFor orders or inquiries, tell us:\n1. Product needed\n2. Quantity\n3. Any questions\n\nWe'll respond quickly!`,

  // Thanks & Bye
  'thank': `You're welcome! 😊\n\nAnything else you need from ${businessInfo.name}?`,
  'thanks': `You're welcome! 😊\n\nFeel free to ask anything else!`,
  'bye': `Goodbye! 👋\n\nThank you for choosing ${businessInfo.name}!\nContact us anytime for your packaging needs.`,
  'goodbye': `Take care! 👋\n\nWe're here whenever you need quality boxes!`,

  // Menu
  'menu': `📋 ${businessInfo.name} Menu:\n\n🍕 Pizza Boxes - Type "pizza"\n🍔 Burger Boxes - Type "burger"\n💰 All Prices - Type "price"\n📍 Location - Type "location"\n⏰ Hours - Type "hours"\n📝 Order - Type "order"`,
  'start': `Welcome to ${businessInfo.name}! 👋\n\n${businessInfo.brand}\n\nWe provide quality packaging:\n🍕 Pizza Boxes\n🍔 Burger Boxes\n\nHow can I help you today?`
};

// Default quick replies
const defaultQuickReplies = [
  { title: '🍕 Pizza Box', payload: 'PIZZA' },
  { title: '🍔 Burger Box', payload: 'BURGER' },
  { title: '💰 Prices', payload: 'PRICES' },
  { title: '📍 Location', payload: 'LOCATION' }
];

// Find matching response based on keywords
function findResponse(text) {
  const lowerText = text.toLowerCase();

  // Check for exact matches first, then partial
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
      "I received your message! Please send text so I can assist you."
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
      `Thanks for your message! 📩\n\nI received: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"\n\nOur team will review this. Meanwhile, you can:\n• Type "price" for rates\n• Type "order" to place order\n• Type "menu" for all options`
    );
  }

  // Send quick replies for easy navigation
  await facebookService.sendQuickReplies(
    senderId,
    'Quick options:',
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
      response = `Welcome to ${businessInfo.name}! 👋\n\n${businessInfo.brand}\n\nWe provide premium quality:\n🍕 Pizza Boxes\n🍔 Burger Boxes\n\nHow can I help you today?`;
      break;
    case 'MENU':
    case 'MAIN_MENU':
      response = `📋 ${businessInfo.name} Menu:\n\n🍕 Pizza Boxes\n🍔 Burger Boxes\n💰 Prices\n📍 Locations\n⏰ Hours\n📝 Orders\n\nTap below or type what you need!`;
      break;
    case 'PIZZA':
      response = businessInfo.pizzaBoxPrices;
      break;
    case 'BURGER':
      response = businessInfo.burgerBoxPrices;
      break;
    case 'PRICES':
      response = businessInfo.allPrices;
      break;
    case 'LOCATION':
      response = `📍 ${businessInfo.name} Locations:\n\n🏢 HEAD OFFICE:\n${businessInfo.hqAddress}\n\n🏭 PRODUCTION:\n${businessInfo.productionAddress}`;
      break;
    case 'HOURS':
      response = `⏰ Business Hours:\n\n${businessInfo.hours}\n\n🚫 Closed: ${businessInfo.closedDays}`;
      break;
    case 'ORDER':
      response = `📝 To place an order:\n\n1. Product (Pizza box size / Burger box)\n2. Quantity\n3. Delivery address\n\nJust send us the details and we'll confirm your order!`;
      break;
    case 'HELP':
      response = `❓ I can help with:\n\n• Product pricing\n• Order placement\n• Location info\n• Business hours\n\nJust ask!`;
      break;
    case 'RESTART':
      conversationService.resetConversation(senderId);
      response = `Conversation restarted! 🔄\n\nWelcome back to ${businessInfo.name}. How can I help?`;
      break;
    default:
      response = `Thanks! How can I help you with "${payload}"?\n\nType "menu" for all options.`;
  }

  await facebookService.sendTextMessage(senderId, response);

  // Send quick replies
  await facebookService.sendQuickReplies(
    senderId,
    'Quick options:',
    defaultQuickReplies
  );
}

async function sendErrorMessage(senderId) {
  try {
    await facebookService.sendTextMessage(
      senderId,
      "Sorry, something went wrong. Please try again or type 'menu' for options."
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

    if (mode === 'subscribe' && token === config.facebook.verifyToken) {
      console.log('Webhook verified!');
      return res.status(200).send(challenge);
    } else {
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

    console.log('--- FINISHED ---');
    return;
  }

  return res.status(405).send('Method Not Allowed');
};
