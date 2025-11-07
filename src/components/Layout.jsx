// src/components/Layout.jsx
// ⭐️ FIX: Desktop dropdown menu ab sahi se kaam karega.

import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase-config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

import {
  FiLock,
  FiGrid,
  FiUser,
  FiShield,
  FiLogIn,
  FiUserPlus,
  FiLogOut,
  FiChevronDown,
  FiInstagram,
  FiFacebook,
  FiTwitter,
  FiMail
} from 'react-icons/fi';

// Conflicting 'Layout.css' import ko hata diya gaya hai
// import './Layout.css'; 

export default function Layout() {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  
  const userMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const mobileToggleRef = useRef(null);

  // --- Menu Logic ---
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast('Logged out successfully.', 'info');
      setIsUserMenuOpen(false);
      closeMobileMenu(); 
      navigate('/login');
    } catch (error) {
      showToast('Failed to log out.', 'error');
    }
  };
  
  // --- Newsletter Logic ---
  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!newsletterEmail) {
      showToast('Please enter a valid email.', 'error');
      return;
    }
    try {
      await addDoc(collection(db, 'newsletter_subscriptions'), {
        email: newsletterEmail,
        subscribedAt: serverTimestamp()
      });
      showToast('Thank you for subscribing!', 'success');
      setNewsletterEmail('');
    } catch (error) {
      console.error("Newsletter Error: ", error);
      showToast('Subscription failed. Please try again.', 'error');
    }
  };

  // --- Click outside listeners (User & Mobile Menu) ---
  useEffect(() => {
    function handleClickOutside(event) {
      // User menu
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      // Mobile menu
      if (
        isMobileMenuOpen &&
        mobileMenuRef.current && 
        !mobileMenuRef.current.contains(event.target) &&
        mobileToggleRef.current &&
        !mobileToggleRef.current.contains(event.target)
      ) {
        setIsMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMobileMenuOpen, userMenuRef, mobileMenuRef, mobileToggleRef]); // Refs ko bhi add karein (best practice)

  // Body par class toggle karein (Mobile menu ke liye)
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('mobile-menu-open');
    } else {
      document.body.classList.remove('mobile-menu-open');
    }
  }, [isMobileMenuOpen]);

  return (
    <div className={`app-wrapper ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
      <header className="main-header">
        <nav className="navbar">
          
          <Link to="/" className="logo" onClick={closeMobileMenu}>
            <FiLock />
            Sentinel<span>Vault</span>
          </Link>

          {/* Naya Hamburger Toggle */}
          <button 
            className="mobile-menu-toggle" 
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
            ref={mobileToggleRef}
          >
            <span className="hamburger-bar top"></span>
            <span className="hamburger-bar middle"></span>
            <span className="hamburger-bar bottom"></span>
          </button>

          {/* Desktop Links / User Menu */}
          <div className="desktop-nav">
            {currentUser ? (
              /* --- User Menu (Logged In) --- */
              // ⭐️ FIX: 'open' class ab parent .user-menu div par lagayi gayi hai
              <div className={`user-menu ${isUserMenuOpen ? 'open' : ''}`} ref={userMenuRef}>
                <button className="user-menu-trigger" onClick={toggleUserMenu}>
                  <span className="user-avatar">{currentUser.email.charAt(0).toUpperCase()}</span>
                  <span className="user-name">{currentUser.displayName || currentUser.email}</span>
                  {/* ⭐️ FIX: Icon ko 'open' class di gayi hai taaki CSS use rotate kar sake */}
                  <FiChevronDown className={`chevron-icon ${isUserMenuOpen ? 'open' : ''}`} />
                </button>
                
                {/* ⭐️ FIX: Yahaan se 'open' class hata di gayi hai */}
                <div className="user-menu-dropdown">
                  <div className="user-menu-info">
                    <div className="user-menu-info-avatar">
                      <span className="user-avatar">{currentUser.email.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="user-menu-info-text">
                      <span className="user-name">{currentUser.displayName || "User"}</span>
                      <span className="user-email">{currentUser.email}</span>
                    </div>
                  </div>
                  <nav className="user-menu-links">
                    <NavLink to="/dashboard" className="nav-item" onClick={toggleUserMenu}>
                      <FiGrid /> Dashboard
                    </NavLink>
                    <NavLink to="/profile" className="nav-item" onClick={toggleUserMenu}>
                      <FiUser /> Profile
                    </NavLink>
                    {isAdmin && (
                      <NavLink to="/admin" className="nav-item" onClick={toggleUserMenu}>
                        <FiShield /> Admin Panel
                      </NavLink>
                    )}
                  </nav>
                  <div className="user-menu-footer">
                    <button className="btn btn-logout" onClick={handleLogout}>
                      <FiLogOut /> Logout
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* --- Auth Links (Logged Out) --- */
              <div className="navbar-links">
                <NavLink to="/login" className="btn btn-nav login" onClick={closeMobileMenu}>
                  <FiLogIn /> Login
                </NavLink>
                <NavLink to="/signup" className="btn btn-nav signup" onClick={closeMobileMenu}>
                  <FiUserPlus /> Signup
                </NavLink>
              </div>
            )}
          </div>
        </nav>
      </header>
      
      {/* Naya Slider Menu aur Overlay */}
      <div className="mobile-menu-overlay" onClick={closeMobileMenu}></div>
      <nav className="mobile-slider-menu" ref={mobileMenuRef}>
        <div className="mobile-slider-header">
          <Link to="/" className="logo" onClick={closeMobileMenu}>
            <FiLock />
            Sentinel<span>Vault</span>
          </Link>
        </div>
        <div className="mobile-slider-links">
          {currentUser ? (
            <>
              <NavLink to="/dashboard" className="nav-item" onClick={closeMobileMenu}>
                <FiGrid /> Dashboard
              </NavLink>
              <NavLink to="/profile" className="nav-item" onClick={closeMobileMenu}>
                <FiUser /> Profile
              </NavLink>
              {isAdmin && (
                <NavLink to="/admin" className="nav-item" onClick={closeMobileMenu}>
                  <FiShield /> Admin Panel
                </NavLink>
              )}
            </>
          ) : (
            <>
              <NavLink to="/login" className="nav-item" onClick={closeMobileMenu}>
                <FiLogIn /> Login
              </NavLink>
              <NavLink to="/signup" className="nav-item" onClick={closeMobileMenu}>
                <FiUserPlus /> Signup
              </NavLink>
            </>
          )}
        </div>
        {currentUser && (
          <div className="mobile-slider-footer">
            <button className="btn-logout-mobile" onClick={handleLogout}>
              <FiLogOut /> Logout
            </button>
          </div>
        )}
      </nav>

      <main className="main-content">
        <Outlet />
      </main>

      {/* --- Footer --- */}
      <footer className="main-footer">
        <div className="footer-grid">
          <div className="footer-column about">
            <Link to="/" className="footer-logo">Sentinel<span>Vault</span></Link>
            <p className="footer-about">Your personal, secure, and intelligent password manager. Built with modern technology for ultimate protection.</p>
            <p className="footer-copyright">© {new Date().getFullYear()} SentinelVault. All rights reserved.</p>
          </div>
          
          <div className="footer-column">
            <h4 className="footer-heading">Quick Links</h4>
            <div className="footer-links">
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/profile">Profile</NavLink>
              <NavLink to="/terms-of-service">Terms of Service</NavLink>
              <NavLink to="/privacy-policy">Privacy Policy</NavLink>
            </div>
          </div>

          <div className="footer-column">
            <h4 className="footer-heading">Connect With Us</h4>
            <div className="social-media-links">
              <a href="httpsT://www.instagram.com/arpit__6307/?__pwa=1" target="_blank" rel="noopener noreferrer" title="Instagram"><FiInstagram /></a>
              <a href="https://www.facebook.com/arpitsingh.yadav.6307" target="_blank" rel="noopener noreferrer" title="Facebook"><FiFacebook /></a>
              <a href="https://x.com/Arpit__6307" target="_blank" rel="noopener noreferrer" title="Twitter"><FiTwitter /></a>
            </div>
            <h4 className="footer-heading" style={{ marginTop: '1.5rem' }}>Stay Updated</h4>
            
            <form className="newsletter-form" onSubmit={handleNewsletterSubmit}>
              <FiMail className="newsletter-icon" />
              <input
                type="email"
                placeholder="Enter your email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                required
              />
              <button type="submit">Subscribe</button>
            </form>
          </div>
        </div>
        <div className="footer-bottom">
          <p>Developed with ❤️ by Arpit Singh Yadav</p>
        </div>
      </footer>
    </div>
  );
}