import React, { useState, useEffect, useRef } from 'react';

// Clean SVG vector icons (anti-emoji, anti-vibe)
const IconRadio = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="2"></circle>
    <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path>
  </svg>
);

const IconShield = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

const IconClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const IconCpu = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2"></rect>
    <rect x="9" y="9" width="6" height="6"></rect>
    <line x1="9" y1="1" x2="9" y2="4"></line>
    <line x1="15" y1="1" x2="15" y2="4"></line>
    <line x1="9" y1="20" x2="9" y2="23"></line>
    <line x1="15" y1="20" x2="15" y2="23"></line>
    <line x1="20" y1="9" x2="23" y2="9"></line>
    <line x1="20" y1="14" x2="23" y2="14"></line>
    <line x1="1" y1="9" x2="4" y2="9"></line>
    <line x1="1" y1="14" x2="4" y2="14"></line>
  </svg>
);

const IconPlay = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const IconPause = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16"></rect>
    <rect x="14" y="4" width="4" height="16"></rect>
  </svg>
);

const SCENARIOS = [
  {
    id: 1,
    channel: 'WhatsApp Ingestion',
    channelColor: '#10b981',
    customer: 'Priya S.',
    message: 'Can I book a 90m Hair Botox with Anita on Saturday at 2:30 PM?',
    timeString: '14:32:04',
    service: 'Hair Botox Intensive',
    duration: '90 mins',
    stylist: 'Anita (Master Stylist)',
    chairId: 1,
    timeRange: '14:30 - 16:00',
    parsedTokens: 112,
    latencyMs: 780,
    concurrencyStatus: 'Parallel slot allocated (Chair 01 locked)',
    auditLog: 'Atomic index verified: No conflict detected for Chair 01.'
  },
  {
    id: 2,
    channel: 'WhatsApp Ingestion',
    channelColor: '#10b981',
    customer: 'Deepa M.',
    message: 'Can I also get a Keratin Silk treatment at 2:30 PM on Saturday?',
    timeString: '14:32:16',
    service: 'Keratin Silk Infusion',
    duration: '120 mins',
    stylist: 'Sunita (Senior Stylist)',
    chairId: 2,
    timeRange: '14:30 - 16:30',
    parsedTokens: 128,
    latencyMs: 740,
    concurrencyStatus: 'Parallel routing: Chair 01 busy -> Chair 02 reserved',
    auditLog: 'Concurrency check passed: Simultaneous appointment booked without overlap.'
  },
  {
    id: 3,
    channel: 'Web Widget',
    channelColor: '#38bdf8',
    customer: 'Kavitha R.',
    message: 'Looking for an Organic Hydrating Facial tomorrow at 4:00 PM.',
    timeString: '14:32:29',
    service: 'Organic Hydrating Facial',
    duration: '60 mins',
    stylist: 'Maya (Aesthetician)',
    chairId: 3,
    timeRange: '16:00 - 17:00',
    parsedTokens: 96,
    latencyMs: 810,
    concurrencyStatus: 'Skin Clinic Suite allocated (Chair 03 locked)',
    auditLog: 'Buffer rule applied: 15-min sanitizer turnaround preserved.'
  },
  {
    id: 4,
    channel: 'Reception Sync',
    channelColor: '#f59e0b',
    customer: 'Sneha V.',
    message: 'Nail Gel Extensions and Art consultation for 3:00 PM.',
    timeString: '14:32:41',
    service: 'Nail Gel Art Suite',
    duration: '60 mins',
    stylist: 'Divya (Nail Artist)',
    chairId: 4,
    timeRange: '15:00 - 16:00',
    parsedTokens: 104,
    latencyMs: 765,
    concurrencyStatus: 'All 4 Stations Active: 100% capacity utilization',
    auditLog: 'Floor telemetry: 4 simultaneous chairs operating without collision.'
  }
];

