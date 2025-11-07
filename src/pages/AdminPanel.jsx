// src/pages/AdminPanel.jsx
// ⭐️ FULLY REDESIGNED with Hacker Theme, Mobile Card View, and new User Filter ⭐️

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'; // useMemo ko import karein
import { useNavigate } from 'react-router-dom'; 
import { db, auth } from '../firebase-config';
import { collection, getDocs, doc, updateDoc, writeBatch, serverTimestamp, addDoc, query, orderBy, limit, getDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { 
    FiTrash2, FiLock, FiUnlock, FiUsers, FiRepeat, FiAlertTriangle, FiShield, 
    FiUserCheck, FiUserX, FiActivity, FiKey, FiSettings, FiSave, FiXCircle, 
    FiSearch, FiCloudDrizzle, FiRefreshCw, FiCamera, FiCheckCircle, FiPlayCircle,
    FiEye, FiToggleLeft, FiToggleRight, FiTerminal // Naye icons
} from 'react-icons/fi';
import Select from 'react-select'; // ⭐️ User filter ke liye import karein
import { formatDate, calculateStrength } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// Face API Imports
import * as faceapi from 'face-api.js';
import { loadModels, createFaceMatcher } from '../faceApiHelper';

// --- (HealthBar, logSensitiveAction - Unchanged) ---
const HealthBar = ({ label, count, total, color }) => {
    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
    return (
        <div className="health-bar-item">
            <div className="health-bar-header">
                <span>{label}</span>
                <strong>{count}</strong>
            </div>
            <div className="health-bar-container">
                <div
                    className="health-bar-fill"
                    style={{ width: `${percentage}%`, backgroundColor: color }}
                ></div>
            </div>
            <span className="health-bar-percent" style={{color: color}}>{percentage}%</span>
        </div>
    );
};
const logSensitiveAction = async (userEmail, action, level = 'info') => {
    try {
        await addDoc(collection(db, 'audit_logs'), {
            timestamp: serverTimestamp(),
            userEmail: userEmail,
            action: action,
            level: level
        });
    } catch (error) {
        console.error("Failed to write audit log:", error);
    }
};

// --- fetchAllCredentialsData (⭐️ UID ADDED) ---
const fetchAllCredentialsData = async () => {
    let allCredentials = [];
    let usersData = [];
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        usersData = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

        for (const user of usersData) {
            const passwordsCollectionRef = collection(db, 'users', user.uid, 'passwords');
            const passwordDocs = await getDocs(passwordsCollectionRef);

            passwordDocs.docs.forEach(pwDoc => {
                const pwData = pwDoc.data();
                allCredentials.push({
                    id: pwDoc.id,
                    uid: user.uid, // ⭐️ UID ko add kiya taaki password delete kar sakein
                    userEmail: user.email || 'N/A',
                    site: pwData.site || 'N/A',
                    username: pwData.username || 'N/A',
                    password: pwData.password || 'N/A',
                    category: pwData.category || 'other',
                    ownerName: user.username || 'N/A'
                });
            });
        }
        return { allCredentials, usersData };
    } catch (err) {
        console.error("Error fetching all passwords for scan:", err);
        return { allCredentials: [], usersData: [] };
    }
};

