import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('receptionist');

  const simulatedChats = {
    receptionist: [
      { sender: 'user', text: 'Hi! Do you have an open slot for a Hair Botox treatment this Saturday afternoon?' },
      { sender: 'ai', text: 'Hello Priya! ✨ We have an opening at 2:30 PM this Saturday with Master Stylist Anita at our main salon. The session takes ~90 mins. Would you like me to book this for you?' },
      { sender: 'user', text: 'Yes please, book that slot for me!' },
      { sender: 'ai', text: 'Done! Your appointment is reserved for Saturday at 2:30 PM. A calendar invite and prep guide have been sent. See you then! 💇‍♀️' }
    ],
    retention: [
      { sender: 'ai', text: 'Hi Anitha! It has been 5 weeks since your Keratin Silk treatment. Our AI health tracker recommends a nourishing scalp spa this week to maintain shine. We have a 15% VIP offer for you!' },
      { sender: 'user', text: 'Oh wow, that is thoughtful timing! Can I come tomorrow at 5 PM?' },
      { sender: 'ai', text: 'You are all set for tomorrow at 5:00 PM with your 15% VIP loyalty discount applied. Looking forward to pampering you!' }
    ],
    consultation: [
      { sender: 'user', text: 'I have dry, chemically treated hair and sensitive skin. Which facial and hair combo is safe for me?' },
      { sender: 'ai', text: 'Based on your profile, Claude recommends our Organic Hydrating Facial paired with the Herbal Protein Moisture Infusion. Both are 100% ammonia and paraben free.' }
    ]
  };

  return (
    <div className="landing-root">
      {/* Top Ambient Glows */}
      <div className="glow-sphere glow-1" />
      <div className="glow-sphere glow-2" />

      {/* Navigation Bar */}
      <header className="landing-header">
        <div className="landing-nav-container">
          <div className="landing-brand">
            <div className="brand-badge-icon">RV</div>
            <div className="brand-text-block">
              <span className="brand-title">RVSMPS</span>
              <span className="brand-tag">GLAM PRO AI</span>
            </div>
          </div>

          <nav className="landing-nav-links">
            <a href="#features">AI Features</a>
            <a href="#simulator">Live Agent Demo</a>
            <a href="#architecture">Architecture</a>
            <a href="https://github.com/Ruban003/Raja-priya" target="_blank" rel="noopener noreferrer" className="github-nav-link">
              <span>GitHub</span>
              <span className="gh-badge">v2.0</span>
            </a>
          </nav>

          <div className="landing-header-actions">
            {user ? (
              <Link to="/dashboard" className="btn-glow-primary">
                <span>Open Dashboard</span>
                <span>&rarr;</span>
              </Link>
            ) : (
              <div className="auth-btn-group">
                <Link to="/login" className="btn-glass-subtle">
                  <span>Sign In</span>
                </Link>
                <a href="#simulator" className="btn-glow-primary">
                  <span>Explore Demo</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="anthropic-badge">
            <span className="anthropic-sparkle">✦</span>
            <span>BUILT WITH ANTHROPIC CLAUDE 3.5 SONNET & CLAUDE API</span>
          </div>

          <h1 className="hero-headline">
            The Autonomous AI Operating System for <span className="gradient-text">Salons, Spas & Wellness Chains</span>
          </h1>

          <p className="hero-subhead">
            RVSMPS Glam Pro automates client bookings, 24/7 WhatsApp AI receptionist dialogues, 
            predictive client retention, and multi-branch operations with intelligent Claude agents.
          </p>

          <div className="hero-cta-group">
            <a href="#simulator" className="btn-hero-primary">
              <span>Test AI Receptionist</span>
              <span>&rarr;</span>
            </a>
            <a 
              href="https://github.com/Ruban003/Raja-priya" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-hero-secondary"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              <span>View Open Source Repo</span>
            </a>
            <Link to="/login" className="btn-hero-tertiary">
              <span>Portal Sign In</span>
            </Link>
          </div>

          <div className="hero-metrics-bar">
            <div className="metric-box">
              <div className="metric-val">99.4%</div>
              <div className="metric-lbl">Booking Intent Accuracy</div>
            </div>
            <div className="metric-divider" />
            <div className="metric-box">
              <div className="metric-val">&lt; 1.2s</div>
              <div className="metric-lbl">Claude API Response Time</div>
            </div>
            <div className="metric-divider" />
            <div className="metric-box">
              <div className="metric-val">3.8x</div>
              <div className="metric-lbl">Client Retention Lift</div>
            </div>
            <div className="metric-divider" />
            <div className="metric-box">
              <div className="metric-val">100%</div>
              <div className="metric-lbl">Multi-Branch Sync</div>
            </div>
          </div>
        </div>
      </section>

      {/* Live AI Agent Interactive Simulator */}
      <section className="landing-simulator-section" id="simulator">
        <div className="landing-section-header">
          <span className="section-eyebrow">INTERACTIVE AGENT DEMO</span>
          <h2>Autonomous Customer Dialogue Powered by Claude</h2>
          <p>See how our integrated Claude 3.5 Sonnet agent handles natural, multi-turn appointment scheduling and client consultations.</p>
        </div>

        <div className="simulator-card">
          <div className="simulator-tabs">
            <button 
              className={`sim-tab ${activeTab === 'receptionist' ? 'active' : ''}`}
              onClick={() => setActiveTab('receptionist')}
            >
              <span>🤖 WhatsApp Receptionist</span>
            </button>
            <button 
              className={`sim-tab ${activeTab === 'retention' ? 'active' : ''}`}
              onClick={() => setActiveTab('retention')}
            >
              <span>📈 Smart Retention Follow-Up</span>
            </button>
            <button 
              className={`sim-tab ${activeTab === 'consultation' ? 'active' : ''}`}
              onClick={() => setActiveTab('consultation')}
            >
              <span>✨ AI Stylist Consultation</span>
            </button>
          </div>

          <div className="simulator-window">
            <div className="sim-window-header">
              <div className="sim-avatar">✦</div>
              <div>
                <div className="sim-agent-name">Glam Pro AI Assistant</div>
                <div className="sim-agent-status">Powered by Claude 3.5 Sonnet • Online</div>
              </div>
            </div>

            <div className="sim-chat-body">
              {simulatedChats[activeTab].map((msg, idx) => (
                <div key={idx} className={`chat-bubble-row ${msg.sender === 'user' ? 'user-row' : 'ai-row'}`}>
                  {msg.sender === 'ai' && <div className="chat-avatar-ai">✦</div>}
                  <div className={`chat-bubble ${msg.sender === 'user' ? 'bubble-user' : 'bubble-ai'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="sim-footer-bar">
              <input 
                type="text" 
                readOnly 
                value="Simulated AI dialogue based on Anthropic API function calling" 
                className="sim-input-mock"
              />
              <span className="sim-tag-live">LIVE MOCKUP</span>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="landing-features-section" id="features">
        <div className="landing-section-header">
          <span className="section-eyebrow">INTELLIGENT SUITE</span>
          <h2>Enterprise Salon Operations Reimagined with AI</h2>
          <p>Full-stack salon and spa automation engineered for single boutique studios and 50+ branch franchises.</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-box">💬</div>
            <h3>Claude WhatsApp Receptionist</h3>
            <p>
              Autonomous 24/7 client booking, cancellations, slot rescheduling, and answers to pricing inquiries without requiring front-desk staff.
            </p>
            <div className="feature-code-tag">model: claude-3-5-sonnet-20241022</div>
          </div>

          <div className="feature-card">
            <div className="feature-icon-box">🧠</div>
            <h3>Predictive Retention Engine</h3>
            <p>
              Analyzes historical service cadences and client preferences to dispatch automated, personalized WhatsApp VIP reminders right when roots or treatments need refresh.
            </p>
            <div className="feature-code-tag">Prompt: Client Lifecycle Optimization</div>
          </div>

          <div className="feature-card">
            <div className="feature-icon-box">📅</div>
            <h3>Smart Calendar & Overlap Dispatch</h3>
            <p>
              Dynamic visual calendar with automatic double-booking prevention, stylist chair allocation, and real-time appointment status tracking.
            </p>
            <div className="feature-code-tag">Conflict Detection Algorithm</div>
          </div>

          <div className="feature-card">
            <div className="feature-icon-box">🧾</div>
            <h3>Instant GST Invoicing & Billing</h3>
            <p>
              Split-second billing with automated GST calculation, digital receipts, custom payment methods, and automated WhatsApp delivery.
            </p>
            <div className="feature-code-tag">Fast Point-of-Sale</div>
          </div>

          <div className="feature-card">
            <div className="feature-icon-box">👥</div>
            <h3>Staff Commissions & Role Governance</h3>
            <p>
              Granular role-based access control (RBAC) across RV Owner, Center Admin, and Managers with real-time staff commission calculations.
            </p>
            <div className="feature-code-tag">RBAC Security Architecture</div>
          </div>

          <div className="feature-card">
            <div className="feature-icon-box">📊</div>
            <h3>Multi-Center Franchise Analytics</h3>
            <p>
              Consolidated real-time reports on daily revenue, top-performing stylists, popular beauty services, and churn analytics.
            </p>
            <div className="feature-code-tag">Aggregated Metric Pipelines</div>
          </div>
        </div>
      </section>

      {/* Tech Stack & Architecture */}
      <section className="landing-tech-section" id="architecture">
        <div className="landing-section-header">
          <span className="section-eyebrow">SYSTEM ARCHITECTURE</span>
          <h2>Built for Scalability & Extreme Reliability</h2>
          <p>Engineered with modern cloud infrastructure, edge acceleration, and Anthropic's developer ecosystem.</p>
        </div>

        <div className="architecture-grid">
          <div className="arch-card">
            <div className="arch-title">AI & Intelligence Layer</div>
            <p>Anthropic Claude API (Claude 3.5 Sonnet) for high-precision natural language understanding and multi-turn agentic workflows.</p>
            <div className="arch-pill">Anthropic SDK</div>
          </div>
          <div className="arch-card">
            <div className="arch-title">Application Engine</div>
            <p>Vite + React 18 frontend with Recharts visualization, paired with Node.js and Express REST services.</p>
            <div className="arch-pill">React 18 / Node.js</div>
          </div>
          <div className="arch-card">
            <div className="arch-title">Global Edge & DNS</div>
            <p>Cloudflare Anycast DNS with automated SSL/TLS termination, DDoS protection, and Vercel edge deployment.</p>
            <div className="arch-pill">Cloudflare / Vercel</div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="landing-cta-banner">
        <div className="cta-box">
          <h2>Ready to Transform Your Salon with Claude AI?</h2>
          <p>Join forward-thinking salons running their front desk, marketing, and operations autonomously with Glam Pro.</p>
          <div className="cta-action-row">
            <a href="mailto:contact@rvsmps.store" className="btn-glow-primary">
              <span>Contact Our Team (contact@rvsmps.store)</span>
            </a>
            <Link to="/login" className="btn-glass-subtle">
              <span>Portal Sign In</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-container">
          <div className="footer-col-main">
            <div className="landing-brand">
              <div className="brand-badge-icon">RV</div>
              <div className="brand-text-block">
                <span className="brand-title">RVSMPS</span>
                <span className="brand-tag">GLAM PRO AI</span>
              </div>
            </div>
            <p className="footer-tagline">
              Autonomous AI Operating System for modern beauty salons, luxury spas, and wellness chains.
            </p>
            <p className="footer-contact-info">
              Contact: <strong>contact@rvsmps.store</strong> | Domain: <strong>rvsmps.store</strong>
            </p>
          </div>

          <div className="footer-col-links">
            <h4>Product</h4>
            <a href="#features">AI Features</a>
            <a href="#simulator">Agent Demo</a>
            <a href="#architecture">Architecture</a>
          </div>

          <div className="footer-col-links">
            <h4>Developers</h4>
            <a href="https://github.com/Ruban003/Raja-priya" target="_blank" rel="noopener noreferrer">GitHub Repository</a>
            <a href="https://docs.anthropic.com/" target="_blank" rel="noopener noreferrer">Anthropic Docs</a>
            <Link to="/login">Portal Login</Link>
          </div>

          <div className="footer-col-links">
            <h4>Company</h4>
            <span>RVSMPS Technologies</span>
            <span>Founded: 2024</span>
            <span>Status: Verified Startup</span>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <p>© 2026 RVSMPS Technologies. All rights reserved. Powered by Anthropic Claude.</p>
          <div className="footer-bottom-links">
            <a href="https://github.com/Ruban003/Raja-priya" target="_blank" rel="noopener noreferrer">Open Source License</a>
            <Link to="/login">Employee Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
