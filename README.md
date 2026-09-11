# Bonan Vivon Bot 🌿📱

A production-ready WhatsApp chatbot for the **Bonan Vivon Project**, built with **Node.js + Express** and designed specifically for seamless deployment on **Render** using the official **WhatsApp Cloud API (Meta Graph API v22.0)**.

---

## Overview & Conversational Rules

Bonan Vivon Bot guides prospects through a friendly, respectful, and human dialogue:

1. **Strict Starting Rule**: The bot never initiates conversations or provides the project explanation on its own. A prospect must first type **`Ready`** (case-insensitive). If they type anything else beforehand, the bot politely prompts them to type **`Ready`**.
2. **Name & Location Capture**: The bot gathers the prospect's name and location in a single message (e.g. `Felix — Nairobi` or `My name is Felix and I'm in Kisii`).
3. **Official Project Description**: Introduces the Bonan Vivon Project:
   > *"Bonan Vivon Project is an international non-governmental initiative that shows selected people how to generate cashflow for personal projects and residual income without interest or collateral."*
   *(Zero mention of fees, joining costs, prices, investment figures, or guaranteed profits).*
4. **Location-Based Training Routing**:
   - **Nairobi Prospects**: Offered in-person training at our main offices:
     **Caxton House, 1st Floor, Kenyatta Avenue, Nairobi, near GPO / opposite I&M Building.**
   - **Outside Nairobi Prospects**: Offered an **online training session** without asking them to travel.
   - **Ambiguous Locations**: Politely clarified (*"Are you currently based in Nairobi or outside Nairobi?"*).
5. **Session Confirmation**: Records user confirmation for physical or online orientation slots and updates conversation state.
6. **Reset / Restart**: Typing `reset` or `restart` at any point clears user state and restarts smoothly.

---

## 1. Project Structure

```text
├── server.js               # Render Express server, webhook endpoints, WhatsApp Cloud API sender
├── botLogic.js             # State machine, location classifier, name extractor, persistence
├── conversation_states.json# JSON-based conversation state store
├── package.json            # Node.js dependencies & scripts
├── .env.example            # Template for environment variables
├── README.md               # Complete setup, Render deployment & Meta guide
└── src/                    # Interactive web preview & simulator UI
```

---

## 2. Environment Variables

Create a `.env` file in the project root based on `.env.example`:

```env
PORT=3000
WHATSAPP_TOKEN=your_whatsapp_permanent_access_token
PHONE_NUMBER_ID=your_whatsapp_phone_number_id
VERIFY_TOKEN=your_custom_webhook_verify_token
```

### Variable Details:
| Variable | Description | Where to Obtain |
| :--- | :--- | :--- |
| `PORT` | Listening port for Express (default: `3000`). Automatically set by Render. | Auto-assigned on Render or `3000` locally. |
| `WHATSAPP_TOKEN` | WhatsApp Cloud API System User Access Token with `whatsapp_business_messaging` permission. | Meta for Developers > Business Settings > System Users. |
| `PHONE_NUMBER_ID` | The ID of your registered WhatsApp Business Phone Number. | Meta Developer Dashboard > WhatsApp > API Setup. |
| `VERIFY_TOKEN` | A secret string you choose (e.g. `BonanVivonSecret2026`). | Set your own secret and paste into Meta Webhooks setup. |

> **Security Note**: Never commit your actual `.env` file or hard-code tokens. All secrets are read strictly from environment variables.

---

## 3. Local Installation & Running

### Prerequisites
- Node.js v18.0.0 or higher
- npm v9.0.0 or higher

### Steps:
1. **Clone or download the project** and open the project directory:
   ```bash
   cd bonan-vivon-whatsapp-bot
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create your `.env` file**:
   ```bash
   cp .env.example .env
   ```
   Fill in `WHATSAPP_TOKEN`, `PHONE_NUMBER_ID`, and `VERIFY_TOKEN`.

4. **Start the server locally**:
   ```bash
   npm start
   ```
   The bot server will start on `http://0.0.0.0:3000`.

5. **Verify health check**:
   ```bash
   curl http://localhost:3000/health
   ```
   Expected response:
   ```json
   {
     "ok": true,
     "service": "Bonan Vivon WhatsApp Bot"
   }
   ```

