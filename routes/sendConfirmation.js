import express from 'express';
import pkg from 'nodemailer';
const { createTransport } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Create reusable transporter using SMTP
const createTransporter = () => {
  return createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    requireTLS: true, // Force STARTTLS encryption
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send confirmation email endpoint
router.post('/', async (req, res) => {
  try {
    const {
      email,
      agentName,
      agentTitle,
      scheduledDate,
      scheduledTime,
      jobInterests,
      workPreferences
    } = req.body;

    if (!email || !agentName || !scheduledDate || !scheduledTime) {
      console.error('Missing required fields:', { email, agentName, scheduledDate, scheduledTime });
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields',
        received: { email, agentName, scheduledDate, scheduledTime }
      });
    }

    const appName = process.env.APP_NAME || 'Careers Portal';
    
    // Format date for email
    const dateObj = new Date(scheduledDate);
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Create HTML email content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            padding: 20px;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          .branding-header {
            background: #f8faffc;
            padding: 25px 20px;
            text-align: center;
            border-bottom: 3px solid #006BFF;
          }
          .app-name {
            font-size: 26px;
            font-weight: 700;
            color: #1a1a1a;
            letter-spacing: -0.5px;
            margin: 0 0 8px 0;
          }
          .brand-separator {
            font-size: 20px;
            color: #999;
            margin: 8px 0;
          }
          .calendly-logo {
            width: 140px;
            height: auto;
            display: block;
            margin: 8px auto 0 auto;
          }
          .powered-by {
            font-size: 10px;
            color: #999;
            margin-top: 10px;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .header {
            background: #006BFF;
            color: white;
            padding: 35px 30px;
            text-align: center;
          }
          .success-icon {
            width: 50px;
            height: 50px;
            background: rgba(255, 255, 255, 0.25);
            border-radius: 50%;
            margin: 0 auto 18px;
            padding: 12px;
          }
          .checkmark-symbol {
            font-size: 28px;
            line-height: 1;
            color: white;
            font-weight: bold;
          }
          .header h1 {
            margin: 0;
            font-size: 32px;
            font-weight: 700;
            letter-spacing: -0.5px;
          }
          .header p {
            margin: 12px 0 0 0;
            opacity: 0.95;
            font-size: 16px;
            font-weight: 400;
          }
          .content {
            padding: 40px 30px;
            background: #ffffff;
          }
          .greeting {
            font-size: 18px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 16px;
          }
          .intro-text {
            font-size: 15px;
            color: #555;
            margin-bottom: 30px;
            line-height: 1.7;
          }
          .detail-box {
            background: #ffffff;
            border: 1px solid #e8f2ff;
            padding: 0;
            margin: 16px 0;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 107, 255, 0.05);
          }
          .detail-header {
            background: #006BFF;
            padding: 12px 20px;
            border-bottom: 2px solid #0052CC;
          }
          .detail-label {
            font-weight: 700;
            color: #ffffff;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin: 0;
          }
          .detail-body {
            padding: 20px;
            background: #fafbff;
          }
          .detail-value {
            font-size: 18px;
            font-weight: 700;
            color: #1a1a1a;
            margin: 0 0 8px 0;
            line-height: 1.4;
          }
          .detail-subtitle {
            color: #666;
            font-size: 14px;
            margin: 0;
            line-height: 1.6;
          }
          .detail-icon {
            display: inline-block;
            width: 16px;
            height: 16px;
            margin-right: 6px;
          }
          .meeting-table {
            width: 100%;
            margin: 20px 0;
          }
          .meeting-card {
            background: #ffffff;
            border: 1px solid #e8f2ff;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0, 107, 255, 0.05);
            width: 48%;
            vertical-align: top;
          }
          .meeting-card-icon {
            width: 40px;
            height: 40px;
            background: #e3f2fd;
            border-radius: 10px;
            text-align: center;
            line-height: 40px;
            margin-bottom: 12px;
          }
          .meeting-card-label {
            font-size: 11px;
            font-weight: 700;
            color: #006BFF;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
          }
          .meeting-card-value {
            font-size: 16px;
            font-weight: 600;
            color: #1a1a1a;
            line-height: 1.4;
            margin-bottom: 4px;
          }
          .meeting-card-subtitle {
            font-size: 13px;
            color: #666;
            line-height: 1.5;
          }
          .tags-container {
            background: #ffffff;
            border: 1px solid #e8f2ff;
            border-radius: 12px;
            padding: 20px;
            margin: 16px 0;
            box-shadow: 0 2px 8px rgba(0, 107, 255, 0.05);
          }
          .tags-header {
            font-size: 12px;
            font-weight: 700;
            color: #006BFF;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 14px;
          }
          .tags {
            line-height: 2;
          }
          .tag {
            background: #006BFF;
            color: #ffffff;
            padding: 10px 18px;
            border-radius: 24px;
            font-size: 13px;
            font-weight: 600;
            border: none;
            display: inline-block;
            margin: 4px;
          }
          .tag:before {
            content: '●';
            font-size: 8px;
            opacity: 0.8;
          }
          .section-divider {
            height: 2px;
            background: linear-gradient(90deg, transparent 0%, #e0e0e0 50%, transparent 100%);
            margin: 35px 0;
          }
          .next-steps {
            background: #fff8e1;
            border-left: 4px solid #ffc107;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
          }
          .next-steps-title {
            font-weight: 700;
            color: #f57c00;
            font-size: 15px;
            margin-bottom: 10px;
          }
          .next-steps-text {
            color: #555;
            font-size: 14px;
            line-height: 1.7;
          }
          .closing {
            margin-top: 30px;
            font-size: 15px;
            color: #555;
            line-height: 1.7;
          }
          .signature {
            margin-top: 25px;
            font-size: 15px;
            color: #1a1a1a;
          }
          .signature-team {
            font-weight: 700;
            color: #006BFF;
          }
          .footer {
            background: #f8f9fa;
            text-align: center;
            padding: 30px 20px;
            border-top: 1px solid #e0e0e0;
          }
          .footer-text {
            color: #999;
            font-size: 12px;
            line-height: 1.8;
            margin: 5px 0;
          }
          .footer-links {
            margin-top: 15px;
          }
          .footer-link {
            color: #006BFF;
            text-decoration: none;
            font-size: 12px;
            margin: 0 10px;
          }
          @media only screen and (max-width: 600px) {
            .app-name {
              font-size: 22px;
              display: block;
              margin: 0 0 10px 0;
            }
            .separator {
              display: block;
              margin: 10px 0;
            }
            .calendly-logo {
              display: block;
              margin: 10px auto 0;
            }
            .content {
              padding: 30px 20px;
            }
            .header h1 {
              font-size: 26px;
            }
            .meeting-grid {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <!-- Professional Branding Header -->
          <div class="branding-header">
            <img src="cid:app-logo" class="app-logo" alt="${appName}" style="width: auto; height: 80px; display: block; margin: 0 auto 10px auto;" />
            <p class="brand-separator">×</p>
            <img src="cid:calendly-logo" class="calendly-logo" alt="Calendly" />
            <div class="powered-by">POWERED BY CALENDLY SCHEDULING</div>
          </div>

          <!-- Success Header -->
          <div class="header">
            <div class="success-icon">
              <div class="checkmark-symbol">✓</div>
            </div>
            <h1>Meeting Confirmed!</h1>
            <p>Your appointment has been successfully scheduled</p>
          </div>
        
          <!-- Main Content -->
          <div class="content">
          <!-- Main Content -->
          <div class="content">
            <div class="greeting">Hello!</div>
            <p class="intro-text">Thank you for scheduling a meeting with ${appName}. We're excited to connect with you and discuss your career opportunities!</p>
          
            <!-- Main Meeting Details -->
            <div class="detail-box">
              <div class="detail-header">
                <div class="detail-label">🤝 Meeting With</div>
              </div>
              <div class="detail-body">
                <div class="detail-value">${agentName}</div>
                <div class="detail-subtitle">${agentTitle}</div>
              </div>
            </div>

            <!-- Date, Time & Duration Grid -->
            <table class="meeting-table" cellpadding="0" cellspacing="8">
              <tr>
                <td class="meeting-card">
                  <div class="meeting-card-icon">📅</div>
                  <div class="meeting-card-label">DATE</div>
                  <div class="meeting-card-value">${formattedDate}</div>
                </td>
                <td style="width: 4%;"></td>
                <td class="meeting-card">
                  <div class="meeting-card-icon">🕐</div>
                  <div class="meeting-card-label">TIME</div>
                  <div class="meeting-card-value">${scheduledTime}</div>
                  <div class="meeting-card-subtitle">Central European Time</div>
                </td>
              </tr>
            </table>

            <table class="meeting-table" cellpadding="0" cellspacing="8">
              <tr>
                <td class="meeting-card">
                  <div class="meeting-card-icon">⏱️</div>
                  <div class="meeting-card-label">DURATION</div>
                  <div class="meeting-card-value">30 Minutes</div>
                  <div class="meeting-card-subtitle">Video Conference</div>
                </td>
                <td style="width: 4%;"></td>
                <td class="meeting-card">
                  <div class="meeting-card-icon">💻</div>
                  <div class="meeting-card-label">FORMAT</div>
                  <div class="meeting-card-value">Online</div>
                  <div class="meeting-card-subtitle">Link sent via email</div>
                </td>
              </tr>
            </table>
          
            ${jobInterests && jobInterests.length > 0 ? `
            <div class="tags-container">
              <div class="tags-header">
                📦 Your Job Interests
              </div>
              <div class="tags">
                ${jobInterests.map(interest => `<span class="tag">${interest}</span>`).join('')}
              </div>
            </div>
            ` : ''}
          
            ${workPreferences && workPreferences.length > 0 ? `
            <div class="tags-container">
              <div class="tags-header">
                👤 Work Preferences
              </div>
              <div class="tags">
                ${workPreferences.map(pref => `<span class="tag">${pref}</span>`).join('')}
              </div>
            </div>
            ` : ''}

            <div class="section-divider"></div>
          
            <div class="next-steps">
              <div class="next-steps-title">📅 What's Next?</div>
              <div class="next-steps-text">
                A calendar invitation with the meeting link will be sent to you shortly. Please add this to your calendar and join the meeting at the scheduled time. Make sure to test your audio and video beforehand!
              </div>
            </div>
          
            <p class="closing">
              If you need to reschedule or have any questions before the meeting, please don't hesitate to reach out to us. We're here to help!
            </p>
          
            <div class="signature">
              Best regards,<br>
              <span class="signature-team">${appName} Team</span>
            </div>
          </div>
        
          <!-- Footer -->
          <div class="footer">
            <p class="footer-text">This is an automated confirmation email from <strong>${appName}</strong></p>
            <div class="footer-links">
              <a href="#" class="footer-link">Privacy Policy</a> | 
              <a href="#" class="footer-link">Contact Us</a> | 
              <a href="#" class="footer-link">Unsubscribe</a>
            </div>
            <p class="footer-text" style="margin-top: 15px;">© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Plain text version
    const textContent = `
Meeting Confirmed!

Hello,

Thank you for scheduling a meeting with ${appName}. We're looking forward to speaking with you!

Meeting Details:
- Meeting With: ${agentName} (${agentTitle})
- Date: ${formattedDate}
- Time: ${scheduledTime} (Central European Standard Time)
- Duration: 30 minutes

${jobInterests && jobInterests.length > 0 ? `Your Job Interests: ${jobInterests.join(', ')}` : ''}
${workPreferences && workPreferences.length > 0 ? `Work Preferences: ${workPreferences.join(', ')}` : ''}

What's Next?
A calendar invitation with the meeting link will be sent to you shortly. Please add this to your calendar and join the meeting at the scheduled time.

If you need to reschedule or have any questions, please don't hesitate to reach out.

Best regards,
${appName} Team

---
This is an automated confirmation email from ${appName}
© ${new Date().getFullYear()} ${appName}. All rights reserved.
    `;

    console.log('Creating email transporter...');
    const transporter = createTransporter();

    const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER;

    console.log('Preparing to send email...');
    console.log('From:', `"${appName}" <${emailFrom}>`);
    console.log('To:', email);
    console.log('Subject:', `Meeting Confirmed with ${agentName} - ${appName}`);

    // Send mail
    const info = await transporter.sendMail({
      from: `"${appName}" <${emailFrom}>`,
      to: email,
      subject: `Meeting Confirmed with ${agentName} - ${appName}`,
      text: textContent,
      html: htmlContent,
      attachments: [
        {
          filename: 'logo.png',
          path: './Images/logo.png',
          cid: 'app-logo'
        },
        {
          filename: 'calendly.png',
          path: './Images/calendly.png',
          cid: 'calendly-logo'
        }
      ]
    });

    console.log('✅ EMAIL SENT SUCCESSFULLY!');
    console.log('Message ID:', info.messageId);
    console.log('Email sent to:', email);

    res.json({ 
      success: true, 
      message: 'Confirmation email sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('❌ ERROR SENDING EMAIL:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', error);
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send confirmation email',
      error: error.message,
      details: error.toString()
    });
  }
});

export default router;
