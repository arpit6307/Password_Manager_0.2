// src/pages/TermsOfService.jsx
import React from 'react';
import './LegalPage.css'; // Naya CSS import karein

export default function TermsOfService() {
  return (
    <div className="legal-page-container">
      <h1>Terms of Service</h1>
      <p className="last-updated">Last updated: November 2, 2025</p>

      <h2>1. Agreement to Terms</h2>
      <p>By creating an account and using the SentinelVault ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of the terms, then you may not access the Service.</p>

      <h2>2. User Accounts</h2>
      <p><strong>Account Creation:</strong> You must provide us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms.</p>
      <p><strong>Master Password & PIN:</strong> You are responsible for safeguarding the master password and 4-digit Vault PIN that you use to access the Service and for any activities or actions under your account. You agree not to disclose your master password or PIN to any third party. SentinelVault encrypts your vault data using your credentials.</p>
      <p><strong>We do not store your master password or PIN and cannot recover them for you.</strong> If you lose them, you may lose access to your data.</p>
      <p><strong>Account Security:</strong> You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</p>

      <h2>3. Your Content</h2>
      <p>Our Service allows you to store, link, and otherwise make available certain information, text, or other material ("Content"). You are responsible for the Content that you post to the Service, including its legality, reliability, and appropriateness.</p>
      <p>You retain any and all of your rights to any Content you submit. We claim no ownership rights over your Content. Your Content is encrypted, and we have no ability to access or view your stored passwords.</p>

      <h2>4. Prohibited Uses</h2>
      <p>You may use the Service only for lawful purposes. You agree not to use the Service:</p>
      <ul>
        <li>In any way that violates any applicable national or international law or regulation.</li>
        <li>To attempt to gain unauthorized access to, interfere with, damage, or disrupt any parts of the Service.</li>
        <li>To reverse engineer or attempt to extract the source code of our application.</li>
        <li>To engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the Service.</li>
      </ul>

      <h2>5. Termination</h2>
      <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms (e.g., if your account is banned by an administrator).</p>
      <p>You may terminate your account at any time by using the "Delete Account" feature in your profile, which will permanently delete all your data.</p>

      <h2>6. Disclaimers and Limitation of Liability</h2>
      <p>The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We do not warrant that the service will be uninterrupted, secure, or error-free.</p>
      <p>In no event shall SentinelVault, nor its directors, employees, partners, or agents, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of data, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.</p>
      
      <h2>7. Changes to Terms</h2>
      <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide at least 30 days' notice prior to any new terms taking effect. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.</p>
    </div>
  );
}