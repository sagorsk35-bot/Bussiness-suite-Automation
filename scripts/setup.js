#!/usr/bin/env node

/**
 * Setup script for Business Suite AI Chatbot
 * This script helps configure the Messenger profile and verify API connections
 */

require('dotenv').config();
const axios = require('axios');

const config = {
  pageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
  googleAiKey: process.env.GOOGLE_AI_API_KEY,
  graphApiUrl: 'https://graph.facebook.com/v18.0'
};

async function checkFacebookToken() {
  console.log('\n📱 Checking Facebook Page Access Token...');

  if (!config.pageAccessToken) {
    console.log('   ❌ FACEBOOK_PAGE_ACCESS_TOKEN is not set in .env file');
    return false;
  }

  try {
    const response = await axios.get(`${config.graphApiUrl}/me`, {
      params: {
        access_token: config.pageAccessToken,
        fields: 'id,name'
      }
    });

    console.log(`   ✅ Token valid! Connected to: ${response.data.name} (ID: ${response.data.id})`);
    return true;
  } catch (error) {
    console.log(`   ❌ Token invalid: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

async function checkGoogleAI() {
  console.log('\n🤖 Checking Google AI API Key...');

  if (!config.googleAiKey) {
    console.log('   ❌ GOOGLE_AI_API_KEY is not set in .env file');
    return false;
  }

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(config.googleAiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const result = await model.generateContent('Say "API working" in exactly 2 words');
    const response = result.response.text();

    console.log(`   ✅ API key valid! Test response: "${response.trim()}"`);
    return true;
  } catch (error) {
    console.log(`   ❌ API key invalid: ${error.message}`);
    return false;
  }
}

async function setupMessengerProfile() {
  console.log('\n⚙️  Setting up Messenger Profile...');

  if (!config.pageAccessToken) {
    console.log('   ❌ Cannot setup - missing access token');
    return false;
  }

  try {
    // Set Get Started button
    await axios.post(
      `${config.graphApiUrl}/me/messenger_profile`,
      {
        get_started: { payload: 'GET_STARTED' }
      },
      { params: { access_token: config.pageAccessToken } }
    );
    console.log('   ✅ Get Started button configured');

    // Set Persistent Menu
    await axios.post(
      `${config.graphApiUrl}/me/messenger_profile`,
      {
        persistent_menu: [
          {
            locale: 'default',
            composer_input_disabled: false,
            call_to_actions: [
              { type: 'postback', title: '🏠 Main Menu', payload: 'MAIN_MENU' },
              { type: 'postback', title: '❓ Help', payload: 'HELP' },
              { type: 'postback', title: '🔄 Restart', payload: 'RESTART' }
            ]
          }
        ]
      },
      { params: { access_token: config.pageAccessToken } }
    );
    console.log('   ✅ Persistent menu configured');

    // Set Greeting
    await axios.post(
      `${config.graphApiUrl}/me/messenger_profile`,
      {
        greeting: [
          {
            locale: 'default',
            text: 'Hi {{user_first_name}}! 👋 Welcome! Tap "Get Started" to begin.'
          }
        ]
      },
      { params: { access_token: config.pageAccessToken } }
    );
    console.log('   ✅ Greeting text configured');

    return true;
  } catch (error) {
    console.log(`   ❌ Setup failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

async function getWebhookInfo() {
  console.log('\n🔗 Checking Webhook Configuration...');

  if (!config.pageAccessToken) {
    console.log('   ❌ Cannot check - missing access token');
    return;
  }

  try {
    // Get page info to find app
    const pageResponse = await axios.get(`${config.graphApiUrl}/me`, {
      params: {
        access_token: config.pageAccessToken,
        fields: 'id'
      }
    });

    console.log(`   📄 Page ID: ${pageResponse.data.id}`);
    console.log('\n   To complete webhook setup:');
    console.log('   1. Go to Meta Developer Console (https://developers.facebook.com)');
    console.log('   2. Select your app → Messenger → Settings');
    console.log('   3. Add webhook URL: https://your-domain.com/webhook');
    console.log(`   4. Verify token: ${process.env.FACEBOOK_VERIFY_TOKEN || 'your_custom_verify_token_here'}`);
    console.log('   5. Subscribe to: messages, messaging_postbacks');
  } catch (error) {
    console.log(`   ❌ Error: ${error.response?.data?.error?.message || error.message}`);
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  Business Suite AI Chatbot - Setup Wizard  ║');
  console.log('╚════════════════════════════════════════════╝');

  const fbValid = await checkFacebookToken();
  const aiValid = await checkGoogleAI();

  if (fbValid) {
    await setupMessengerProfile();
    await getWebhookInfo();
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('Summary:');
  console.log(`  Facebook Token: ${fbValid ? '✅ Valid' : '❌ Invalid'}`);
  console.log(`  Google AI Key:  ${aiValid ? '✅ Valid' : '❌ Invalid'}`);

  if (fbValid && aiValid) {
    console.log('\n🎉 All systems ready! Run "npm start" to launch the bot.');
  } else {
    console.log('\n⚠️  Please fix the issues above before running the bot.');
  }
  console.log('═══════════════════════════════════════════════\n');
}

main().catch(console.error);
