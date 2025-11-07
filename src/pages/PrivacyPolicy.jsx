// src/pages/PrivacyPolicy.jsx
import React from 'react';
import './LegalPage.css'; // Naya CSS import karein

export default function PrivacyPolicy() {
  return (
    <div className="legal-page-container">
      <h1>Privacy Policy</h1>
      <p className="last-updated">Last updated: November 2, 2025</p>

      <h2>1. Introduction</h2>
      <p>Welcome to SentinelVault. We respect your privacy and are committed to protecting it. This Privacy Policy explains how we collect, use, and safeguard your information when you use our application.</p>
      <p><strong>The most important thing to know:</strong> We cannot see, read, or access your stored passwords or other data in your vault. Your vault is encrypted and can only be accessed by you.</p>

      <h2>2. Information We Collect</h2>
      <p>We collect information in the following ways:</p>
      <ul>
        <li><strong>Information You Provide:</strong> When you register for an account, we collect personal information, such as your <strong>username, email address,</strong> and <strong>phone number</strong>.</li>
        <li><strong>Your Encrypted Vault Data:</strong> We store the data you save in your vault (such as passwords, usernames, and sites). This data is <strong>end-to-end encrypted</strong> on your device using your credentials before it is sent to our servers. We cannot access this information.</li>
        <li><strong>Facial Recognition Data:</strong> If you choose to use Face Unlock, we collect and store a mathematical representation (face descriptors) of your face. This data is stored securely in your user profile and is used *only* for verifying your identity to unlock your vault. We do not share this data with any third parties. You can delete this data at any time from your Profile page.</li>
        <li><strong>Usage Data:</strong> We may collect information automatically through our service providers (like Firebase) about how the Service is accessed and used, such as your IP address, browser type, and pages visited.</li>
      </ul>

      <h2>3. How We Use Your Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Provide, operate, and maintain our Service.</li>
        <li>Manage your account and send you administrative notifications (e.g., password reset emails).</li>
        <li>Authenticate you using your PIN or Face Unlock.</li>
        <li>Improve and personalize the Service.</li>
        <li>Monitor the usage of the Service for security and analytics.</li>
        <li>Enforce our terms, including banning users who violate policies (as seen in the Admin Panel).</li>
      </ul>

      <h2>4. How We Share Your Information</h2>
      <p>We do not sell, trade, or rent your personal identification information to others. We may share information with:</p>
      <ul>
        <li><strong>Service Providers:</strong> We use third-party services like Google Firebase to host our backend, database, and authentication. These providers are bound by their own privacy policies.</li>
        <li><strong>Legal Requirements:</strong> We may disclose your information if required to do so by law or in response to valid requests by public authorities.</li>
      </ul>
      <p>We will <strong>never</strong> share your encrypted vault data or your face descriptors with anyone, unless required by law.</p>

      <h2>5. Data Security</h2>
      <p>The security of your data is our top priority. We use industry-standard encryption to protect your vault. However, no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your data, we cannot guarantee its absolute security.</p>
      
      <h2>6. Your Data Rights</h2>
      <p>You have the right to access, update, or delete your personal information at any time. You can do this through your <strong>Profile page</strong> within the application. Deleting your account will permanently and irreversibly delete all your data, including your encrypted vault and any stored face data.</p>

      <h2>7. Children's Privacy</h2>
      <p>Our Service is not intended for use by children under the age of 13. We do not knowingly collect personally identifiable information from children under 13.</p>

      <h2>8. Changes to This Privacy Policy</h2>
      <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.</p>
    </div>
  );
}