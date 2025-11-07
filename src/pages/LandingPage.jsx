import React from 'react';
import { Link } from 'react-router-dom';
import { FiShield, FiLock, FiSmartphone, FiUserPlus, FiDownloadCloud, FiHelpCircle } from 'react-icons/fi';
import './LandingPage.css'; // This line is important

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* --- Hero Section --- */}
      <div className="hero-section">
        <h1 className="hero-title">Your Digital Fortress for Passwords</h1>
        <p className="hero-subtitle">SentinelVault provides state-of-the-art security with unparalleled simplicity. Secure your digital life today.</p>
        <div className="hero-cta">
          <Link to="/signup" className="btn btn-primary">Create Your Free Account</Link>
          <Link to="/login" className="btn btn-secondary">Login to Your Vault</Link>
        </div>
      </div>

      {/* --- How It Works Section --- */}
      <div className="landing-section">
        <h2 className="section-title">How It Works</h2>
        <div className="how-it-works-grid">
          <div className="step-card">
            <div className="step-icon"><FiUserPlus size={30} /></div>
            <h3>1. Create Your Account</h3>
            <p>Sign up in seconds and create your master password.</p>
          </div>
          <div className="step-card">
            <div className="step-icon"><FiDownloadCloud size={30} /></div>
            <h3>2. Add Your Passwords</h3>
            <p>Easily import or add your existing passwords to your secure vault.</p>
          </div>
          <div className="step-card">
            <div className="step-icon"><FiSmartphone size={30} /></div>
            <h3>3. Access Anywhere</h3>
            <p>Use your passwords securely on any device, anytime.</p>
          </div>
        </div>
      </div>

      {/* --- Testimonials Section --- */}
      <div className="landing-section">
        <h2 className="section-title">What Our Users Say</h2>
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <p>"SentinelVault has been a game-changer for my digital security. I can finally keep track of all my passwords without worry."</p>
            <h4>- Alex Johnson</h4>
          </div>
          <div className="testimonial-card">
            <p>"The best password manager I've ever used. Simple, secure, and the multi-device sync is flawless."</p>
            <h4>- Samantha Lee</h4>
          </div>
          <div className="testimonial-card">
            <p>"As a developer, I appreciate the security-first approach of SentinelVault. I trust it with my most sensitive data."</p>
            <h4>- Michael Chen</h4>
          </div>
        </div>
      </div>

      {/* --- FAQ Section --- */}
      <div className="landing-section">
        <h2 className="section-title">Frequently Asked Questions</h2>
        <div className="faq-grid">
          <div className="faq-item">
            <FiHelpCircle className="faq-icon" />
            <div>
              <h4>Is SentinelVault really free?</h4>
              <p>Yes, the core features of SentinelVault are completely free to use. We may offer premium features in the future.</p>
            </div>
          </div>
          <div className="faq-item">
            <FiHelpCircle className="faq-icon" />
            <div>
              <h4>How secure is my data?</h4>
              <p>Your data is encrypted with industry-leading AES-256 encryption. Only you can access your vault.</p>
            </div>
          </div>
          <div className="faq-item">
            <FiHelpCircle className="faq-icon" />
            <div>
              <h4>Can I access my passwords on my phone?</h4>
              <p>Absolutely. SentinelVault is designed to work seamlessly across all your devices, including desktops, tablets, and smartphones.</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- Final CTA Section --- */}
      <div className="landing-section cta-section">
        <h2>Ready to Secure Your Digital Life?</h2>
        <p>Join thousands of users who trust SentinelVault to protect their passwords.</p>
        <Link to="/signup" className="btn btn-primary">Get Started for Free</Link>
      </div>
    </div>
  );
}