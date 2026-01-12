/**
 * Default flows - Similar to ManyChat's pre-built flows
 * These can be customized or extended for specific business needs
 */

const welcomeFlow = {
  name: 'welcome',
  description: 'Welcome flow for new users or when they click Get Started',
  triggers: [
    { type: 'exact', value: 'GET_STARTED' },
    { type: 'exact', value: 'RESTART' }
  ],
  steps: {
    start: {
      actions: [
        {
          type: 'send_text',
          text: 'Hi {{first_name}}! 👋 Welcome to our business!'
        },
        {
          type: 'delay',
          duration: 1000
        },
        {
          type: 'send_quick_replies',
          text: 'How can I help you today?',
          replies: [
            { title: '📦 Products', payload: 'PRODUCTS' },
            { title: '💬 Support', payload: 'SUPPORT' },
            { title: '📍 Contact Us', payload: 'CONTACT' },
            { title: '🤖 Ask AI', payload: 'ASK_AI' }
          ]
        }
      ]
    }
  }
};

const mainMenuFlow = {
  name: 'main_menu',
  description: 'Main menu flow',
  triggers: [
    { type: 'exact', value: 'MAIN_MENU' },
    { type: 'keyword', keywords: ['menu', 'start over', 'home'] }
  ],
  steps: {
    start: {
      actions: [
        {
          type: 'send_quick_replies',
          text: 'What would you like to do?',
          replies: [
            { title: '📦 Products', payload: 'PRODUCTS' },
            { title: '💬 Support', payload: 'SUPPORT' },
            { title: '📍 Contact Us', payload: 'CONTACT' },
            { title: '🤖 Ask AI', payload: 'ASK_AI' }
          ]
        }
      ]
    }
  }
};

const helpFlow = {
  name: 'help',
  description: 'Help flow for users who need assistance',
  triggers: [
    { type: 'exact', value: 'HELP' },
    { type: 'keyword', keywords: ['help', 'assistance', 'support'] }
  ],
  steps: {
    start: {
      actions: [
        {
          type: 'send_text',
          text: "I'm here to help! 🙌"
        },
        {
          type: 'send_buttons',
          text: 'Here are some things I can help you with:',
          buttons: [
            { title: '🛒 Order Status', payload: 'ORDER_STATUS' },
            { title: '❓ FAQs', payload: 'FAQ' },
            { title: '👤 Talk to Human', payload: 'HUMAN_AGENT' }
          ]
        }
      ]
    }
  }
};

const productsFlow = {
  name: 'products',
  description: 'Product inquiry flow',
  triggers: [
    { type: 'exact', value: 'PRODUCTS' },
    { type: 'keyword', keywords: ['products', 'buy', 'purchase', 'shop', 'catalog'] }
  ],
  steps: {
    start: {
      actions: [
        {
          type: 'send_text',
          text: "Great! Let me show you our products! 🛍️"
        },
        {
          type: 'send_quick_replies',
          text: 'What are you interested in?',
          replies: [
            { title: '🆕 New Arrivals', payload: 'NEW_PRODUCTS' },
            { title: '🔥 Best Sellers', payload: 'BEST_SELLERS' },
            { title: '💰 On Sale', payload: 'SALE' },
            { title: '🔍 Search', payload: 'SEARCH_PRODUCTS' }
          ]
        }
      ]
    }
  }
};

const contactFlow = {
  name: 'contact',
  description: 'Contact information flow',
  triggers: [
    { type: 'exact', value: 'CONTACT' },
    { type: 'keyword', keywords: ['contact', 'address', 'location', 'hours', 'phone', 'email'] }
  ],
  steps: {
    start: {
      actions: [
        {
          type: 'send_text',
          text: "Here's how you can reach us! 📞"
        },
        {
          type: 'send_buttons',
          text: '📍 Our Business\n\n📧 Email: support@example.com\n📱 Phone: +1 (555) 123-4567\n⏰ Hours: Mon-Fri 9AM-6PM',
          buttons: [
            { title: '📧 Send Email', url: 'mailto:support@example.com' },
            { title: '📍 Get Directions', url: 'https://maps.google.com' },
            { title: '🔙 Back to Menu', payload: 'MAIN_MENU' }
          ]
        }
      ]
    }
  }
};

