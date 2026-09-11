import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  handleIncomingMessage,
  conversationStore,
  ConversationStates
} from './botLogic.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON and urlencoded requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Reusable WhatsApp Cloud API message sender
 * @param {string} to - Recipient WhatsApp phone number in international format (e.g. "254712345678")
 * @param {string} message - Text message content
 */
export async function sendWhatsAppMessage(to, message) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.warn(
      `[WhatsApp API Simulation] Recipient: ${to} | Credentials not fully set in environment (WHATSAPP_TOKEN or PHONE_NUMBER_ID missing). Message not dispatched to Meta Cloud API.`
    );
    return { simulated: true, success: true };
  }

  const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'text',
    text: {
      preview_url: false,
      body: message,
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    console.log(`[WhatsApp API Success] Dispatched message to ${to}. Message ID:`, response.data?.messages?.[0]?.id);
    return { success: true, data: response.data };
  } catch (error) {
    // Log technical error safely WITHOUT exposing authorization tokens
    const errorDetails = error.response?.data?.error?.message || error.message;
    console.error(`[WhatsApp API Error] Failed to send message to ${to}:`, errorDetails);
    return { success: false, error: errorDetails };
  }
}

/**
 * Health check endpoint required by Render
 * GET /health
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'Bonan Vivon WhatsApp Bot',
  });
});

/**
 * WhatsApp Webhook Verification
 * GET /webhook
 */
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expectedVerifyToken = process.env.VERIFY_TOKEN;

  if (mode && token) {
    if (mode === 'subscribe' && token === expectedVerifyToken) {
      console.log('[Webhook Verification] Webhook verified successfully by Meta.');
      return res.status(200).send(challenge);
    } else {
      console.warn('[Webhook Verification] Verification token mismatch.');
      return res.sendStatus(403);
    }
  }

  return res.status(400).send('Missing hub.mode or hub.verify_token parameters');
});

/**
 * WhatsApp Webhook Message Handler
 * POST /webhook
 */
app.post('/webhook', async (req, res) => {
  // Always immediately acknowledge the webhook with 200 OK so WhatsApp doesn't retry
  res.sendStatus(200);

  try {
    const body = req.body;

    // Validate incoming payload safely
    if (body.object !== 'whatsapp_business_account') {
      return;
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) {
      return;
    }

    // Ignore delivery/read status updates
    if (value.statuses && !value.messages) {
      return;
    }

    const messages = value.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return;
    }

    const incomingMsg = messages[0];

    // Only process standard text messages
    if (incomingMsg.type !== 'text' || !incomingMsg.text?.body) {
      console.log(`[Webhook] Ignored non-text message type: ${incomingMsg.type} from ${incomingMsg.from}`);
      return;
    }

    const senderPhone = incomingMsg.from;
    const textBody = incomingMsg.text.body;

    console.log(`[Webhook] Received message from ${senderPhone}: "${textBody}"`);

    // Process using Bonan Vivon conversation state engine
    const replies = handleIncomingMessage(senderPhone, textBody);

    // Dispatch reply messages sequentially
    for (const reply of replies) {
      await sendWhatsAppMessage(senderPhone, reply);
    }
  } catch (err) {
    // Catch any unexpected parsing error and keep server running
    console.error('[Webhook Processing Error]', err.message);
  }
});

/**
 * Simulator & Status API for browser testing and monitoring
 */
app.get('/api/status', (req, res) => {
  res.json({
    service: 'Bonan Vivon WhatsApp Bot',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    hasWhatsAppToken: Boolean(process.env.WHATSAPP_TOKEN),
    hasPhoneNumberId: Boolean(process.env.PHONE_NUMBER_ID),
    hasVerifyToken: Boolean(process.env.VERIFY_TOKEN),
    activeConversations: conversationStore.getAll().length,
  });
});

app.post('/api/chat', (req, res) => {
  try {
    const { phone = '254712345678', message = '' } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const replies = handleIncomingMessage(phone, message);
    const state = conversationStore.get(phone);

    res.json({
      phone,
      input: message,
      replies,
      state,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/state/:phone', (req, res) => {
  const phone = req.params.phone;
  const state = conversationStore.get(phone);
  res.json(state);
});

app.post('/api/reset', (req, res) => {
  const { phone = '254712345678' } = req.body;
  const state = conversationStore.reset(phone);
  res.json({ ok: true, state });
});

// Configure Vite middleware in development or serve static dist in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('[Dev] Vite middleware attached for live preview.');
    } catch (err) {
      console.warn('[Dev] Vite middleware could not start, continuing with Express only:', err.message);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      // Standalone Node server without client dist
      app.get('/', (req, res) => {
        res.type('html').send(`
          <!DOCTYPE html>
          <html>
            <head><title>Bonan Vivon WhatsApp Bot</title></head>
            <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; line-height: 1.6; padding: 20px;">
              <h1>Bonan Vivon WhatsApp Bot is Running</h1>
              <p>The webhook server is active and listening for WhatsApp Cloud API events.</p>
              <ul>
                <li>Health Check: <a href="/health">/health</a></li>
                <li>Webhook Endpoint: <code>/webhook</code></li>
              </ul>
            </body>
          </html>
        `);
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`  Bonan Vivon WhatsApp Bot Server Active  `);
    console.log(`  Port: ${PORT} (0.0.0.0:${PORT})         `);
    console.log(`  Health Check: http://0.0.0.0:${PORT}/health `);
    console.log(`  Webhook URL:  http://0.0.0.0:${PORT}/webhook `);
    console.log(`=========================================`);
  });
}

startServer();
