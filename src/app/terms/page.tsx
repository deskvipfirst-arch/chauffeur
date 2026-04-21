'use client';

import React from 'react';
import { CONTACT_EMAIL } from "@/lib/globalConfig";

const TermsAndConditions = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">Terms and Conditions</h1>
      <p className="mb-4">Last Updated: 21 April 2026</p>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
        <p>
          Welcome to VIP Greeters. By accessing and using our services, you agree to be
          bound by these Terms and Conditions. If you do not agree, please do not use our
          services.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">2. Booking and Payments</h2>
        <p>When making a booking, you agree to the following terms:</p>
        <ul className="list-disc list-inside ml-4">
          <li>All bookings are subject to availability.</li>
          <li>Full or partial payment may be required to confirm a booking.</li>
          <li>Any changes to the booking must be communicated in advance.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">3. Cancellation Policy</h2>
        <p>Cancellations and refunds are subject to the following conditions:</p>
        <ul className="list-disc list-inside ml-4">
          <li>Cancellations made [X] hours before the scheduled time are eligible for a refund.</li>
          <li>Last-minute cancellations may incur a fee.</li>
          <li>No-shows will be charged the full amount.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">4. Responsibilities</h2>
        <p>
          While we strive to provide reliable and timely services, we are not responsible for
          delays caused by unforeseen circumstances, including traffic, weather, or other external
          factors.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">5. User Conduct</h2>
        <p>By using our services, you agree to:</p>
        <ul className="list-disc list-inside ml-4">
          <li>Respect the chauffeur and vehicle during the ride.</li>
          <li>Comply with all local laws and regulations.</li>
          <li>Not engage in any unlawful or disruptive behavior.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">6. Liability</h2>
        <p>
          We are not liable for any indirect, incidental, or consequential damages arising from the
          use of our services, except as required by law.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">7. Changes to Terms</h2>
        <p>
          We reserve the right to update these Terms and Conditions at any time. Continued use of
          our services after changes constitutes acceptance of the updated terms.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">8. Contact Us</h2>
        <p>
          If you have any questions about these Terms and Conditions, please contact us at:
          <br /> <strong>Email:</strong> {CONTACT_EMAIL}
        </p>
      </section>
    </div>
  );
};

export default TermsAndConditions;