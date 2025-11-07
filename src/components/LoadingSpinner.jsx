import React from 'react';
import './LoadingSpinner.css';
import { FiShield } from 'react-icons/fi';

export default function LoadingSpinner({ text = 'Initializing Secure Session...' }) {
    return (
        <div className="loading-backdrop">
            <div className="spinner-container">
                <div className="sentinel-spinner">
                    <FiShield className="spinner-icon" />
                </div>
                <p className="spinner-text">{text}</p>
            </div>
        </div>
    );
}