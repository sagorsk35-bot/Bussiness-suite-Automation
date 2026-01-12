# Business Suite AI Chatbot

An AI-powered chatbot automation platform for Facebook Business Suite - a ManyChat alternative built with Node.js, Google AI (Gemini), and the Facebook Messenger API.

## Features

- **AI-Powered Responses**: Intelligent conversations using Google's Gemini AI
- **Flow Builder**: Pre-built and customizable conversation flows (like ManyChat)
- **Quick Replies & Buttons**: Interactive messaging with quick replies and button templates
- **Conversation Context**: Maintains conversation history for contextual responses
- **Intent Analysis**: Automatically analyzes message intent and sentiment
- **User Variables**: Store and use custom fields (like ManyChat custom fields)
- **Persistent Menu**: Configurable messenger menu
- **Multi-step Flows**: Support for complex conversation flows with conditions

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and update with your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your API keys:

```env
FACEBOOK_PAGE_ACCESS_TOKEN=your_facebook_page_access_token
FACEBOOK_VERIFY_TOKEN=your_custom_verify_token
GOOGLE_AI_API_KEY=your_google_ai_api_key
```

### 3. Run Setup

Verify your configuration:

```bash
npm run setup
```

### 4. Start the Bot

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## Facebook Setup

### Prerequisites

1. A Facebook Page
2. A Facebook App with Messenger product enabled
3. Page Access Token with required permissions:
   - `pages_messaging`
   - `pages_read_engagement`
   - `pages_manage_posts`

### Webhook Configuration

1. Go to [Meta Developer Console](https://developers.facebook.com)
2. Select your app → Messenger → Settings
3. Add webhook:
   - **Callback URL**: `https://your-domain.com/webhook`
   - **Verify Token**: Same as `FACEBOOK_VERIFY_TOKEN` in your `.env`
4. Subscribe to events:
   - `messages`
   - `messaging_postbacks`
   - `messaging_optins`

### Deploy Options

For the webhook to work, you need a public HTTPS URL. Options:

- **ngrok** (development): `ngrok http 3000`
- **Railway**: [railway.app](https://railway.app)
- **Render**: [render.com](https://render.com)
- **Heroku**: [heroku.com](https://heroku.com)
- **DigitalOcean**: [digitalocean.com](https://digitalocean.com)

## Project Structure

```
├── src/
│   ├── config/           # Configuration management
│   ├── controllers/      # Request handlers
│   │   ├── messageController.js
│   │   └── webhookController.js
│   ├── services/         # Business logic
│   │   ├── aiService.js          # Google AI integration
│   │   ├── facebookService.js    # Facebook API
│   │   └── conversationService.js # Conversation state
│   ├── flows/            # Conversation flows
│   │   ├── flowEngine.js         # Flow execution engine
│   │   └── defaultFlows.js       # Pre-built flows
│   ├── utils/            # Utilities
│   └── index.js          # Application entry point
├── scripts/
│   └── setup.js          # Setup wizard
├── .env.example          # Environment template
└── package.json
```

## Built-in Flows

| Flow | Trigger | Description |
|------|---------|-------------|
| `welcome` | GET_STARTED | Welcome message for new users |
| `main_menu` | "menu" | Main navigation menu |
| `help` | "help" | Help and support options |
| `products` | "products" | Product catalog navigation |
| `contact` | "contact" | Contact information |
| `support` | "support" | Customer support flow |
| `ai_chat` | "ask ai" | Free-form AI conversation |
| `order_status` | "order status" | Order tracking |
| `faq` | "faq" | Frequently asked questions |
| `greeting` | "hi", "hello" | Handle greetings |
| `goodbye` | "bye" | Handle farewells |

## Creating Custom Flows

Add your own flows in `src/flows/defaultFlows.js`:

```javascript
const customFlow = {
  name: 'my_custom_flow',
  description: 'My custom flow description',
  triggers: [
    { type: 'keyword', keywords: ['custom', 'my flow'] },
    { type: 'exact', value: 'CUSTOM_PAYLOAD' }
  ],
  steps: {
    start: {
      actions: [
        {
          type: 'send_text',
          text: 'Hello {{first_name}}! This is my custom flow.'
        },
        {
          type: 'send_quick_replies',
          text: 'Choose an option:',
          replies: [
            { title: 'Option 1', payload: 'OPT_1' },
            { title: 'Option 2', payload: 'OPT_2' }
          ]
        }
      ],
      waitForInput: true,
      storeInputAs: 'user_choice',
      inputHandlers: [
        {
          type: 'exact',
          value: 'OPT_1',
          goto: 'option_1_step'
        },
        {
          type: 'any',
          goto: 'default_step'
        }
      ]
    },
    option_1_step: {
      actions: [
        { type: 'send_text', text: 'You chose Option 1!' },
        { type: 'ai_response' }
      ]
    }
  }
};
```

### Action Types

| Action | Description | Parameters |
|--------|-------------|------------|
| `send_text` | Send text message | `text`, `delay` |
| `send_quick_replies` | Send quick reply buttons | `text`, `replies` |
| `send_buttons` | Send button template | `text`, `buttons` |
| `send_carousel` | Send carousel cards | `elements` |
| `ai_response` | Generate AI response | `prompt` (optional) |
| `set_variable` | Set user variable | `name`, `value`, `fromInput` |
| `condition` | Conditional logic | `condition`, `then`, `else` |
| `goto_flow` | Jump to another flow | `flow`, `step` |
| `delay` | Wait before next action | `duration` (ms) |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check and stats |
| `/webhook` | GET | Facebook verification |
| `/webhook` | POST | Receive Facebook events |
| `/api/flows` | GET | List registered flows |
| `/api/stats` | GET | Bot statistics |
| `/api/setup` | POST | Setup Messenger profile |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Facebook Page access token | Yes |
| `FACEBOOK_VERIFY_TOKEN` | Webhook verification token | Yes |
| `FACEBOOK_APP_SECRET` | App secret for validation | No |
| `GOOGLE_AI_API_KEY` | Google AI Studio API key | Yes |
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `BOT_NAME` | Bot display name | No |
| `WELCOME_MESSAGE` | Default welcome message | No |
| `CONVERSATION_TIMEOUT_MINUTES` | Session timeout | No |
| `MAX_CONTEXT_MESSAGES` | Messages to keep in context | No |

## Customizing the AI

Edit the system prompt in `src/services/aiService.js`:

```javascript
this.systemPrompt = `You are ${config.bot.name}, a helpful assistant for [Your Business].
Your role is to:
- Answer questions about [your products/services]
- Help customers with [specific tasks]
- Provide information about [your business]

Important:
- Always be professional and friendly
- [Add your specific guidelines here]
`;
```

## Security Notes

- Never commit your `.env` file
- Use strong, unique verify tokens
- Consider implementing rate limiting for production
- Validate webhook signatures in production

## License

MIT
