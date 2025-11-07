// src/pages/Profile.jsx
// ⭐️ FIX: 'useNavigate' ko import kiya gaya hai

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // ⭐️ ERROR FIX YAHAN HAI
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { auth, db } from '../firebase-config';
import { 
  updateProfile, 
  updatePassword, 
  EmailAuthProvider, 
  reauthenticateWithCredential,
  deleteUser
} from 'firebase/auth';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import * as faceapi from 'face-api.js';
import { loadModels } from '../faceApiHelper';
import { 
  FiUser, 
  FiLock, 
  FiCamera, 
  FiEye, 
  FiEyeOff, 
  FiCheckCircle,
  FiAlertTriangle,
  FiKey
} from 'react-icons/fi';

// Naya modal import karein
import ReauthDeleteModal from '../components/ReauthDeleteModal'; 

export default function Profile() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate(); // Ab yeh line kaam karegi
  
  // States
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Change Account Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmNewPass, setShowConfirmNewPass] = useState(false);

  // Change PIN states
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  
  // Face Scan States
  const [isFaceRegistered, setIsFaceRegistered] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scanMessage, setScanMessage] = useState('Loading Face Models...');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [stream, setStream] = useState(null);
  const intervalRef = useRef(null);

  // Delete Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Data Fetch (Face Status ke saath)
  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.displayName || '');
      const docRef = doc(db, 'users', currentUser.uid);
      getDoc(docRef).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPhone(data.phone || '');
          if (data.faceDescriptors && data.faceDescriptors.length > 0) {
            setIsFaceRegistered(true);
          }
        }
      });
    }
  }, [currentUser]);

  // Face Model Loader
  useEffect(() => {
    const setupFaceAPI = async () => {
      await loadModels();
      setModelsLoaded(true);
      setScanMessage('Models loaded. Ready to scan.');
    };
    setupFaceAPI();
    return () => {
      stopWebcam();
    };
  }, []); // stopWebcam dependency se hata diya

  // --- Functions (Puraane + Naye) ---

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (currentUser.displayName !== username) {
        await updateProfile(currentUser, { displayName: username });
      }
      const docRef = doc(db, 'users', currentUser.uid);
      await updateDoc(docRef, { username, phone });
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      showToast('Failed to update profile.', 'error');
    }
    setIsLoading(false);
  };

  const handlePinUpdate = async (e) => {
    e.preventDefault();
    if (newPin !== confirmPin) {
      showToast('New PINs do not match.', 'error');
      return;
    }
    if (newPin.length !== 4) {
      showToast('PIN must be 4 digits.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const docRef = doc(db, 'users', currentUser.uid);
      const docSnap = await getDoc(docRef);
      const storedPin = docSnap.data().vaultPin;
      if (storedPin && storedPin !== currentPin) {
        showToast('Incorrect current PIN.', 'error');
        setIsLoading(false);
        return;
      }
      await updateDoc(docRef, { vaultPin: newPin });
      showToast('Vault PIN updated successfully!', 'success');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (err) {
      showToast('Failed to update PIN.', 'error');
    }
    setIsLoading(false);
  };
  
  // Change Account Password Function
  const handleAccountPasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      
      // Update password
      await updatePassword(currentUser, newPassword);
      
      showToast('Account password updated successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      
    } catch (err) {
      if (err.code === 'auth/wrong-password') {
        showToast('Incorrect current password.', 'error');
      } else {
        showToast('Failed to update password. Try logging out and in again.', 'error');
      }
      console.error(err);
    }
    setIsLoading(false);
  };
  
  // Delete Account Function
  const handleConfirmDelete = async (password) => {
    setDeleteLoading(true);
    setDeleteError('');
    
    try {
      // Re-authenticate
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);
      
      // User re-authenticated, now delete
      const userId = currentUser.uid;
      
      // 1. Delete Firestore user document
      await deleteDoc(doc(db, 'users', userId));
      
      // 2. Delete Firebase Auth user (This will log them out)
      await deleteUser(currentUser);
      
      showToast('Account deleted successfully.', 'success');
      setShowDeleteModal(false);
      navigate('/signup'); // Redirect to signup page
      
    } catch (err) {
      if (err.code === 'auth/wrong-password') {
        setDeleteError('Incorrect password. Account not deleted.');
      } else {
        setDeleteError('An error occurred. Please try again.');
      }
      console.error(err);
      setDeleteLoading(false);
    }
  };


  // --- Face Scan Functions (Fixes ke saath) ---

  const stopWebcam = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);
  
  const startWebcam = async () => {
    if (!modelsLoaded) {
      setScanMessage('Models are still loading. Please wait.');
      return false;
    }
    stopWebcam();
    try {
      // ⭐️ FIX: Mobile Scan Fix (Flexible constraints)
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 320 },
          height: { ideal: 240 }
        }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setScanMessage('Webcam started. Hold still...');
      return true;
    } catch (err) {
      console.error("Webcam Error: ", err);
      setScanMessage('Could not access webcam. Check permissions.');
      return false;
    }
  };

  const onVideoPlay = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || !canvasRef.current) {
        return;
      }
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224 });
      if (videoRef.current.videoWidth === 0) return;
      
      const detections = await faceapi.detectAllFaces(videoRef.current, options);
      const displaySize = { width: videoRef.current.clientWidth, height: videoRef.current.clientHeight };
      faceapi.matchDimensions(canvasRef.current, displaySize);
      
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      canvasRef.current.getContext('2d').clearRect(0, 0, displaySize.width, displaySize.height);
      faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
      if (detections.length > 0) setScanMessage('Face detected! Hold still...');
      else setScanMessage('Scanning... No face detected.');
    }, 500);
  };

  const captureDescriptors = async () => {
    if (!videoRef.current) {
      setScanMessage('Webcam not active.');
      return null;
    }
    setScanMessage('Capturing... Please wait.');
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224 });
    const detection = await faceapi
      .detectSingleFace(videoRef.current, options)
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!detection) {
      setScanMessage('Capture failed. No face found. Try again.');
      return null;
    }
    return detection.descriptor;
  };
  
  const handleFaceScan = async () => {
    setIsLoading(true);
    const webcamStarted = await startWebcam();
    if (!webcamStarted) {
      setIsLoading(false);
      return;
    }
    setScanMessage('Prepare to scan... 3s');
    await new Promise(r => setTimeout(r, 1000));
    setScanMessage('Prepare to scan... 2s');
    await new Promise(r => setTimeout(r, 1000));
    setScanMessage('Prepare to scan... 1s');
    await new Promise(r => setTimeout(r, 1000));
    const descriptor = await captureDescriptors();
    if (descriptor) {
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        await updateDoc(docRef, { faceDescriptors: Array.from(descriptor) });
        setScanMessage('Face data registered successfully!');
        showToast('Biometric data updated!', 'success');
        setIsFaceRegistered(true); // ⭐️ FIX: Status update
      } catch (err) {
        setScanMessage('Failed to save face data to database.');
      }
    }
    stopWebcam();
    setIsLoading(false);
  };

  // --- NEW ADVANCED TABBED JSX STRUCTURE ---
  return (
    <>
      {/* Delete Modal Render */}
      {showDeleteModal && (
        <ReauthDeleteModal
          onClose={() => {
            setShowDeleteModal(false);
            setDeleteError('');
          }}
          onConfirmDelete={handleConfirmDelete}
          loading={deleteLoading}
          error={deleteError}
        />
      )}
    
      <div className="profile-page-container">
        <h1 className="profile-page-title">Account Settings</h1>
        <p className="profile-page-subtitle">Manage your account details, security, and biometrics.</p>
        
        <div className="profile-tabs">
          <button 
            className={`profile-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <FiUser />
            <span>Profile</span>
          </button>
          <button 
            className={`profile-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <FiLock />
            <span>Security</span>
          </button>
          <button 
            className={`profile-tab-btn ${activeTab === 'face' ? 'active' : ''}`}
            onClick={() => setActiveTab('face')}
          >
            <FiCamera />
            <span>Biometric</span>
          </button>
        </div>
        
        <div className="profile-tab-content">
          
          {/* --- Tab 1: Profile Details --- */}
          {activeTab === 'profile' && (
            <div className="card profile-tab-pane">
              <h2 className="card-title">
                <FiUser />
                Profile Details
              </h2>
              <form onSubmit={handleProfileUpdate}>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    className="input-field"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your display name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    className="input-field"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Profile'}
                </button>
              </form>
            </div>
          )}
          
          {/* --- Tab 2: Security (PIN & Password) --- */}
          {activeTab === 'security' && (
            <div className="profile-tab-pane">
              {/* Change Account Password Card */}
              <div className="card" style={{ marginBottom: '2rem' }}>
                <h2 className="card-title">
                  <FiKey />
                  Change Account Password
                </h2>
                <form onSubmit={handleAccountPasswordChange}>
                  <div className="form-group">
                    <label className="form-label">Current Password</label>
                    <div className="password-input-wrapper">
                      <input
                        className="input-field password-field"
                        type={showCurrentPass ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter your current login password"
                        required
                      />
                      <button type="button" className="password-toggle-btn" onClick={() => setShowCurrentPass(!showCurrentPass)}>
                        {showCurrentPass ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <div className="password-input-wrapper">
                      <input
                        className="input-field password-field"
                        type={showNewPass ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min. 6 characters)"
                        required
                      />
                      <button type="button" className="password-toggle-btn" onClick={() => setShowNewPass(!showNewPass)}>
                        {showNewPass ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <div className="password-input-wrapper">
                      <input
                        className="input-field password-field"
                        type={showConfirmNewPass ? 'text' : 'password'}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Confirm new password"
                        required
                      />
                      <button type="button" className="password-toggle-btn" onClick={() => setShowConfirmNewPass(!showConfirmNewPass)}>
                        {showConfirmNewPass ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={isLoading}>
                    {isLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
              
              {/* Change Vault PIN Card */}
              <div className="card">
                <h2 className="card-title">
                  <FiLock />
                  Change Vault PIN
                </h2>
                <form onSubmit={handlePinUpdate}>
                  <div className="form-group">
                    <label className="form-label">Current 4-Digit PIN</label>
                    <div className="password-input-wrapper">
                      <input
                        className="input-field password-field"
                        type={showCurrentPin ? 'text' : 'password'}
                        value={currentPin}
                        onChange={(e) => setCurrentPin(e.target.value.slice(0, 4))}
                        placeholder="Enter current PIN (if set)"
                        maxLength="4"
                      />
                      <button type="button" className="password-toggle-btn" onClick={() => setShowCurrentPin(!showCurrentPin)}>
                        {showCurrentPin ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">New 4-Digit PIN</label>
                    <div className="password-input-wrapper">
                      <input
                        className="input-field password-field"
                        type={showNewPin ? 'text' : 'password'}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.slice(0, 4))}
                        placeholder="Enter new 4-digit PIN"
                        required
                        maxLength="4"
                        pattern="\d{4}"
                      />
                      <button type="button" className="password-toggle-btn" onClick={() => setShowNewPin(!showNewPin)}>
                        {showNewPin ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm New PIN</label>
                    <div className="password-input-wrapper">
                      <input
                        className="input-field password-field"
                        type={showConfirmPin ? 'text' : 'password'}
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.slice(0, 4))}
                        placeholder="Confirm new PIN"
                        required
                        maxLength="4"
                        pattern="\d{4}"
                      />
                      <button type="button" className="password-toggle-btn" onClick={() => setShowConfirmPin(!showConfirmPin)}>
                        {showConfirmPin ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={isLoading}>
                    {isLoading ? 'Updating PIN...' : 'Set New PIN'}
                  </button>
                </form>
              </div>
              
              {/* Danger Zone */}
              <div className="card danger-zone">
                <h2 className="card-title" style={{ color: 'var(--accent-orange)', borderColor: 'var(--accent-orange)' }}>
                  <FiAlertTriangle />
                  Danger Zone
                </h2>
                <div className="danger-zone-content">
                  <div>
                    <strong>Delete This Account</strong>
                    <p>Once you delete your account, there is no going back. All your data will be permanently erased.</p>
                  </div>
                  <button 
                    className="btn btn-danger" 
                    style={{ width: 'auto', flexShrink: 0 }}
                    onClick={() => setShowDeleteModal(true)}
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* --- Tab 3: Biometric Setup --- */}
          {activeTab === 'face' && (
            <div className="card profile-tab-pane">
              <h2 className="card-title">
                <FiCamera />
                Biometric Setup
              </h2>
              
              {/* ⭐️ FIX: Face Registered Status Check ⭐️ */}
              {isFaceRegistered ? (
                <div className="face-registered-status">
                  <div className="message-box success">
                    <FiCheckCircle />
                    <span>Biometric data is registered and active.</span>
                  </div>
                  <p className="info-label" style={{textAlign: 'left', margin: '1rem 0'}}>
                    You can re-register your face at any time. This will overwrite the existing data.
                  </p>
                </div>
              ) : (
                <p className="info-label" style={{textAlign: 'left', marginBottom: '1rem'}}>
                  Register your face to enable Face Unlock for your vault. This replaces the need for a PIN.
                </p>
              )}
              
              <div className="webcam-container">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  playsInline // iOS ke liye zaroori
                  onPlay={onVideoPlay}
                  className="webcam-feed"
                />
                <canvas ref={canvasRef} className="webcam-canvas" />
              </div>
              
              {scanMessage && (
                <p className={`message-box ${scanMessage.includes('failed') || scanMessage.includes('Could not') ? 'error' : (scanMessage.includes('success') ? 'success' : 'info')}`}>
                  {scanMessage}
                </p>
              )}
              
              <button 
                className={`btn ${isFaceRegistered ? 'btn-secondary' : 'btn-primary'}`} 
                onClick={handleFaceScan} 
                disabled={isLoading || !modelsLoaded}
                style={{width: '100%', marginTop: '1rem'}}
              >
                {isLoading ? 'Scanning...' : (isFaceRegistered ? 'Re-register My Face' : 'Register My Face')}
              </button>
              
              {!isFaceRegistered && (
                <p className="info-label" style={{marginTop: '1rem'}}>
                  Click the button, look at the camera, and hold still for 3 seconds.
                </p>
              )}
            </div>
          )}
          
        </div>
      </div>
    </>
  );
}