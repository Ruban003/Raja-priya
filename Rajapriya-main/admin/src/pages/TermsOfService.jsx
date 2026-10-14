import { Link } from 'react-router-dom';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#05070e] text-[#e2e8f0] px-6 py-12 flex flex-col items-center">
      <div className="max-w-3xl w-full">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#38bdf8] hover:underline mb-8">
          &larr; Back to Home
        </Link>

        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Terms of Service</h1>
        <p className="text-xs text-[#94a3b8] mb-8">Last Updated: October 14, 2026 | Effective Date: October 2026</p>

        <div className="space-y-6 text-sm text-[#cbd5e1] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using <strong>RVSMPS Glam Pro AI</strong> (&quot;the Service&quot;), provided by RVSMPS Technologies, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not use our software or platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Permitted Use & Service Provision</h2>
            <p>
              Glam Pro AI is provided as a SaaS operational platform for appointment management, calendar scheduling, billing POS, staff performance metrics, and automated conversational receptionists.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Artificial Intelligence Disclaimer</h2>
            <p>
              Our automated WhatsApp receptionist leverages third-party large language model APIs (Anthropic Claude). While optimized for high reliability and availability checks, automated booking confirmations and pricing summaries should be reviewed by salon staff for accuracy. RVSMPS is not liable for scheduling discrepancies caused by network latency or carrier disconnections.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. User Accounts & Security</h2>
            <p>
              You are responsible for maintaining the confidentiality of your login credentials and preventing unauthorized access to your salon dashboard.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Contact Information</h2>
            <p>
              For legal inquiries:
              <br />
              <strong>RVSMPS Technologies</strong>
              <br />
              Email: <a href="mailto:contact@rvsmps.store" className="text-[#38bdf8] underline">contact@rvsmps.store</a>
              <br />
              Website: <a href="https://rvsmps.store" className="text-[#38bdf8] underline">https://rvsmps.store</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
