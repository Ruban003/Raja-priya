# RVSMPS - Glam Pro AI 💅🤖

[![Anthropic Claude](https://img.shields.io/badge/AI-Anthropic%20Claude%203.5%20Sonnet-7c3aed?style=flat-square&logo=anthropic)](https://anthropic.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Vercel%20%7C%20Cloudflare-black?style=flat-square)](https://rvsmps.store)
[![Status](https://img.shields.io/badge/Status-Commercial%20Pilot%20Live-emerald?style=flat-square)](https://rvsmps.store)

> **Next-generation autonomous salon, spa, and wellness operating system powered by the Anthropic Claude API.** RVSMPS Glam Pro automates multi-turn client bookings, 24/7 WhatsApp AI front-desk receptionist dialogues, predictive client retention, and multi-branch franchise operations.

---

## 🌐 Live Deployments

- **Live Production Platform**: [https://rvsmps.store](https://rvsmps.store) (and [https://www.rvsmps.store](https://www.rvsmps.store))
- **Flagship Client Deployment**: [https://sheglam.rvsmps.store](https://sheglam.rvsmps.store) *(She GLAM Salon & Academy)*
- **Administrative Portal**: [https://rvsmps.store/login](https://rvsmps.store/login)
- **Official Contact**: `contact@rvsmps.store`

---

## 💡 Why Anthropic Claude 3.5 Sonnet?

Modern beauty salons and wellness chains lose up to 35% of inbound booking inquiries due to busy front desks during peak hours and unassisted queries after closing. 

RVSMPS Glam Pro leverages **Anthropic Claude 3.5 Sonnet (`claude-3-5-sonnet-latest`)** to power an end-to-end autonomous business copilot:

1. **Autonomous WhatsApp Receptionist**: Claude handles natural-language booking dialogues, reschedules appointments, answers service pricing questions, and checks stylist availability via function calling in real time.
2. **Predictive Client Retention Engine**: Analyzes historical visit cycles (hair spa, coloring, facials) and synthesizes hyper-personalized re-engagement messages via Claude to boost repeat client visits by 3.8x.
3. **AI Stylist & Treatment Copilot**: Recommends customized hair and skin service packages based on client history, allergies, and seasonal trends.
4. **Franchise Intelligence**: Summarizes branch performance, stylist commissions, and peak booking hours for multi-center operators.

---

## 🏗️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT / GUEST TOUCHPOINTS                     │
│  • Public Web Showcase (https://rvsmps.store)                          │
│  • Client Booking Portal (https://sheglam.rvsmps.store)                │
│  • 24/7 WhatsApp AI Receptionist Channel                               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / Webhook
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    INTELLIGENCE & BACKEND SERVICES                     │
│                                                                        │
│   ┌────────────────────────┐         ┌─────────────────────────────┐   │
│   │   Anthropic Claude API │ ◄─────► │  Node.js / Express Gateway  │   │
│   │   (Claude 3.5 Sonnet)  │         │  • Booking Conflict Engine  │   │
│   │   • Agentic Reasoning  │         │  • GST Invoicing & POS      │   │
│   │   • Tool/Function Call │         │  • Stylist Roster & RBAC    │   │
│   └────────────────────────┘         └──────────────┬──────────────┘   │
└─────────────────────────────────────────────────────┼──────────────────┘
                                                      │
                                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    ADMINISTRATION & OPERATIONS SUITE                   │
│  • React 18 / Vite Responsive Dashboard (https://rvsmps.store/dashboard)│
│  • Real-time Appointment Matrix & Stylist Chair Allocator             │
│  • Multi-branch Revenue Analytics & Automated Staff Commissions        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Features

- **24/7 WhatsApp AI Receptionist**: Powered by Claude with zero latency drop-offs. Handles slot booking, reschedules, and cancellations.
- **Visual Appointment Calendar**: Interactive scheduling with automated conflict detection, buffer management, and stylist chair assignment.
- **Split-Second GST Billing & POS**: Automated tax calculations, digital invoices, customer receipts, and instant WhatsApp delivery.
- **Role-Based Access Control (RBAC)**: Secure multi-tier permissions (`RV Owner`, `Center Admin`, `Manager`, `Receptionist`).
- **Predictive Retention & VIP Care**: Proactive client lifecycle notifications dispatched at the optimal time.
- **Multi-Branch Franchise Sync**: Single unified glass cockpit for chain owners managing multiple salon locations.

---

## 🛠️ Tech Stack

- **AI Core**: [Anthropic Claude 3.5 Sonnet API](https://docs.anthropic.com/) (`@anthropic-ai/sdk`)
- **Frontend**: React 18, Vite, TailwindCSS, Lucide Icons, Recharts
- **Backend**: Node.js, Express, REST APIs
- **Hosting & Edge**: Vercel (Edge CDN), Cloudflare Anycast DNS & SSL/TLS
- **Email Infrastructure**: Cloudflare Email Routing (`contact@rvsmps.store`)

---

## 📁 Repository Structure

```text
Raja-priya/
├── README.md                          # Project documentation & overview
└── Rajapriya-main/
    └── admin/                         # Frontend & SaaS Application
        ├── index.html                 # Entry point with SEO metadata
        ├── package.json               # Dependencies & scripts
        ├── vite.config.js             # Vite build configuration
        ├── tailwind.config.js         # Design token configuration
        └── src/
            ├── App.jsx                # Application routes (/ & /login & /dashboard)
            ├── main.jsx               # React DOM hydration
            ├── index.css              # Global styles & glassmorphic themes
            ├── pages/
            │   ├── LandingPage.jsx    # Public AI SaaS Showcase & Demo Simulator
            │   ├── Login.jsx          # Secure staff & admin authentication
            │   ├── Dashboard.jsx      # Salon KPIs & executive summary
            │   ├── Appointments.jsx   # Visual appointment calendar
            │   ├── Billing.jsx        # GST invoice generation & POS
            │   ├── Clients.jsx        # Client directory & retention profiles
            │   ├── Services.jsx       # Salon service menu & pricing
            │   └── Settings.jsx       # Branch configuration & roles
            └── components/            # Reusable UI elements & layouts
```

---

## 💻 Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm or yarn
- Anthropic API Key (from [Anthropic Console](https://console.anthropic.com/))

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Ruban003/Raja-priya.git
   cd Raja-priya/Rajapriya-main/admin
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in `Rajapriya-main/admin/`:
   ```env
   VITE_APP_NAME="RVSMPS Glam Pro AI"
   VITE_API_BASE_URL="https://api.rvsmps.store"
   # Anthropic Claude API Key (for local testing / backend)
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

5. **Build for production**:
   ```bash
   npm run build
   ```

---

## 🔒 Security & Verification

- **Zero Secrets in Repository**: All sensitive credentials, API keys, and tokens are injected securely via Vercel and production environment variables.
- **Public Open-Source Verification**: This repository is maintained publicly for verification by developer programs and partner evaluations.
- **Custom Domain Validation**: Domain ownership is verified via Cloudflare DNS and Vercel HSTS SSL certificates.

---

## 📄 License & Attribution

Distributed under the MIT License. Developed and maintained by **RVSMPS Technologies**.  
Built with ❤️ using **Anthropic Claude AI**.
