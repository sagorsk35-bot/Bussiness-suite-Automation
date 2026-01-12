const facebookService = require('../src/services/facebookService');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const result = await facebookService.setupMessengerProfile();
    res.status(200).json({
      success: result,
      message: result
        ? 'Messenger profile configured successfully!'
        : 'Failed to configure messenger profile'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
