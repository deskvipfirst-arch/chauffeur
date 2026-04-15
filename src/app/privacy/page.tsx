'use client';

import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="mb-4">Last Updated: [Insert Date]</p>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
        <p>
          Welcome to [Your Company Name]. Your privacy is important to us. This Privacy Policy
          outlines how we collect, use, and protect your information when you use our website
          and services.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">2. Information We Collect</h2>
        <p>We may collect the following types of information:</p>
        <ul className="list-disc list-inside ml-4">
          <li>Personal details (name, email, phone number, etc.).</li>
          <li>Booking details (pickup/drop-off locations, time, etc.).</li>
          <li>Payment information (processed securely via third-party providers).</li>
          <li>Technical data (IP address, browser type, cookies, etc.).</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">3. How We Use Your Information</h2>
        <p>We use the collected data to:</p>
        <ul className="list-disc list-inside ml-4">
          <li>Process and manage your bookings.</li>
          <li>Improve our website and services.</li>
          <li>Communicate with you regarding your booking.</li>
          <li>Comply with legal obligations.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">4. Data Protection</h2>
        <p>
          We take appropriate security measures to protect your data. However, no method of
          transmission over the internet is 100% secure, and we cannot guarantee absolute
          security.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">5. Cookies</h2>
        <p>
          Our website may use cookies to enhance your experience. You can adjust your browser
          settings to refuse cookies if you prefer.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">6. Third-Party Services</h2>
        <p>
          We may use third-party services for payments, analytics, and other functionalities.
          These services have their own privacy policies that govern their data handling.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">7. Your Rights</h2>
        <p>You have the right to:</p>
        <ul className="list-disc list-inside ml-4">
          <li>Access and request a copy of your data.</li>
          <li>Request correction or deletion of your data.</li>
          <li>Withdraw consent for data processing.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">8. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at:
          <br /> <strong>Email:</strong> support@[yourdomain].com
        </p>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