const supportFlow = {
  name: 'support',
  description: 'Customer support flow',
  triggers: [
    { type: 'exact', value: 'SUPPORT' },
    { type: 'keyword', keywords: ['issue', 'problem', 'complaint', 'broken', 'not working'] }
  ],
  steps: {
    start: {
      actions: [
        {
          type: 'send_text',
          text: "I'm sorry to hear you need support. Let me help! 🛠️"
        },
        {
          type: 'send_quick_replies',
          text: 'What type of issue are you experiencing?',
          replies: [
            { title: '📦 Order Issue', payload: 'ORDER_ISSUE' },
            { title: '🔧 Product Issue', payload: 'PRODUCT_ISSUE' },
            { title: '💳 Payment Issue', payload: 'PAYMENT_ISSUE' },
            { title: '❓ Other', payload: 'OTHER_ISSUE' }
          ]
        }
      ],
      waitForInput: true,
      storeInputAs: 'support_type',
      inputHandlers: [
        {
          type: 'any',
          goto: 'collect_details'
        }
      ]
    },
    collect_details: {
      actions: [
        {
          type: 'send_text',
          text: 'Please describe your issue in detail, and I\'ll do my best to help:'
        }
      ],
      waitForInput: true,
      storeInputAs: 'issue_description',
      inputHandlers: [
        {
          type: 'any',
          goto: 'ai_assist'
        }
      ]
    },
    ai_assist: {
      actions: [
        {
          type: 'ai_response',
          prompt: 'The customer has a {{support_type}} issue: {{issue_description}}. Provide helpful support advice.'
        },
        {
          type: 'send_quick_replies',
          text: 'Did this help resolve your issue?',
          replies: [
            { title: '✅ Yes, thanks!', payload: 'ISSUE_RESOLVED' },
            { title: '❌ No, I need more help', payload: 'HUMAN_AGENT' }
          ]
        }
      ]
    }
  }
};

const aiChatFlow = {
  name: 'ai_chat',
  description: 'Free-form AI conversation flow',
  triggers: [
    { type: 'exact', value: 'ASK_AI' },
    { type: 'keyword', keywords: ['ask ai', 'talk to ai', 'ai help', 'question'] }
  ],
  steps: {
    start: {
      actions: [
        {
          type: 'send_text',
          text: "I'm your AI assistant! 🤖 Ask me anything and I'll do my best to help."
        },
        {
          type: 'send_text',
          text: 'Type your question or say "menu" to go back to the main menu.'
        }
      ],
      waitForInput: true,
      inputHandlers: [
        {
          type: 'contains',
          value: 'menu',
          goto: 'exit'
        },
        {
          type: 'any',
          goto: 'respond'
        }
      ]
    },
    respond: {
      actions: [
        {
          type: 'ai_response'
        }
      ],
      waitForInput: true,
      inputHandlers: [
        {
          type: 'contains',
          value: 'menu',
          goto: 'exit'
        },
        {
          type: 'any',
          goto: 'respond'
        }
      ]
    },
    exit: {
      actions: [
        {
          type: 'goto_flow',
          flow: 'main_menu',
          step: 'start'
        }
      ]
    }
  }
};

const humanAgentFlow = {
  name: 'human_agent',
  description: 'Request to talk to a human agent',
  triggers: [
    { type: 'exact', value: 'HUMAN_AGENT' },
    { type: 'keyword', keywords: ['human', 'agent', 'representative', 'real person', 'talk to someone'] }
  ],
  steps: {
    start: {
      actions: [
        {
          type: 'send_text',
          text: "I understand you'd like to speak with a human agent. 👤"
        },
        {
          type: 'send_text',
          text: "A member of our team will respond as soon as possible. Our typical response time is within 1-2 hours during business hours."
        },
        {
          type: 'send_quick_replies',
          text: 'In the meantime, is there anything else I can help you with?',
          replies: [
            { title: '📱 Leave Phone #', payload: 'LEAVE_PHONE' },
            { title: '📧 Leave Email', payload: 'LEAVE_EMAIL' },
            { title: "⏳ I'll Wait", payload: 'WAIT_FOR_AGENT' }
          ]
        }
      ]
    }
  }
};