---

## 4. WhatsApp Cloud API Configuration (Meta for Developers)

1. Go to [Meta for Developers](https://developers.facebook.com/) and log in.
2. Create a new App of type **Business**.
3. Under **Add products to your app**, select **WhatsApp** and click **Set up**.
4. In the left sidebar, navigate to **WhatsApp > API Setup**:
   - Note your **Phone number ID**.
   - Copy the temporary access token (for initial testing) or create a **Permanent Access Token** via Meta Business Manager:
     - Go to **Business Settings > Users > System Users**.
     - Add a System User with Admin role.
     - Assign WhatsApp Business Account asset with full control.
     - Generate a token with permissions: `whatsapp_business_management`, `whatsapp_business_messaging`.
5. Under **WhatsApp > Configuration**:
   - You will configure your Callback URL and Verify Token once deployed on Render (see next step).

---

## 5. Deploying to Render (Step-by-Step)

1. Push your repository to **GitHub** or **GitLab**.
2. Log in to [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** and select **Web Service**.
4. Connect your repository.
5. Configure the service settings:
   - **Name**: `bonan-vivon-bot` (or your preferred name)
   - **Environment**: `Node`
   - **Region**: Select your preferred region (e.g. Frankfurt, Oregon, Singapore)
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free or Starter
6. Under **Environment Variables**, add:
   - `PORT`: `3000` *(Render sets this automatically, but defining it is good practice)*
   - `WHATSAPP_TOKEN`: `<your Meta WhatsApp access token>`
   - `PHONE_NUMBER_ID`: `<your Phone Number ID>`
   - `VERIFY_TOKEN`: `<your chosen verification secret string>`
7. Click **Deploy Web Service**.
8. Once deployed, Render will provide your public URL:
   `https://bonan-vivon-bot.onrender.com`

---

## 6. Configuring the WhatsApp Webhook in Meta

Once your Render service is live:

1. In the Meta Developer Console, go to **WhatsApp > Configuration**.
2. In the **Webhook** section, click **Edit**:
   - **Callback URL**:
     ```text
     https://YOUR-RENDER-DOMAIN/webhook
     ```
     *(Example: `https://bonan-vivon-bot.onrender.com/webhook`)*
   - **Verify token**:
     Enter the exact value you set for `VERIFY_TOKEN` in Render.
3. Click **Verify and Save**. Meta will send a `GET` request to your `/webhook` URL with `hub.challenge`. Your server verifies the token and responds with 200 OK.
4. Under **Webhook fields**, click **Manage** and subscribe to **`messages`**.

---

## 7. Webhook Endpoints Reference

### 1. Health Check
- **URL**: `https://YOUR-RENDER-DOMAIN/health`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "ok": true,
    "service": "Bonan Vivon WhatsApp Bot"
  }
  ```

### 2. Webhook Verification (Handled automatically by Meta)
- **URL**: `https://YOUR-RENDER-DOMAIN/webhook`
- **Method**: `GET`
- **Query Parameters**:
  - `hub.mode=subscribe`
  - `hub.verify_token=YOUR_VERIFY_TOKEN`
  - `hub.challenge=CHALLENGE_STRING`
- **Response**: `200 OK` with challenge string body.

### 3. Webhook Receiver
- **URL**: `https://YOUR-RENDER-DOMAIN/webhook`
- **Method**: `POST`
- **Payload**: Standard Meta WhatsApp Cloud API event notification.
- **Response**: `200 OK` (immediately acknowledged, then processed safely).

---

## 8. Testing the Bot

### Testing with cURL:

#### Verify Health:
```bash
curl -X GET https://YOUR-RENDER-DOMAIN/health
```

#### Test Webhook Verification:
```bash
curl -X GET "https://YOUR-RENDER-DOMAIN/webhook?hub.mode=subscribe&hub.verify_token=your_custom_webhook_verify_token&hub.challenge=test_challenge_123"
```

#### Simulate WhatsApp Message POST:
```bash
curl -X POST https://YOUR-RENDER-DOMAIN/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [
      {
        "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
        "changes": [
          {
            "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                "display_phone_number": "15551234567",
                "phone_number_id": "PHONE_NUMBER_ID"
              },
              "contacts": [
                {
                  "profile": { "name": "Felix" },
                  "wa_id": "254712345678"
                }
              ],
              "messages": [
                {
                  "from": "254712345678",
                  "id": "wamid.HBgL...",
                  "timestamp": "1726000000",
                  "type": "text",
                  "text": { "body": "Ready" }
                }
              ]
            },
            "field": "messages"
          }
        ]
      }
    ]
  }'
```

---

## 9. Conversation Flow Diagram

```text
[Incoming Message]
        │
        ├─► "reset" or "restart" ──────► Resets state to NOT_STARTED
        │
        ├─► User is NOT_STARTED
        │         │
        │         ├─► Sends "Ready" ──► Greets warmly, asks for Name & Location
        │         │                     (Moves to WAITING_FOR_DETAILS)
        │         │
        │         └─► Anything else ──► "Welcome to Bonan Vivon Project. To begin, please type Ready."
        │
        ├─► WAITING_FOR_DETAILS
        │         │
        │         ├─► Name & Location provided
        │         │         │
        │         │         ├─► Location is Nairobi (e.g. Westlands, CBD, Karen...)
        │         │         │         └─► Explains project + Invites to Caxton House, Kenyatta Ave.
        │         │         │             (Moves to NAIROBI_TRAINING)
        │         │         │
        │         │         ├─► Location is Outside Nairobi (e.g. Kisumu, Kisii, Mombasa...)
        │         │         │         └─► Explains project + Invites to Online Session.
        │         │         │             (Moves to ONLINE_TRAINING)
        │         │         │
        │         │         └─► Ambiguous Location
        │         │                   └─► Asks: "Are you currently based in Nairobi or outside Nairobi?"
        │         │                       (Moves to WAITING_FOR_LOCATION_CLARIFICATION)
        │         │
        │         └─► Unclear input ──► Politely requests Name and Location together
        │
        ├─► NAIROBI_TRAINING
        │         ├─► "Yes" / Available ──► Confirms slot at Caxton House (Moves to COMPLETED)
        │         └─► "No" / Far ────────► Offers online training option (Moves to ONLINE_TRAINING)
        │
        └─► ONLINE_TRAINING
                  ├─► "Yes" / Available ──► Confirms online slot, notes link will follow (Moves to COMPLETED)
                  └─► "No" ──────────────► Courteous closing (Moves to COMPLETED)
```

---

## 10. Question-Answering Capability (Section 20 Compliance)

The bot natively answers prospect questions at **any point** in the conversation without breaking conversational state or losing progress:

### Core Rules & Principles
1. **Never ignores a question**: When a prospect asks a question, the bot answers the question directly, then gently continues the conversation according to the user's active state.
2. **Strictly No Fabrication**: The bot **only** shares explicitly approved information from project administrators. It never invents claims about profits, registration, owners, products, guarantees, employment, or financial returns.
3. **Guardrail Fallback**: If a prospect asks something unverified (e.g. *"Who owns the company?"*), the bot replies:
   > *"That's a good question. I don't want to give you incorrect information, so I'll have the Bonan Vivon team clarify that for you."*
4. **Context Continuity**:
   - In `WAITING_FOR_DETAILS`, answering a question is immediately followed by prompting for name and location.
   - In `NAIROBI_TRAINING`, answering is followed by prompting for attendance at Caxton House.
   - In `ONLINE_TRAINING`, answering is followed by prompting for availability for the online session.
5. **Approved Knowledge Base**:
   - **What is Bonan Vivon?**: International NGO initiative showing selected individuals how to generate cashflow for personal projects and residual income without interest or collateral.
   - **How does it work?**: Orientation/training first to explain the system; attend physically in Nairobi or online.
   - **Where is training?**: Caxton House, 1st Floor, Kenyatta Avenue, Nairobi (near GPO / opposite I&M Building) or online for those outside Nairobi.
   - **Cost**: The orientation/training is completely free.
   - **Legitimacy**: Legitimate initiative operating openly; attendees evaluate the full system during the training before making decisions.
   - **Earning/Guarantees**: Cashflow depends on project execution; income is not guaranteed.

---

## 11. License

Bonan Vivon Project. All rights reserved.
