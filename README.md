# RVSMPS - Glam Pro AI 💅🤖

[![Anthropic Claude](https://img.shields.io/badge/AI-Anthropic%20Claude%20Sonnet%205.5-7c3aed?style=flat-square&logo=anthropic)](https://anthropic.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Vercel%20%7C%20Cloudflare-black?style=flat-square)](https://rvsmps.store)
[![Status](https://img.shields.io/badge/Status-Pilot%20in%20Progress-blue?style=flat-square)](https://rvsmps.store)

> **Next-generation autonomous salon, spa, and wellness operating system powered by the Anthropic Claude API.** RVSMPS Glam Pro automates multi-turn client bookings, double-booking prevention, GST POS billing, staff commissions, and multi-branch franchise operations.

---

## 🌐 Live Deployments

- **Live Production Platform**: [https://rvsmps.store](https://rvsmps.store) (and [https://www.rvsmps.store](https://www.rvsmps.store))
- **Pilot Client Deployment**: [https://sheglam.rvsmps.store](https://sheglam.rvsmps.store) *(She GLAM Salon & Academy — Pilot in Progress)*
- **Administrative Portal**: [https://rvsmps.store/login](https://rvsmps.store/login)
- **Legal & Compliance**: [Privacy Policy](https://rvsmps.store/privacy) • [Terms of Service](https://rvsmps.store/terms)
- **Official Inquiries**: `contact@rvsmps.store`

---

## 📊 Feature Status: Live Today vs Roadmap

| Capability | Status | Description |
|------------|--------|-------------|
| **Visual Appointment Matrix** | 🟢 **Live in Production** | Interactive calendar with real-time double-booking prevention and stylist chair allocation. |
| **Instant POS & GST Invoicing** | 🟢 **Live in Production** | Sub-second billing with auto GST calculation (CGST+SGST), custom payments, and digital receipts. |
| **Multi-Branch Operations & RBAC** | 🟢 **Live in Production** | Multi-tier permissions (`RV Owner`, `Center Admin`, `Manager`, `Receptionist`) with staff commission tracking. |
| **Claude AI Receptionist API** | 🟢 **Live in Production** | REST API (`/api/ai/receptionist`) powered by Claude Sonnet 5.5 with multi-turn tool calling (up to 5 rounds), persistent MongoDB sessions, server-side center verification, and multi-slot rechecking. |
| **Interactive Showcase Demo** | 🟢 **Live on Website** | Illustrative multi-turn dialogue simulator showcasing Claude tool use and booking flows. |
| **Meta WhatsApp Cloud API Relay** | 🟡 **In Development / Pilot Roadmap** | Webhook verification and HMAC-SHA256 signature verification implemented and tested. Bidirectional message relay awaiting Meta business verification. |
| **Automated Outbound Retention Campaigns** | 🟡 **In Development / Pilot Roadmap** | Periodic service recall notifications and VIP re-engagement broadcasts. |

---

## 💡 Why Anthropic Claude Sonnet 5.5?

Salons and spas face intense booking contention during peak hours, while front-desk staff juggle walk-in clients, phone calls, and checkout queues.

RVSMPS Glam Pro integrates **Anthropic Claude Sonnet 5.5 (`claude-sonnet-5-5`)** as an autonomous front-desk receptionist:

1. **Multi-Turn Tool Calling**: Claude inspects live service menus (`list_services`), verifies available calendar slots accounting for duration (`check_availability`), reserves confirmed slots with atomic double-booking prevention (`create_appointment`), and manages confirmed cancellations (`cancel_appointment`).
2. **Deterministic Center Tenancy**: All tool operations are server-side scoped to verified salon centers via public widget keys or authenticated center IDs.
3. **Session Continuity**: Multi-turn conversation history is persisted in MongoDB with automatic 24-hour TTL expiration, history slicing guarantees, and per-session turn capping (max 25 turns) to prevent token abuse.
4. **Resilient Availability**: Built-in slot rechecking and MongoDB unique partial indexing ensure concurrent race conditions are caught and rejected gracefully.

---

## 🏗️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT / GUEST TOUCHPOINTS                     │
│  • Public Web Platform (https://rvsmps.store)                          │
│  • Client Booking Web Portal (https://sheglam.rvsmps.store)            │
│  • Meta WhatsApp Webhook Gateway (/api/whatsapp/webhook)               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (Strict Rate Limited)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    INTELLIGENCE & BACKEND SERVICES                     │
│                                                                        │
│   ┌────────────────────────┐         ┌─────────────────────────────┐   │
│   │  Anthropic Claude API  │ ◄─────► │  Node.js / Express Gateway  │   │
│   │  (Claude Sonnet 5.5)   │         │  • Trust Proxy & Rate Limit │   │
│   │  • Multi-Turn Tool Use │         │  • Server-Side Center Auth  │   │
│   │  • Up to 5 Rounds Loop │         │  • Double-Booking Engine    │   │
│   │  • Structured Outputs  │         │  • GST Invoicing & POS      │   │
│   └────────────────────────┘         └──────────────┬──────────────┘   │
│                                                     │                  │
│                                                     ▼                  │
│                                      ┌─────────────────────────────┐   │
│                                      │     MongoDB Database        │   │
│                                      │  • Centers & Services       │   │
│                                      │  • Appointments (Indexed)   │   │
│                                      │  • AiSessions (TTL 24h)     │   │
│                                      └─────────────────────────────┘   │
└─────────────────────────────────────────────────────┬──────────────────┘
                                                      │
                                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    ADMINISTRATION & OPERATIONS SUITE                   │
│  • React 18 / Vite Dashboard (https://rvsmps.store/dashboard)          │
│  • Visual Stylist Chair & Appointment Scheduler                       │
│  • Multi-branch Revenue Analytics & Automated Staff Commissions        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Repository Structure

```text
Raja-priya/
├── LICENSE                            # MIT License
├── README.md                          # Technical overview & architecture
└── Rajapriya-main/
    ├── package.json                   # Root workspace scripts
    ├── admin/                         # Frontend Single Page App
    │   ├── index.html                 # Open Graph, Twitter & SEO metadata
    │   ├── package.json               # Frontend dependencies & scripts
    │   ├── vite.config.js             # Vite production bundler config
    │   └── src/
    │       ├── App.jsx                # Router (/dashboard, /login, /privacy, /terms)
    │       ├── pages/
    │       │   ├── LandingPage.jsx    # Public showcase, interactive demo & about
    │       │   ├── Login.jsx          # Secure employee / admin sign-in
    │       │   ├── Dashboard.jsx      # Salon executive KPI dashboard
    │       │   ├── Appointments.jsx   # Visual appointment calendar
    │       │   ├── Billing.jsx        # POS & GST invoice generator
    │       │   ├── PrivacyPolicy.jsx  # Legal privacy disclosures
    │       │   └── TermsOfService.jsx # Terms of service & service agreements
    │       └── context/               # AuthContext & state providers
    └── backend/                       # REST API & Claude AI Engine
        ├── server.js                  # Express app, helmet, trust proxy, rate limiters
        ├── .env.example               # Documented environment template
        ├── models/
        │   ├── AiSession.js           # Conversation session model with 24h TTL
        │   ├── Appointment.js         # Appointment schema with compound index
        │   ├── Center.js              # Multi-branch salon configuration & GST
        │   ├── Service.js             # Salon service catalog & pricing
        │   ├── Staff.js               # Staff roles & commission rates
        │   └── User.js                # Authenticated users & RBAC
        ├── routes/
        │   ├── ai.js                  # Claude receptionist agent & tool execution loop
        │   ├── whatsapp.js            # Meta webhook with HMAC-SHA256 signature check
        │   ├── appointments.js        # Appointment CRUD & calendar feed
        │   ├── billing.js             # Server-side GST invoice creation
        │   └── auth.js                # JWT authentication & session issuance
        └── __tests__/
            └── api.test.js            # Comprehensive Jest / Supertest test suite
```

---

## 💻 Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm or yarn
- MongoDB Atlas or local MongoDB instance
- Anthropic API Key (from [Anthropic Console](https://console.anthropic.com/))

### 1. Backend Setup

```bash
cd Rajapriya-main/backend
cp .env.example .env
# Edit .env with your MONGO_URI, JWT_SECRET, and ANTHROPIC_API_KEY
npm install
npm test
npm start
```

### 2. Frontend Setup

```bash
cd Rajapriya-main/admin
npm install
npm run dev
```

Visit `http://localhost:5173` to view the local development application.

---

## 🧪 Testing & Quality Assurance

The backend includes a comprehensive Jest test suite verifying:
- Root API health
- Meta WhatsApp webhook verification & HMAC-SHA256 signature enforcement
- Server-side center resolution and tenant isolation
- Service unavailability (503) handling when Claude credentials are absent
- Multi-turn Claude tool execution loops (mocked Anthropic client)
- Session turn caps and MongoDB TTL session persistence

Run tests locally:
```bash
cd Rajapriya-main/backend
npm test
```

---

## 🔒 Security & Privacy

- **Zero Secrets in Repository**: All sensitive credentials (`ANTHROPIC_API_KEY`, `JWT_SECRET`, `WHATSAPP_APP_SECRET`) are injected via production environment variables.
- **Reverse Proxy Protection**: `app.set('trust proxy', 1)` enables accurate IP-based rate limiting behind Vercel and Cloudflare.
- **Strict Endpoint Limiting**: Global API rate limiter + strict authentication limiter + dedicated AI limiter (30 queries/15m) protect against token exhaustion and DDoS.
- **Data Protection Compliance**: Audit logs mask client phone numbers (`+9198****3210`) to safeguard customer privacy under applicable data protection regulations.

---

## 📄 License & Attribution

Distributed under the MIT License. Developed and maintained by **RVSMPS Technologies**.  
Built with ❤️ using **Anthropic Claude AI**.