const orderStatusFlow = {
  name: 'order_status',
  description: 'Check order status',
  triggers: [
    { type: 'exact', value: 'ORDER_STATUS' },
    { type: 'keyword', keywords: ['order status', 'track order', 'where is my order', 'shipping'] }
  ],
  steps: {
    start: {
      actions: [
        {
          type: 'send_text',
          text: 'I can help you track your order! 📦'
        },
        {
          type: 'send_text',
          text: 'Please enter your order number:'
        }
      ],
      waitForInput: true,
      storeInputAs: 'order_number',
      inputHandlers: [
        {
          type: 'any',
          goto: 'lookup'
        }
      ]
    },
    lookup: {
      actions: [
        {
          type: 'send_text',
          text: '🔍 Looking up order #{{order_number}}...'
        },
        {
          type: 'delay',
          duration: 1500
        },
        {
          type: 'ai_response',
          prompt: 'The customer is asking about order #{{order_number}}. Provide a helpful response about how they can track their order, mention that order tracking is typically available on the website, and offer to connect them with support if they need more help.'
        },
        {
          type: 'send_quick_replies',
          text: 'Anything else I can help with?',
          replies: [
            { title: '🔄 Track Another', payload: 'ORDER_STATUS' },
            { title: '💬 Get Support', payload: 'SUPPORT' },
            { title: '🏠 Main Menu', payload: 'MAIN_MENU' }
          ]
        }
      ]
    }
  }
};

const faqFlow = {
  name: 'faq',
  description: 'Frequently asked questions',
  triggers: [
    { type: 'exact', value: 'FAQ' },
    { type: 'keyword', keywords: ['faq', 'frequently asked', 'common questions'] }
  ],
  steps: {
    start: {
      actions: [
        {
          type: 'send_text',
          text: 'Here are some frequently asked questions: 📋'
        },
        {
          type: 'send_buttons',
          text: 'Select a topic:',
          buttons: [
            { title: '🚚 Shipping Info', payload: 'FAQ_SHIPPING' },
            { title: '↩️ Returns Policy', payload: 'FAQ_RETURNS' },
            { title: '💳 Payment Options', payload: 'FAQ_PAYMENT' }
          ]
        }
      ]
    }
  }
};

const greetingFlow = {
  name: 'greeting',
  description: 'Handle greetings',
  triggers: [
    { type: 'keyword', keywords: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'] }
  ],
  steps: {
    start: {
      actions: [
        {
          type: 'send_text',
          text: 'Hello {{first_name}}! 👋 Great to hear from you!'
        },
        {
          type: 'goto_flow',
          flow: 'main_menu',
          step: 'start'
        }
      ]
    }
  }
};

const goodbyeFlow = {
  name: 'goodbye',
  description: 'Handle goodbyes',
  triggers: [
    { type: 'keyword', keywords: ['bye', 'goodbye', 'see you', 'thanks bye', 'take care'] }
  ],
  steps: {
    start: {
      actions: [
        {
          type: 'send_text',
          text: "Goodbye {{first_name}}! 👋 Thanks for chatting with us. Feel free to message anytime you need help!"
        },
        {
          type: 'send_quick_replies',
          text: "Before you go, is there anything else I can help with?",
          replies: [
            { title: '✅ All Good!', payload: 'DONE' },
            { title: '🏠 Main Menu', payload: 'MAIN_MENU' }
          ]
        }
      ]
    }
  }
};

// Export all flows
module.exports = {
  welcomeFlow,
  mainMenuFlow,
  helpFlow,
  productsFlow,
  contactFlow,
  supportFlow,
  aiChatFlow,
  humanAgentFlow,
  orderStatusFlow,
  faqFlow,
  greetingFlow,
  goodbyeFlow
};
