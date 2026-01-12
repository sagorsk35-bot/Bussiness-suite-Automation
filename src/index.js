const express = require('express');
const config = require('./config');
const logger = require('./utils/logger');
const webhookController = require('./controllers/webhookController');
const facebookService = require('./services/facebookService');
const flowEngine = require('./flows/flowEngine');
const conversationService = require('./services/conversationService');

// Import default flows
const defaultFlows = require('./flows/defaultFlows');

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`, {
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    body: req.body?.object ? { object: req.body.object } : undefined
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  const stats = conversationService.getStats();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    stats
  });
});

// Webhook verification (GET)
app.get('/webhook', (req, res) => webhookController.verify(req, res));

// Webhook event handler (POST)
app.post('/webhook', (req, res) => webhookController.handle(req, res));

// API endpoints for managing the bot
app.get('/api/flows', (req, res) => {
  res.json({
    flows: flowEngine.getFlows()
  });
});

app.get('/api/stats', (req, res) => {
  res.json(conversationService.getStats());
});

// Setup endpoint to configure Messenger profile
app.post('/api/setup', async (req, res) => {
  try {
    const result = await facebookService.setupMessengerProfile();
    res.json({ success: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Register all default flows
function initializeFlows() {
  logger.info('Initializing flows...');

  Object.values(defaultFlows).forEach(flow => {
    flowEngine.registerFlow(flow.name, flow);
  });

  logger.info(`Registered ${flowEngine.getFlows().length} flows`);
}

// Start the server
function startServer() {
  initializeFlows();

  app.listen(config.port, () => {
    logger.info('========================================');
    logger.info('  Business Suite AI Chatbot Started!');
    logger.info('========================================');
    logger.info(`Server running on port ${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`Webhook URL: https://your-domain.com/webhook`);
    logger.info('');
    logger.info('Available endpoints:');
    logger.info('  GET  /health     - Health check');
    logger.info('  GET  /webhook    - Facebook verification');
    logger.info('  POST /webhook    - Facebook events');
    logger.info('  GET  /api/flows  - List registered flows');
    logger.info('  GET  /api/stats  - Bot statistics');
    logger.info('  POST /api/setup  - Setup Messenger profile');
    logger.info('========================================');

    // Validate configuration
    if (!config.facebook.pageAccessToken) {
      logger.warn('WARNING: FACEBOOK_PAGE_ACCESS_TOKEN is not set!');
    }
    if (!config.googleAI.apiKey) {
      logger.warn('WARNING: GOOGLE_AI_API_KEY is not set!');
    }
    if (config.facebook.verifyToken === 'your_custom_verify_token_here') {
      logger.warn('WARNING: Using default verify token. Please set FACEBOOK_VERIFY_TOKEN!');
    }
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the application
startServer();

module.exports = app;
