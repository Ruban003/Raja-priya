import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#05070e] text-[#e2e8f0] px-6 py-12 flex flex-col items-center">
      <div className="max-w-3xl w-full">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#38bdf8] hover:underline mb-8">
          &larr; Back to Home
        </Link>

        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Privacy Policy</h1>
        <p className="text-xs text-[#94a3b8] mb-8">Last Updated: October 14, 2026 | Effective Date: October 2026</p>

        <div className="space-y-6 text-sm text-[#cbd5e1] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Overview</h2>
            <p>
              RVSMPS Technologies (&quot;RVSMPS&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) provides the <strong>Glam Pro AI</strong> operating system for salons, spas, and wellness businesses. We are dedicated to respecting and safeguarding the personal data of salon owners, employees, and salon clients.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Salon Account Information:</strong> Business name, address, GST details, admin emails, and staff names.</li>
              <li><strong>Client Booking Data:</strong> Customer name, phone number, booked services, and appointment history.</li>
              <li><strong>Conversational Data:</strong> Inquiries made via our WhatsApp AI receptionist or web booking simulators.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. How We Use Artificial Intelligence (Anthropic Claude API)</h2>
            <p>
              Glam Pro AI utilizes the Anthropic Claude API to provide intelligent conversational booking assistance and client re-engagement reminders.
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Messages are sent to Anthropic solely for real-time processing and availability matching.</li>
              <li>Customer data is processed via secure TLS/HTTPS APIs and is not utilized by Anthropic to train foundation models.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Data Protection & India DPDP Act Compliance</h2>
            <p>
              We process personal data in compliance with applicable data protection legislation, including the Digital Personal Data Protection Act (DPDP Act, India). Data is encrypted in transit and at rest.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Data Retention & Deletion</h2>
            <p>
              Salon clients may request deletion or correction of their personal appointment records by contacting the respective salon or reaching us directly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Contact Us</h2>
            <p>
              For privacy inquiries, rights enforcement, or questions regarding this policy:
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