// --- (AdminPinSetupForm, FinalWarningModal, LockOverlay - Unchanged Logic, ⭐️ Hacker CSS Added) ---
function AdminPinSetupForm({ currentUser, onClose }) {
    const { showToast } = useToast();
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmNewPin, setConfirmNewPin] = useState('');
    const [isPinUpdating, setIsPinUpdating] = useState(false);
    const [localError, setLocalError] = useState('');
    const [hasExistingPin, setHasExistingPin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAdminPinStatus = async () => {
            try {
                const docRef = doc(db, 'users', currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().vaultPin) {
                    setHasExistingPin(true);
                }
            } catch (err) {
                setLocalError("Could not verify existing PIN status.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchAdminPinStatus();
    }, [currentUser.uid]);

    const handleSubmitPin = async (e) => {
        e.preventDefault();
        setLocalError('');
        setIsPinUpdating(true);
        try {
            const docRef = doc(db, 'users', currentUser.uid);
            if (hasExistingPin) {
                const docSnap = await getDoc(docRef);
                const storedPin = docSnap.data().vaultPin;
                if (currentPin !== storedPin) {
                    throw new Error("The Current PIN you entered is incorrect.");
                }
                if (newPin === currentPin) {
                    throw new Error("New PIN cannot be the same as the old one.");
                }
            }
            if (newPin.length !== 4 || isNaN(newPin)) {
                throw new Error("PIN must be exactly 4 digits.");
            }
            if (newPin !== confirmNewPin) {
                throw new Error("The new PINs do not match.");
            }
            await updateDoc(docRef, {
                vaultPin: newPin,
                lastUpdated: serverTimestamp()
            });
            showToast(`Admin Vault PIN ${hasExistingPin ? 'updated' : 'set'} successfully!`, 'success');
            onClose();
        } catch (err) {
            setLocalError(err.message);
        } finally {
            setIsPinUpdating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="modal-backdrop">
                <div className="modal-content card hacker-modal"><p>Verifying PIN status...</p></div>
            </div>
        );
    }

    return (
        <div className="modal-backdrop">
            {/* ⭐️ Hacker theme modal */}
            <div className="modal-content card hacker-modal" style={{ maxWidth: '450px', textAlign: 'center' }}>
                <h3 className="card-title" style={{ fontSize: '1.4rem', marginBottom: '1rem', borderBottom: '1px solid var(--hacker-red)', paddingBottom: '1rem' }}>
                    <FiSettings style={{marginRight: '0.5rem'}}/> {hasExistingPin ? 'Update' : 'Set'} Admin Vault PIN
                </h3>
                {localError && <p className="message-box error" style={{display: 'block'}}>{localError}</p>}
                <p className="info-label" style={{ color: 'var(--hacker-green-dim)', marginBottom: '1.5rem' }}>
                    This 4-digit PIN secures the sensitive Password Vault section.
                </p>
                <form onSubmit={handleSubmitPin}>
                    {hasExistingPin && (
                        <div className="form-group">
                            <label className="form-label">Current PIN</label>
                            <input
                                type="password"
                                className="input-field"
                                value={currentPin}
                                onChange={(e) => setCurrentPin(e.target.value.slice(0, 4))}
                                placeholder="Enter your current PIN"
                                maxLength="4"
                                pattern="\d{4}"
                                required
                                disabled={isPinUpdating}
                            />
                        </div>
                    )}
                    <div className="form-group">
                        <label className="form-label">{hasExistingPin ? 'New' : 'Set'} 4-Digit Vault PIN</label>
                        <input
                            type="password"
                            className="input-field"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value.slice(0, 4))}
                            placeholder="New 4-Digit PIN"
                            maxLength="4"
                            pattern="\d{4}"
                            required
                            disabled={isPinUpdating}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Confirm {hasExistingPin ? 'New' : ''} PIN</label>
                        <input
                            type="password"
                            className="input-field"
                            value={confirmNewPin}
                            onChange={(e) => setConfirmNewPin(e.target.value.slice(0, 4))}
                            placeholder="Confirm the PIN"
                            maxLength="4"
                            pattern="\d{4}"
                            required
                            disabled={isPinUpdating}
                        />
                    </div>
                    <div className="modal-actions" style={{marginTop: '1.5rem'}}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isPinUpdating}>
                            <FiXCircle style={{marginRight: '0.5rem'}}/> Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isPinUpdating}>
                            <FiSave style={{marginRight: '0.5rem'}}/> {isPinUpdating ? 'Saving...' : (hasExistingPin ? 'Update PIN' : 'Save PIN')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
function FinalWarningModal({ onClose }) {
    return (
        <div className="modal-backdrop" style={{ zIndex: 1101 }}> 
            {/* ⭐️ Hacker theme modal */}
            <div className="modal-content card hacker-modal" style={{ maxWidth: '450px', textAlign: 'center', borderColor: 'var(--hacker-red)' }}>
                <FiAlertTriangle size={48} color="var(--hacker-red)" style={{ marginBottom: '1rem' }} />
                <h3 className="card-title" style={{ color: 'var(--hacker-red)' }}>Final Warning!</h3>
                <p style={{ color: 'var(--hacker-green-dim)', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
                    You have only <strong>1 attempt remaining</strong>.
                    <br />
                    One more failed attempt will <strong>temporarily lock you out</strong>.
                </p>
                <div className="modal-actions" style={{ justifyContent: 'center' }}>
                    <button
                        className="btn btn-primary"
                        onClick={onClose}
                        style={{ width: 'auto', padding: '10px 20px', background: 'var(--hacker-red)', color: 'var(--hacker-bg)' }}
                    >
                        OK, I Understand
                    </button>
                </div>
            </div>
        </div>
    );
}
function LockOverlay({ onUnlock, setPasswordsVaultError, passwordsVaultError, currentUser }) {
    const [pin, setPin] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const videoRef = useRef(null);
    const [scanMessage, setScanMessage] = useState('Loading Face Models...');
    const [faceMatcher, setFaceMatcher] = useState(null);
    const [showPinFallback, setShowPinFallback] = useState(false);
    const streamRef = useRef(null);
    const scanIntervalIdRef = useRef(null);
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [showFinalWarningModal, setShowFinalWarningModal] = useState(false);

    const stopWebcam = useCallback(() => {
        if (scanIntervalIdRef.current) {
            clearInterval(scanIntervalIdRef.current);
            scanIntervalIdRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []); 

    const handleFailedAttempt = () => {
        const newCount = failedAttempts + 1;
        setFailedAttempts(newCount);
        
        if (newCount === 2) {
            setShowFinalWarningModal(true);
            setPasswordsVaultError(''); 
        } else if (newCount >= 3) {
            setPasswordsVaultError("Too many failed attempts. Please try again later.");
        } else {
            setPasswordsVaultError(`Incorrect PIN. ${3 - newCount} attempts remaining.`);
        }
    };

    const handleUnlockAttempt = async (e) => {
        e.preventDefault();
        setPasswordsVaultError('');
        setIsChecking(true);

        if (failedAttempts >= 3) {
             setPasswordsVaultError("Too many failed attempts. Please try again later.");
             setIsChecking(false);
             return;
        }

        if (pin.length !== 4) {
            setPasswordsVaultError('PIN must be 4 digits.');
            setIsChecking(false);
            return;
        }
        try {
            const docRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(docRef);
            const storedPin = docSnap.exists() ? docSnap.data().vaultPin : null;
            if (!storedPin) {
                setPasswordsVaultError("Admin Vault PIN is not set. Please set one first.");
            } else if (storedPin === pin) {
                stopWebcam(); 
                onUnlock();
            } else {
                handleFailedAttempt();
            }
        } catch (err) {
            setPasswordsVaultError('An error occurred during verification.');
        }
        setIsChecking(false);
    };

    const onVideoPlay = useCallback(() => {
        setScanMessage("Scanning... Hold still.");
        const scanStartTime = Date.now();
        const intervalId = setInterval(async () => {
            if (Date.now() - scanStartTime > 7000) { 
                stopWebcam();
                setPasswordsVaultError("Face scan failed. Please use PIN.");
                setShowPinFallback(true);
                return;
            }
            if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || !faceMatcher) {
                return;
            }
            const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
            const detections = await faceapi
                .detectSingleFace(videoRef.current, options)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detections) {
                const bestMatch = faceMatcher.findBestMatch(detections.descriptor);
                if (bestMatch.label === 'me' && bestMatch.distance <= 0.5) {
                    stopWebcam();
                    setScanMessage("Face Recognized!");
                    setTimeout(() => {
                        onUnlock();
                    }, 500);
                } else {
                    const newCount = failedAttempts + 1;
                    setFailedAttempts(newCount);
                    stopWebcam();
                    setShowPinFallback(true); 

                    if (newCount === 2) {
                        setShowFinalWarningModal(true);
                        setPasswordsVaultError(''); 
                    } else if (newCount >= 3) {
                        setPasswordsVaultError("Too many failed attempts. Please try again later.");
                    } else {
                        setPasswordsVaultError(`Face not recognized. ${3 - newCount} attempts remaining.`);
                    }
                }
            } else {
                setScanMessage("Scanning... No face detected.");
            }
        }, 1000);
        scanIntervalIdRef.current = intervalId;
    }, [faceMatcher, onUnlock, stopWebcam, failedAttempts]); 

    const startAutomaticFaceUnlock = useCallback(async () => {
        setPasswordsVaultError('');
        setShowPinFallback(false);
        setScanMessage('Loading models...');
        
        await loadModels();

        let savedDescriptors;
        try {
            const docRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().faceDescriptors && docSnap.data().faceDescriptors.length > 0) {
                savedDescriptors = docSnap.data().faceDescriptors;
            } else {
                setPasswordsVaultError("No face data registered for Admin. Please use PIN.");
                setShowPinFallback(true);
                return;
            }
        } catch (err) {
            setPasswordsVaultError("Could not fetch admin face data. Please use PIN.");
            setShowPinFallback(true);
            return;
        }

        const matcher = createFaceMatcher(savedDescriptors);
        if (!matcher) {
             setPasswordsVaultError("Failed to create face matcher. Please use PIN.");
             setShowPinFallback(true);
             return;
        }
        setFaceMatcher(matcher);

        setScanMessage("Starting webcam...");
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
            streamRef.current = mediaStream; 
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            setPasswordsVaultError("Could not access webcam. Please use PIN.");
            setShowPinFallback(true);
        }
    }, [currentUser.uid]);
    
    useEffect(() => {
        if (failedAttempts >= 3) return; 
        startAutomaticFaceUnlock();
        return () => {
            stopWebcam();
        };
    }, [startAutomaticFaceUnlock, stopWebcam, failedAttempts]); 

    return (
        <div className="modal-backdrop hacker-modal-backdrop">
            {showFinalWarningModal && (
                <FinalWarningModal onClose={() => {
                    setShowFinalWarningModal(false);
                    setShowPinFallback(true); 
                    setPasswordsVaultError("FINAL WARNING: 1 attempt remaining.");
                }} />
            )}
            
            <div className="modal-content card hacker-modal" style={{ maxWidth: '400px', textAlign: 'center', display: showFinalWarningModal ? 'none' : 'block', borderColor: 'var(--hacker-red)' }}>
                
                {!showPinFallback && (
                    <>
                        <FiCamera size={48} color="var(--hacker-red)" style={{ marginBottom: '1.5rem' }} />
                        <h3 className="card-title" style={{ fontSize: '1.8rem', color: 'var(--hacker-red)' }}>ADMIN_VAULT</h3>
                        
                        <div style={{ margin: '1rem 0', textAlign: 'center', minHeight: '270px' }}>
                            <video ref={videoRef} autoPlay muted playsInline className="webcam-feed" onPlay={onVideoPlay} style={{border: '1px solid var(--hacker-green-dim)'}} />
                            <p className="info-label" style={{ 
                                color: scanMessage.includes("Failed") ? 'var(--hacker-red)' : (scanMessage.includes("Recognized") ? 'var(--hacker-green)' : 'var(--hacker-green-dim)'),
                                marginTop: '1rem',
                                fontSize: '1rem',
                                minHeight: '1.2rem'
                            }}>
                                {scanMessage.includes("Recognized") ? <FiCheckCircle style={{marginBottom: '-2px'}}/> : null} {scanMessage}
                            </p>
                        </div>
                    </>
                )}

                {showPinFallback && (
                    <>
                        <FiLock size={48} color="var(--hacker-red)" style={{ marginBottom: '1rem' }} />
                        <h3 style={{ color: 'var(--hacker-red)', marginBottom: '1rem' }}>Admin Vault is Locked</h3>
                        
                        {passwordsVaultError && (
                            <p className="message-box error" style={passwordsVaultError.includes("FINAL WARNING") ? {color: '#FFD700', borderColor: '#FFD700', background: 'rgba(255, 215, 0, 0.1)'} : {}}>
                                {passwordsVaultError.includes("FINAL WARNING") && <FiAlertTriangle style={{marginRight: '0.5rem', marginBottom: '-2px'}} />}
                                {passwordsVaultError}
                            </p>
                        )}
                        
                        <form onSubmit={handleUnlockAttempt} style={{ width: '100%' }}>
                            <input
                                className="input-field"
                                type="password"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.slice(0, 4))}
                                placeholder="Enter Admin PIN"
                                maxLength="4"
                                pattern="\d{4}"
                                required
                                autoFocus
                                disabled={failedAttempts >= 3}
                                style={{ marginBottom: '1rem' }}
                            />
                            <button type="submit" className="btn btn-primary" disabled={isChecking || failedAttempts >= 3} style={{width: '100%'}}>
                                {failedAttempts >= 3 ? 'TOO MANY ATTEMPTS' : (isChecking ? 'Verifying...' : 'Unlock with PIN')}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
// --- END MODIFIED Lock Overlay ---


// --- AdminPanel Component (Main) ---
export default function AdminPanel() {
    // --- States ---
    const [users, setUsers] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [systemHealth, setSystemHealth] = useState({ weak: 0, medium: 0, strong: 0, total: 0 });
    const { currentUser } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [showPinSetup, setShowPinSetup] = useState(false);
    const [allPasswords, setAllPasswords] = useState([]);
    const [isPasswordsVaultUnlocked, setIsPasswordsVaultUnlocked] = useState(false);
    const [passwordsVaultError, setPasswordsVaultError] = useState('');
    const [isPasswordsLoading, setIsPasswordsLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scanResults, setScanResults] = useState(null);
    
    // ⭐️ Naye states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserFilter, setSelectedUserFilter] = useState(null); // User filter ke liye
    
    // --- Functions (Unchanged) ---
    const handleDarkWebScan = async () => {
        setIsScanning(true);
        setScanResults(null);
        setMessage('');
        setError('');
        if (!currentUser || !currentUser.email) {
            setError("Authentication error: Admin user email not found.");
            setIsScanning(false);
            return;
        }
        await logSensitiveAction(currentUser.email, `Initiated Global Dark Web Leak Exposure Scan.`, 'security');
        const { allCredentials, usersData } = await fetchAllCredentialsData();
        const MOCK_LEAK_DATABASE_EMAILS = ['arpitsinghyadav56@gmail.com', 'test@example.com'];
        const MOCK_LEAK_DATABASE_PASSWORDS = ['Arpit1432@269', 'password123'];
        const exposedUsersMap = new Map();
        usersData.forEach(user => {
            if (MOCK_LEAK_DATABASE_EMAILS.includes(user.email.toLowerCase())) {
                exposedUsersMap.set(user.email, { email: user.email, username: user.username, exposureType: 'Email Breach' });
            }
        });
        allCredentials.forEach(p => {
            if (MOCK_LEAK_DATABASE_PASSWORDS.includes(p.password)) {
                if (!exposedUsersMap.has(p.userEmail)) {
                    exposedUsersMap.set(p.userEmail, { email: p.userEmail, username: p.ownerName, exposureType: 'Password Exposure' });
                }
            }
        });
        await new Promise(resolve => setTimeout(resolve, 2500));
        const results = {
            exposedCount: exposedUsersMap.size,
            exposedUsers: Array.from(exposedUsersMap.values())
        };
        setScanResults(results);
        setIsScanning(false);
        if (results.exposedCount > 0) {
            setError(`SECURITY ALERT: ${results.exposedCount} accounts found exposed in mock breach data! Immediate action is recommended.`);
            await logSensitiveAction(currentUser.email, `Scan detected ${results.exposedCount} exposed users.`, 'danger');
        } else {
            setMessage('Global Dark Web Scan complete. No exposed accounts found.');
            await logSensitiveAction(currentUser.email, `Scan detected 0 exposed users.`, 'info');
        }
    };
    const fetchAuditLogs = async () => {
        try {
            const logsQuery = query(
                collection(db, 'audit_logs'),
                orderBy('timestamp', 'desc'),
                limit(10)
            );
            const logSnapshot = await getDocs(logsQuery);
            const logsData = logSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                time: doc.data().timestamp ? formatDate(doc.data().timestamp) : 'N/A'
            }));
            setAuditLogs(logsData);
        } catch (err) {
            console.error("Error fetching audit logs:", err);
        }
    };
    const fetchAllPasswords = useCallback(async () => {
        setAllPasswords([]);
        setIsPasswordsLoading(true);
        setPasswordsVaultError('');
        if (!currentUser || !currentUser.email) {
            setPasswordsVaultError("Authentication error: Admin user not logged in.");
            setIsPasswordsLoading(false);
            return;
        }
        const adminEmail = currentUser.email;
        try {
            const { allCredentials: fetchedCredentials } = await fetchAllCredentialsData();
            setAllPasswords(fetchedCredentials);
            setIsPasswordsVaultUnlocked(true);
            setPasswordsVaultError('');
            await logSensitiveAction(adminEmail, `UNLOCKED/REFRESHED and viewed ${fetchedCredentials.length} total user credentials.`, 'danger');
            showToast('All user passwords successfully fetched.', 'success');
        } catch (err) {
            setPasswordsVaultError("Failed to fetch all passwords. Check Firestore rules and connection.");
            await logSensitiveAction(adminEmail, `FAILED to view all user credentials (Database Error).`, 'danger');
        } finally {
            setIsPasswordsLoading(false);
        }
    }, [currentUser, showToast]);
    const fetchAllUsers = useCallback(async (shouldSetLoading = true) => {
        if(shouldSetLoading) setLoading(true);
        setError('');
        let healthCount = { weak: 0, medium: 0, strong: 0, total: 0 };
        const userList = [];
        try {
            const usersCollectionRef = collection(db, 'users');
            const userDocs = await getDocs(usersCollectionRef);
            for (const userDoc of userDocs.docs) {
                const userData = { ...userDoc.data(), uid: userDoc.id };
                const passwordsCollectionRef = collection(db, 'users', userData.uid, 'passwords');
                const passwordDocs = await getDocs(passwordsCollectionRef);
                const passwordCount = passwordDocs.size;
                passwordDocs.docs.forEach(pwDoc => {
                    const pwData = pwDoc.data();
                    if (pwData.password) {
                        const strength = calculateStrength(pwData.password).text;
                        if (strength === 'Weak') healthCount.weak++;
                        if (strength === 'Medium') healthCount.medium++;
                        if (strength === 'Strong') healthCount.strong++;
                        healthCount.total++;
                    }
                });
                const lastUpdatedTimestamp = userDoc.data().lastUpdated;
                const createdAtTimestamp = userDoc.data().createdAt;
                const lastLogin = lastUpdatedTimestamp || createdAtTimestamp;
                userList.push({
                    ...userData,
                    passwordCount,
                    isBanned: !!userData.isBanned,
                    isAdmin: !!userData.isAdmin,
                    isLocked: !!userData.isLocked,
                    lastLogin: lastLogin ? formatDate(lastLogin) : 'N/A'
                });
            }
            setUsers(userList);
            setSystemHealth(healthCount);
            await fetchAuditLogs();
        } catch (err) {
            console.error("Error fetching users:", err);
            setError("Failed to load user data. Check Firestore rules and connection.");
        } finally {
            if(shouldSetLoading) setLoading(false);
        }
    }, []);
    useEffect(() => {
        fetchAllUsers();
    }, [fetchAllUsers]);

    // --- User Action Functions (Unchanged) ---
    const handleToggleStatus = async (uid, currentStatus, email) => {
        const newStatus = !currentStatus;
        setMessage('');
        const action = `${newStatus ? 'Banned' : 'Activated'} user: ${email}`;
        try {
            const userDocRef = doc(db, 'users', uid);
            await updateDoc(userDocRef, { isBanned: newStatus });
            setUsers(users.map(u => u.uid === uid ? { ...u, isBanned: newStatus } : u));
            setMessage(`User ${email} successfully ${newStatus ? 'DISABLED' : 'ACTIVATED'}.`);
            await logSensitiveAction(currentUser.email, action, newStatus ? 'danger' : 'security');
        } catch (err) {
            setError(`Failed to update status for user ${email}. Check Firebase rules.`);
            console.error(err);
        }
    };
    const handleForcePasswordReset = async (email) => {
        setMessage('');
        const action = `Sent password reset email to: ${email}`;
        try {
            await sendPasswordResetEmail(auth, email);
            setMessage(`Password reset email sent to ${email}. The user will be required to change their password.`);
            await logSensitiveAction(currentUser.email, action, 'info');
        } catch (err) {
            setError(`Failed to send password reset email for ${email}. Error: ${err.message}`);
            console.error(err);
        }
    };
    const handlePurgeCredentials = async (uid, username) => {
        if (!window.confirm(`DANGER: Are you sure you want to PERMANENTLY PURGE ALL credentials for ${username}? This is irreversible.`)) {
            return;
        }
        setMessage('');
        let purgedCount = 0;
        const action = `PURGED ALL credentials for user: ${username}`;
        try {
            const passwordsRef = collection(db, 'users', uid, 'passwords');
            const snapshot = await getDocs(passwordsRef);
            purgedCount = snapshot.size;
            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            await fetchAllUsers(false); 
            if (isPasswordsVaultUnlocked) {
                fetchAllPasswords();
            }
            setMessage(`All ${purgedCount} credentials purged for user ${username}.`);
            await logSensitiveAction(currentUser.email, action, 'danger');
        } catch (err) {
            setError(`Failed to purge credentials for ${username}. Check Firebase rules.`);
            console.error(err);
        }
    };
    const handleToggleAdmin = async (uid, currentAdminStatus, username, email) => {
        const newStatus = !currentAdminStatus;
        setMessage('');
        const action = `${newStatus ? 'Granted Admin' : 'Revoked Admin'} status for user: ${email}`;
        try {
            const userDocRef = doc(db, 'users', uid);
            await updateDoc(userDocRef, { isAdmin: newStatus });
            setUsers(users.map(u => u.uid === uid ? { ...u, isAdmin: newStatus } : u));
            setMessage(`User ${username} successfully set as ${newStatus ? 'ADMIN' : 'STANDARD USER'}.`);
            await logSensitiveAction(currentUser.email, action, 'security');
        } catch (err) {
            setError(`Failed to update admin status for user ${username}.`);
            console.error(err);
        }
    };
    const handleUnlockUser = async (uid, email) => {
        setMessage('');
        const action = `Manually UNLOCKED account for user: ${email}`;
        try {
            const userDocRef = doc(db, 'users', uid);
            await updateDoc(userDocRef, { isLocked: false });
            setUsers(users.map(u => u.uid === uid ? { ...u, isLocked: false } : u));
            setMessage(`User ${email} successfully UNLOCKED.`);
            await logSensitiveAction(currentUser.email, action, 'security');
        } catch (err) {
            setError(`Failed to unlock user ${email}. Check Firebase rules.`);
            console.error(err);
        }
    };
    const handleDeletePassword = async (passId, uid) => {
         if (!window.confirm(`Confirm: Delete this password permanently?`)) {
             return;
         }
        try {
            const passRef = doc(db, 'users', uid, 'passwords', passId);
            await deleteDoc(passRef);
            setAllPasswords(allPasswords.filter(p => p.id !== passId));
            await fetchAllUsers(false); // Refresh password count
            showToast('Password Deleted', 'success');
            await logSensitiveAction(currentUser.email, `Deleted password (ID: ${passId}) for user (UID: ${uid})`, 'danger');
        } catch (error) {
            showToast('Delete Failed', 'error');
            console.error(error);
        }
    };

    // ⭐️ Dropdown ke liye options
    const userFilterOptions = useMemo(() => 
        [{ value: null, label: '[ALL USERS]' }, // Ek "All Users" option add karein
        ...users.map(user => ({
            value: user.uid,
            label: `${user.username || 'User'} (${user.email})`
        }))], 
    [users]);
    
    // ⭐️ Dropdown ke liye styles
    const hackerSelectStyles = {
        control: (styles) => ({ 
            ...styles, 
            backgroundColor: 'var(--hacker-bg)', 
            border: '1px solid var(--hacker-green-dim)', 
            borderRadius: '0px', 
            minWidth: '250px',
            boxShadow: 'none',
            '&:hover': { borderColor: 'var(--hacker-green)' }
        }),
        menu: (styles) => ({ ...styles, backgroundColor: 'var(--hacker-bg-light)', border: '1px solid var(--hacker-green-dim)', zIndex: 1102, borderRadius: 0 }),
        option: (styles, { isFocused, isSelected }) => ({ 
            ...styles, 
            backgroundColor: isSelected ? 'var(--hacker-green)' : isFocused ? 'var(--hacker-green-dim)' : 'transparent', 
            color: isSelected ? 'var(--hacker-bg)' : 'var(--hacker-green)', 
            ':active': { backgroundColor: 'var(--hacker-green-dim)' },
            fontFamily: 'var(--font-body)'
        }),
        singleValue: (styles) => ({ ...styles, color: 'var(--hacker-green)', fontFamily: 'var(--font-body)' }),
        placeholder: (styles) => ({...styles, color: 'var(--hacker-green-dim)', fontFamily: 'var(--font-body)'}),
        input: (styles) => ({...styles, color: 'var(--hacker-green)'})
    };
    
    // ⭐️ `filteredPasswords` logic (Updated)
    const filteredPasswords = useMemo(() => {
        return allPasswords.filter(p => {
            // User filter check
            const matchesUser = !selectedUserFilter || p.uid === selectedUserFilter.value;
            
            // Search query check
            if (!searchQuery) return matchesUser;
            
            const queryTerm = searchQuery.toLowerCase();
            const matchesSearch = (
                p.userEmail.toLowerCase().includes(queryTerm) ||
                p.ownerName.toLowerCase().includes(queryTerm) ||
                p.site.toLowerCase().includes(queryTerm) ||
                p.username.toLowerCase().includes(queryTerm) ||
                p.category.toLowerCase().includes(queryTerm)
            );

            return matchesUser && matchesSearch;
        });
    }, [allPasswords, selectedUserFilter, searchQuery]);


    if (loading) return (
        <div className="admin-panel-container hacker-loading-screen">
             <FiTerminal className="hacker-loading-icon" />
             <p>INITIALIZING ADMIN CONSOLE...</p>
        </div>
    );


    return (
        <div className="admin-panel-container">
            {showPinSetup && <AdminPinSetupForm currentUser={currentUser} onClose={() => setShowPinSetup(false)} />}
            
            {/* ⭐️ Main Hacker Panel ⭐️ */}
            <div className="hacker-panel">
                <div className="hacker-panel-header">
                    <h1 className="hacker-title"><FiTerminal /> <span>SENTINEL</span>_CONSOLE</h1>
                    <button className="hacker-btn-pin" onClick={() => setShowPinSetup(true)}>
                        <FiSettings /> <span>PIN_CFG</span>
                    </button>
                    <div className="scanlines"></div>
                </div>

                {message && <p className="message-box success" style={{maxWidth: '100%', display: 'block'}}>{message}</p>}
                {error && <p className="message-box error" style={{maxWidth: '100%', display: 'block'}}>{error}</p>}
                
                {/* --- Stats Section --- */}
                <div className="hacker-stats-grid">
                    <div className="hacker-stat">
                        <span className="stat-value">{users.length}</span>
                        <span className="stat-label"><FiUsers /> TOTAL_USERS</span>
                    </div>
                    <div className="hacker-stat">
                        <span className="stat-value">{systemHealth.total}</span>
                        <span className="stat-label"><FiKey /> TOTAL_PASSWORDS</span>
                    </div>
                    <div className="hacker-stat admin">
                        <span className="stat-value">{users.filter(u => u.isAdmin).length}</span>
                        <span className="stat-label"><FiUserCheck /> ADMINS</span>
                    </div>
                    <div className="hacker-stat banned">
                        <span className="stat-value">{users.filter(u => u.isBanned || u.isLocked).length}</span>
                        <span className="stat-label"><FiUserX /> BANNED/LOCKED</span>
                    </div>
                </div>

                {/* --- Dark Web Scan Section --- */}
                <div className="hacker-section" style={{border: '1px solid var(--accent-blue)'}}>
                    <div className="hacker-section-title">
                        <h2>&gt; DARK_WEB_SCANNER::MOCK</h2>
                        <div className="hacker-title-glow" style={{backgroundColor: 'var(--accent-blue)', boxShadow: '0 0 5px var(--accent-blue)'}}></div>
                    </div>
                    <p className="info-label">Scans all assets against a mock breach database.</p>
                    <button
                        className="hacker-btn scan"
                        onClick={handleDarkWebScan}
                        disabled={isScanning}
                    >
                        <FiCloudDrizzle />
                        <span>{isScanning ? 'SCANNING...' : 'INITIATE_SCAN'}</span>
                    </button>
                    {isScanning && <div className="scanner-bar"></div>}
                    {scanResults && (
                        <div className="scan-results">
                            <h4>Scan Result: {scanResults.exposedCount} Exposed Accounts</h4>
                            {scanResults.exposedUsers.map((user, index) => (
                                <p key={index} className="exposed-item">
                                    <FiAlertTriangle /> <strong>{user.email}</strong> ({user.username}) - {user.exposureType}
                                </p>
                            ))}
                        </div>
                    )}
                </div>

                {/* --- Password Health Section --- */}
                <div className="hacker-section">
                    <div className="hacker-section-title">
                        <h2>&gt; VAULT_SECURITY_HEALTH</h2>
                        <div className="hacker-title-glow"></div>
                    </div>
                    <div className="health-bars-container" style={{marginTop: '1rem'}}>
                        <HealthBar label="Strong" count={systemHealth.strong} total={systemHealth.total} color="#39ff14" />
                        <HealthBar label="Medium" count={systemHealth.medium} total={systemHealth.total} color="#00aaff" />
                        <HealthBar label="Weak" count={systemHealth.weak} total={systemHealth.total} color="var(--accent-orange)" />
                    </div>
                </div>


                {/* --- User Table Section --- */}
                <div className="hacker-section">
                    <div className="hacker-section-title" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <h2>&gt; USER_TABLE::ACTIONS</h2>
                        <button className="hacker-btn refresh" onClick={() => fetchAllUsers(false)} title="Refresh User List">
                            <FiRefreshCw />
                        </button>
                    </div>
                
                    <div className="admin-table-wrapper">
                        {/* ⭐️ DESKTOP TABLE ⭐️ */}
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>USER</th>
                                    <th>STATUS</th>
                                    <th>PASSWORDS</th>
                                    <th>LAST_ACTIVITY</th>
                                    <th>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.uid} className={user.isBanned ? 'banned' : (user.isLocked ? 'locked' : '')}>
                                        <td data-label="USER">
                                            <strong>{user.username || 'N/A'}</strong>
                                            <span>{user.email}</span>
                                        </td>
                                        <td data-label="STATUS">
                                            {user.isLocked ? (
                                                <span className="hacker-pill locked">LOCKED</span>
                                            ) : (
                                                <span className={`hacker-pill ${user.isBanned ? 'banned' : 'active'}`}>
                                                    {user.isBanned ? 'BANNED' : 'ACTIVE'}
                                                </span>
                                            )}
                                            <span className={`hacker-pill ${user.isAdmin ? 'admin' : 'user'}`}>
                                                {user.isAdmin ? 'ADMIN' : 'USER'}
                                            </span>
                                        </td>
                                        <td data-label="PASSWORDS">{user.passwordCount}</td>
                                        <td data-label="LAST_ACTIVITY">{user.lastLogin}</td>
                                        <td data-label="ACTIONS" className="hacker-actions">
                                            {user.isLocked ? (
                                                <button onClick={() => handleUnlockUser(user.uid, user.email)} className="hacker-btn unlock" title="Unlock User">
                                                    <FiPlayCircle />
                                                </button>
                                            ) : (
                                                <>
                                                    <button onClick={() => handleToggleAdmin(user.uid, user.isAdmin, user.username, user.email)} className="hacker-btn admin" title={user.isAdmin ? 'Revoke Admin' : 'Grant Admin'}>
                                                        {user.isAdmin ? <FiUserX /> : <FiUserCheck />}
                                                    </button>
                                                    <button onClick={() => handleToggleStatus(user.uid, user.isBanned, user.email)} className="hacker-btn ban" title={user.isBanned ? 'Unban User' : 'Ban User'}>
                                                        {user.isBanned ? <FiUnlock /> : <FiLock />}
                                                    </button>
                                                    <button onClick={() => handleForcePasswordReset(user.email)} className="hacker-btn reset" title="Force Password Reset">
                                                        <FiRepeat />
                                                    </button>
                                                    <button onClick={() => handlePurgeCredentials(user.uid, user.username)} className="hacker-btn delete" title="Purge All Credentials">
                                                        <FiAlertTriangle />
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* ⭐️ MOBILE CARD VIEW ⭐️ */}
                        <div className="admin-mobile-cards">
                            {users.map(user => (
                                <div key={user.uid} className={`hacker-card ${user.isBanned ? 'banned' : (user.isLocked ? 'locked' : '')}`}>
                                    <div className="card-header">
                                        <span className="card-email">{user.username || user.email}</span>
                                        <div>
                                            {user.isLocked ? (
                                                <span className="hacker-pill locked">LOCKED</span>
                                            ) : (
                                                <span className={`hacker-pill ${user.isBanned ? 'banned' : 'active'}`}>
                                                    {user.isBanned ? 'BANNED' : 'ACTIVE'}
                                                </span>
                                            )}
                                            <span className={`hacker-pill ${user.isAdmin ? 'admin' : 'user'}`}>
                                                {user.isAdmin ? 'ADMIN' : 'USER'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="card-body">
                                        <span className="card-label">EMAIL:</span>
                                        <span className="card-value">{user.email}</span>
                                        <span className="card-label">PASSWORDS:</span>
                                        <span className="card-value">{user.passwordCount}</span>
                                        <span className="card-label">LAST_ACTIVITY:</span>
                                        <span className="card-value">{user.lastLogin}</span>
                                    </div>
                                    <div className="card-actions">
                                        {user.isLocked ? (
                                            <button onClick={() => handleUnlockUser(user.uid, user.email)} className="hacker-btn unlock">
                                                <FiPlayCircle /> <span>UNLOCK</span>
                                            </button>
                                        ) : (
                                            <>
                                                <button onClick={() => handleToggleAdmin(user.uid, user.isAdmin, user.username, user.email)} className="hacker-btn admin">
                                                    {user.isAdmin ? <FiUserX /> : <FiUserCheck />} <span>{user.isAdmin ? 'REVOKE' : 'GRANT'}</span>
                                                </button>
                                                <button onClick={() => handleToggleStatus(user.uid, user.isBanned, user.email)} className="hacker-btn ban">
                                                    {user.isBanned ? <FiUnlock /> : <FiLock />} <span>{user.isBanned ? 'UNBAN' : 'BAN'}</span>
                                                </button>
                                                <button onClick={() => handleForcePasswordReset(user.email)} className="hacker-btn reset">
                                                    <FiRepeat /> <span>RESET</span>
                                                </button>
                                                <button onClick={() => handlePurgeCredentials(user.uid, user.username)} className="hacker-btn delete">
                                                    <FiAlertTriangle /> <span>PURGE</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>


                {/* --- All Passwords Table Section --- */}
                <div className="hacker-section" style={{borderColor: 'var(--hacker-red)'}}>
                    <div className="hacker-section-title">
                        <h2 style={{color: 'var(--hacker-red)'}}>&gt; GLOBAL_VAULT::{isPasswordsVaultUnlocked ? "ACCESS_GRANTED" : "ACCESS_DENIED"}</h2>
                        <div className="hacker-title-glow" style={{backgroundColor: 'var(--hacker-red)', boxShadow: '0 0 5px var(--hacker-red)'}}></div>
                    </div>

                    {!isPasswordsVaultUnlocked && (
                        <LockOverlay
                            onUnlock={fetchAllPasswords}
                            setPasswordsVaultError={setPasswordsVaultError}
                            passwordsVaultError={passwordsVaultError}
                            currentUser={currentUser}
                        />
                    )}

                    {isPasswordsVaultUnlocked && (
                        <>
                            {/* ⭐️ Yahaan Select component add kiya gaya hai */}
                            <div className="admin-controls-header">
                                <Select
                                    options={userFilterOptions}
                                    styles={hackerSelectStyles}
                                    onChange={setSelectedUserFilter}
                                    isClearable
                                    isSearchable
                                    placeholder="[FILTER BY USER...]"
                                    defaultValue={userFilterOptions[0]} // Default "ALL USERS"
                                />
                                <div className="search-wrapper" style={{flexGrow: 1}}>
                                    <FiSearch />
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="Search by site, username, etc..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <button className="hacker-btn refresh" onClick={fetchAllPasswords} disabled={isPasswordsLoading}>
                                    <FiRefreshCw style={{animation: isPasswordsLoading ? 'spin 1s linear infinite' : 'none'}} />
                                </button>
                                <button className="hacker-btn-lock"
                                    onClick={() => {
                                        setIsPasswordsVaultUnlocked(false);
                                        setPasswordsVaultError('');
                                        setSearchQuery('');
                                        setSelectedUserFilter(null); // Filter ko reset karein
                                        showToast('Admin Vault Locked.', 'info');
                                        navigate('/admin'); 
                                    }}
                                >
                                    <FiLock /> <span>RE-LOCK</span>
                                </button>
                            </div>

                            <div className="admin-table-wrapper">
                                {/* ⭐️ DESKTOP TABLE ⭐️ */}
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>OWNER</th>
                                            <th>SITE</th>
                                            <th>USERNAME</th>
                                            <th>PASSWORD</th>
                                            <th>CATEGORY</th>
                                            <th>ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPasswords.map(p => (
                                            <tr key={p.id}>
                                                <td data-label="OWNER">
                                                    <strong>{p.ownerName}</strong>
                                                    <span>{p.userEmail}</span>
                                                </td>
                                                <td data-label="SITE">{p.site}</td>
                                                <td data-label="USERNAME">{p.username}</td>
                                                <td data-label="PASSWORD" className="pass-cell">{p.password}</td>
                                                <td data-label="CATEGORY">{p.category}</td>
                                                <td data-label="ACTIONS" className="hacker-actions">
                                                    <button onClick={() => handleDeletePassword(p.id, p.uid)} className="hacker-btn delete" title="Delete Password">
                                                        <FiTrash2 />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* ⭐️ MOBILE CARD VIEW ⭐️ */}
                                <div className="admin-mobile-cards">
                                    {filteredPasswords.map(p => (
                                        <div key={p.id} className="hacker-card">
                                            <div className="card-header">
                                                <span className="card-email">{p.site}</span>
                                            </div>
                                            <div className="card-body">
                                                <span className="card-label">OWNER:</span>
                                                <span className="card-value">{p.userEmail}</span>
                                                <span className="card-label">USERNAME:</span>
                                                <span className="card-value">{p.username}</span>
                                                <span className="card-label">PASSWORD:</span>
                                                <span className="card-value pass-cell">{p.password}</span>
                                                <span className="card-label">CATEGORY:</span>
                                                <span className="card-value">{p.category}</span>
                                            </div>
                                            <div className="card-actions">
                                                <button onClick={() => handleDeletePassword(p.id, p.uid)} className="hacker-btn delete">
                                                    <FiTrash2 /> <span>DELETE</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {filteredPasswords.length === 0 && (
                                    <p className="mobile-loading">
                                        {searchQuery || (selectedUserFilter && selectedUserFilter.value) ? `No results found for applied filters.` : "No passwords found."}
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>


                {/* --- Audit Log Section --- */}
                <div className="hacker-section">
                    <div className="hacker-section-title">
                        <h2>&gt; SENSITIVE_ACTION_LOG::TAIL</h2>
                        <div className="hacker-title-glow"></div>
                    </div>
                    <div className="audit-log-list">
                        {auditLogs.length > 0 ? (
                            auditLogs.map((log) => (
                                <div key={log.id} className="log-item">
                                    <span className="log-time">[{log.time}]</span>
                                    <span className={`log-level ${log.level}`}>{log.level.toUpperCase()}</span>
                                    <span className="log-user" title={log.userEmail}>{log.userEmail}</span>
                                    <span className="log-action">{log.action}</span>
                                </div>
                            ))
                        ) : (
                            <p className="mobile-loading">No recent sensitive actions logged.</p>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}