const CHAIRS = [
  { id: 1, name: 'Chair 01: Hair Studio', specialist: 'Anita (Master)', defaultService: 'Hair Botox', time: '14:30 - 16:00', widthPercent: 68 },
  { id: 2, name: 'Chair 02: Color & Keratin', specialist: 'Sunita (Senior)', defaultService: 'Keratin Silk', time: '14:30 - 16:30', widthPercent: 82 },
  { id: 3, name: 'Chair 03: Skin & Facial', specialist: 'Maya (Aesthetician)', defaultService: 'Hydrating Facial', time: '16:00 - 17:00', widthPercent: 55 },
  { id: 4, name: 'Chair 04: Nail Art Lounge', specialist: 'Divya (Specialist)', defaultService: 'Nail Extensions', time: '15:00 - 16:00', widthPercent: 50 }
];

export default function HeroCapacityVisualizer() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [pulseActive, setPulseActive] = useState(false);
  const timerRef = useRef(null);

  const scenario = SCENARIOS[currentIdx];

  // Auto-advance cycle every 6.5 seconds
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setPulseActive(true);
      setTimeout(() => setPulseActive(false), 600);
      setCurrentIdx((prev) => (prev + 1) % SCENARIOS.length);
    }, 6500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  const handleSelectScenario = (idx) => {
    setPulseActive(true);
    setTimeout(() => setPulseActive(false), 500);
    setCurrentIdx(idx);
  };

  const handleNext = () => {
    handleSelectScenario((currentIdx + 1) % SCENARIOS.length);
  };

  return (
    <div className="capacity-visualizer-container">
      {/* Visualizer Header Bar */}
      <div className="capacity-header-bar">
        <div className="capacity-status-indicator">
          <span className="capacity-live-dot" />
          <span className="capacity-badge-title">LIVE CAPACITY ORCHESTRATION ENGINE</span>
          <span className="capacity-mono-metric">SYSTEM: 100% CONFLICT-FREE</span>
        </div>
        <div className="capacity-header-controls">
          <div className="scenario-step-pills">
            {SCENARIOS.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => handleSelectScenario(idx)}
                className={`step-pill ${currentIdx === idx ? 'active' : ''}`}
                title={`Event 0${s.id}: ${s.service}`}
              >
                0{s.id}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="capacity-toggle-btn"
            title={isPlaying ? 'Pause Auto-Rotation' : 'Resume Auto-Rotation'}
          >
            {isPlaying ? <IconPause /> : <IconPlay />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
        </div>
      </div>

      {/* 3-Column Bento Grid */}
      <div className="capacity-grid-layout">
        {/* Column 1: Live Stream Ingestion */}
        <div className="capacity-card stream-card">
          <div className="card-header-clean">
            <div className="card-label-row">
              <span className="card-subhead-mono">REAL-TIME INGESTION</span>
              <span className="channel-badge" style={{ borderColor: scenario.channelColor, color: scenario.channelColor }}>
                <IconRadio />
                {scenario.channel}
              </span>
            </div>
            <span className="stream-timestamp">UTC+5:30 [ {scenario.timeString} ]</span>
          </div>

          <div className="customer-request-bubble">
            <div className="customer-meta">
              <span className="customer-avatar">{scenario.customer.charAt(0)}</span>
              <div>
                <span className="customer-name-bold">{scenario.customer}</span>
                <span className="customer-verified-tag">Client via Meta WhatsApp API</span>
              </div>
            </div>
            <p className="customer-msg-text">"{scenario.message}"</p>
          </div>

          <div className="claude-dispatch-block">
            <div className="dispatch-header">
              <span className="dispatch-tag">
                <IconCpu />
                <span>Claude Function Calling Pipeline</span>
              </span>
              <span className="latency-indicator">{scenario.latencyMs}ms</span>
            </div>
            <div className="extracted-params-grid">
              <div className="param-item">
                <span className="param-k">Parsed Service</span>
                <span className="param-v">{scenario.service}</span>
              </div>
              <div className="param-item">
                <span className="param-k">Duration</span>
                <span className="param-v text-highlight">{scenario.duration}</span>
              </div>
              <div className="param-item">
                <span className="param-k">Allocated Stylist</span>
                <span className="param-v">{scenario.stylist}</span>
              </div>
              <div className="param-item">
                <span className="param-k">Atomic Window</span>
                <span className="param-v text-cyan">{scenario.timeRange}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Live Salon Floor Concurrency Matrix */}
        <div className="capacity-card floor-card">
          <div className="card-header-clean">
            <div>
              <span className="card-subhead-mono">FLOOR CONCURRENCY MATRIX</span>
              <h4 className="floor-card-title">Simultaneous Station Capacity</h4>
            </div>
            <span className="station-count-pill">4 Stations Monitored</span>
          </div>

          <div className="timeline-axis">
            <span>12:00 PM</span>
            <span>14:00 PM</span>
            <span>16:00 PM</span>
            <span>18:00 PM</span>
          </div>

          <div className="chairs-matrix-list">
            {CHAIRS.map((chair) => {
              const isTargetChair = scenario.chairId === chair.id;
              return (
                <div
                  key={chair.id}
                  className={`chair-row ${isTargetChair ? 'active-target' : ''}`}
                >
                  <div className="chair-row-header">
                    <div>
                      <span className="chair-name">{chair.name}</span>
                      <span className="chair-stylist-sub">{chair.specialist}</span>
                    </div>
                    {isTargetChair ? (
                      <span className="chair-badge-locked">
                        <IconCheck />
                        <span>Locked {scenario.timeRange}</span>
                      </span>
                    ) : (
                      <span className="chair-badge-active">Active</span>
                    )}
                  </div>

                  <div className="chair-timeline-bar-bg">
                    <div
                      className={`chair-timeline-fill ${isTargetChair ? 'fill-pulse' : ''}`}
                      style={{
                        width: isTargetChair ? `${chair.widthPercent}%` : '40%',
                        background: isTargetChair
                          ? 'linear-gradient(90deg, #2563eb 0%, #38bdf8 100%)'
                          : 'rgba(255, 255, 255, 0.12)'
                      }}
                    >
                      <span className="timeline-fill-label">
                        {isTargetChair ? scenario.service : chair.defaultService}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="floor-audit-note">
            <IconShield />
            <span>{scenario.auditLog}</span>
          </div>
        </div>

        {/* Column 3: Telemetry & Capacity Vitals */}
        <div className="capacity-card telemetry-card">
          <div className="card-header-clean">
            <span className="card-subhead-mono">CAPACITY TELEMETRY</span>
            <span className="telemetry-live-tag">Active 24/7</span>
          </div>

          <div className="telemetry-stat-boxes">
            <div className="tele-box">
              <span className="tele-label">Floor Concurrency</span>
              <span className="tele-number">4 / 4</span>
              <span className="tele-sub">Parallel Stations Active</span>
            </div>

            <div className="tele-box">
              <span className="tele-label">Double-Booking Rate</span>
              <span className="tele-number text-emerald">0.00%</span>
              <span className="tele-sub">Atomic Mongo Unique Index</span>
            </div>

            <div className="tele-box">
              <span className="tele-label">Claude Dispatch Latency</span>
              <span className="tele-number text-cyan">{scenario.latencyMs}ms</span>
              <span className="tele-sub">Model: claude-sonnet-5-5</span>
            </div>

            <div className="tele-box">
              <span className="tele-label">Today's Total Handled</span>
              <span className="tele-number">42 Bookings</span>
              <span className="tele-sub">Zero Human Dispatch Queue</span>
            </div>
          </div>

          <div className="telemetry-action-block">
            <button
              onClick={handleNext}
              className={`tele-sim-btn ${pulseActive ? 'pulse' : ''}`}
            >
              <span>Simulate Next Booking Event</span>
              <span>&rarr;</span>
            </button>
            <p className="tele-footnote">
              Deterministic demonstration of RVSMPS Glam Pro concurrency orchestration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
