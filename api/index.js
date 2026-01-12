module.exports = async (req, res) => {
  res.status(200).json({
    name: 'Business Suite AI Chatbot',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      webhook: '/webhook',
      health: '/health',
      setup: '/api/setup (POST)'
    },
    documentation: 'https://github.com/sagorsk35-bot/Bussiness-suite-Automation'
  });
};
