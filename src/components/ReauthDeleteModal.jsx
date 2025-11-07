// src/components/ReauthDeleteModal.jsx
// ⭐️ NEW FILE: Account delete karne se pehle re-authentication ke liye.

import React, { useState } from 'react';
import { FiEye, FiEyeOff, FiAlertTriangle } from 'react-icons/fi';

export default function ReauthDeleteModal({ onClose, onConfirmDelete, loading, error }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirmDelete(password);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content card" style={{ maxWidth: '450px', borderColor: 'var(--accent-orange)' }}>
        <FiAlertTriangle size={48} color="var(--accent-orange)" style={{ margin: '0 auto 1rem' }} />
        <h3 className="card-title" style={{ textAlign: 'center', color: 'var(--accent-orange)' }}>
          Are you absolutely sure?
        </h3>
        
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '1rem' }}>
          This action is irreversible. All your stored credentials and data will be permanently deleted.
        </p>
        <p style={{ color: 'var(--text-primary)', textAlign: 'center', fontWeight: '600', marginBottom: '1.5rem' }}>
          To confirm, please enter your account password.
        </p>

        {error && (
          <p className="message-box error" style={{ marginBottom: '1rem' }}>
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Your Password</label>
            <div className="password-input-wrapper">
              <input
                className="input-field password-field"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                placeholder="Enter your account password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>
          
          <div className="modal-actions" style={{ gap: '1rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
              style={{ background: 'var(--bg-dark)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete My Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}