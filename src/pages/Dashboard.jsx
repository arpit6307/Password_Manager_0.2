// src/pages/Dashboard.jsx
// ⭐️ ERROR FIX: 'doc.autoTable is not a function' ko theek kiya gaya hai

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../firebase-config'; 
import { collection, query, onSnapshot, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore'; 
import { signOut } from 'firebase/auth'; 
import AddPasswordForm from '../components/AddPasswordForm';
import PasswordList from '../components/PasswordList';
import Select from 'react-select';
import { FiLock, FiUnlock, FiRefreshCw, FiSearch, FiXCircle, FiCamera, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi'; 

// IMPORTS FOR TOAST AND PDF EXPORT
import { useToast } from '../context/ToastContext'; 
// ====================================================================
// ⭐️ ERROR FIX: 'jsPDF' ko default se named import mein badla gaya hai
// ====================================================================
import { jsPDF } from 'jspdf'; 
import 'jspdf-autotable'; 
// ====================================================================

// Face API Imports
import * as faceapi from 'face-api.js';
import { loadModels, createFaceMatcher } from '../faceApiHelper';

// --- selectStyles (Unchanged) ---
const selectStyles = {
    control: (styles) => ({ ...styles, backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px', boxShadow: 'none' }),
    menu: (styles) => ({ ...styles, backgroundColor: 'var(--bg-light)', border: '1px solid var(--border-color)' }),
    option: (styles, { isFocused, isSelected }) => ({ ...styles, backgroundColor: isSelected ? 'var(--accent-blue)' : isFocused ? 'var(--bg-dark)' : 'var(--bg-light)', color: isSelected ? 'var(--bg-dark)' : 'var(--text-primary)' }),
    singleValue: (styles) => ({ ...styles, color: 'var(--text-primary)' }),
};


// --- FinalWarningModal (Unchanged) ---
function FinalWarningModal({ onClose }) {
    return (
        <div className="modal-backdrop" style={{ zIndex: 1101 }}> 
            <div className="modal-content card" style={{ maxWidth: '450px', textAlign: 'center', borderColor: 'var(--accent-orange)' }}>
                <FiAlertTriangle size={48} color="var(--accent-orange)" style={{ marginBottom: '1rem' }} />
                <h3 className="card-title" style={{ color: 'var(--accent-orange)' }}>Final Warning!</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
                    You have only <strong>1 attempt remaining</strong>.
                    <br />
                    One more failed attempt will <strong>permanently lock</strong> your account.
                </p>
                <div className="modal-actions" style={{ justifyContent: 'center' }}>
                    <button
                        className="btn btn-primary"
                        onClick={onClose}
                        style={{ width: 'auto', padding: '10px 20px', background: 'var(--accent-orange)', color: 'var(--bg-dark)' }}
                    >
                        OK, I Understand
                    </button>
                </div>
            </div>
        </div>
    );
}


// --- VaultPinLock Component (Unchanged) ---
function VaultPinLock({ onUnlock, onClose, setModalError, modalError }) {
    const [pin, setPin] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const { currentUser } = useAuth();
    const { showToast } = useToast();
    
    // Face Unlock States
    const videoRef = useRef(null);
    const [scanMessage, setScanMessage] = useState('Loading Face Models...');
    const [faceMatcher, setFaceMatcher] = useState(null);
    
    // Fallback state
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

    const lockAccount = useCallback(async () => {
        setModalError('Too many failed attempts! Account is locking...');
        setIsChecking(true); 
        try {
            const docRef = doc(db, 'users', currentUser.uid);
            await updateDoc(docRef, { isLocked: true });
            
            showToast('Account Locked! Please contact admin.', 'error', 5000);
            
            setTimeout(async () => {
                await signOut(auth);
            }, 2000);

        } catch (err) {
            console.error("Failed to lock account:", err);
            setModalError('Error locking account. Please refresh.');
            setIsChecking(false);
        }
    }, [currentUser.uid, showToast]);

    // Check failed attempts
    useEffect(() => {
        if (failedAttempts >= 3) {
            lockAccount();
        }
    }, [failedAttempts, lockAccount]);


    // PIN Unlock Logic
    const handlePinSubmit = async (e) => {
        e.preventDefault();
        setModalError('');
        setIsChecking(true);
        if (pin.length !== 4) {
            setModalError('PIN must be 4 digits.');
            setIsChecking(false);
            return;
        }
        try {
            const docRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(docRef);
            const storedPin = docSnap.exists() ? docSnap.data().vaultPin : null;
            if (!storedPin) {
                setModalError("Vault PIN is not set. Please set one in the Profile page.");
            } else if (storedPin === pin) {
                stopWebcam();
                onUnlock();
            } else {
                const newCount = failedAttempts + 1;
                setFailedAttempts(newCount);
                if (newCount === 2) {
                    setShowFinalWarningModal(true);
                    setModalError(''); 
                } else if (newCount >= 3) {
                    lockAccount();
                } else {
                    setModalError(`Incorrect PIN. ${3 - newCount} attempts remaining.`);
                }
            }
        } catch (err) {
            console.error("PIN Check Error:", err);
            setModalError('An error occurred during verification.');
        }
        setIsChecking(false);
    };

    // Video Play Logic
    const onVideoPlay = useCallback(() => {
        setScanMessage("Scanning... Hold still.");
        
        const scanStartTime = Date.now(); 

        const intervalId = setInterval(async () => {
            if (Date.now() - scanStartTime > 7000) { 
                stopWebcam();
                setModalError("Face scan failed. Please use PIN.");
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
                    // SUCCESS
                    stopWebcam();
                    setScanMessage("Face Recognized!");
                    setTimeout(() => {
                        onUnlock();
                    }, 500);
                } else {
                    // FAILURE
                    const newCount = failedAttempts + 1;
                    setFailedAttempts(newCount);
                    stopWebcam();
                    setShowPinFallback(true); 

                    if (newCount === 2) {
                        setShowFinalWarningModal(true);
                        setModalError(''); 
                    } else if (newCount >= 3) {
                        lockAccount();
                    } else {
                        setModalError(`Face not recognized. ${3 - newCount} attempts remaining.`);
                    }
                }
            } else {
                setScanMessage("Scanning... No face detected.");
            }
        }, 1000); 

        scanIntervalIdRef.current = intervalId; 

    }, [faceMatcher, onUnlock, stopWebcam, failedAttempts, lockAccount]);


    // Automatic Face Unlock Logic
    const startAutomaticFaceUnlock = useCallback(async () => {
        setModalError('');
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
                setModalError("No face data registered. Please use PIN.");
                setShowPinFallback(true); 
                return;
            }
        } catch (err) {
            setModalError("Could not fetch face data. Please use PIN.");
            setShowPinFallback(true);
            return;
        }

        const matcher = createFaceMatcher(savedDescriptors);
        if (!matcher) {
             setModalError("Failed to create face matcher. Please use PIN.");
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
            setModalError("Could not access webcam. Please use PIN.");
            setShowPinFallback(true);
        }
    }, [currentUser.uid]);
    
    // Start face scan on modal open
    useEffect(() => {
        if (failedAttempts >= 3) return; 
        
        startAutomaticFaceUnlock();

        // Cleanup
        return () => {
            stopWebcam();
        };
    }, [startAutomaticFaceUnlock, stopWebcam, failedAttempts]); 
    

    const handleCloseModal = () => {
        stopWebcam();
        onClose();
    };

    return (
        <div className="modal-backdrop">
            {showFinalWarningModal && (
                <FinalWarningModal onClose={() => {
                    setShowFinalWarningModal(false);
                    setShowPinFallback(true);
                    setModalError("FINAL WARNING: 1 attempt remaining.");
                }} />
            )}

            <div className="modal-content card" style={{ maxWidth: '400px', textAlign: 'center', display: showFinalWarningModal ? 'none' : 'block' }}>
                
                {!showPinFallback && (
                    <>
                        <FiCamera size={48} color="var(--accent-blue)" style={{ marginBottom: '1.5rem' }} />
                        <h3 className="card-title" style={{ fontSize: '1.8rem' }}>Face <span>Unlock</span></h3>
                        
                        <div style={{ margin: '1rem 0', textAlign: 'center', minHeight: '270px' }}>
                            <video ref={videoRef} autoPlay muted playsInline className="webcam-feed" onPlay={onVideoPlay} />
                            <p className="info-label" style={{ 
                                color: scanMessage.includes("Failed") ? 'var(--accent-orange)' : (scanMessage.includes("Recognized") ? '#39ff14' : 'var(--accent-blue)'),
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
                        <FiLock size={48} color="var(--accent-blue)" style={{ marginBottom: '1.5rem' }} />
                        <h3 className="card-title" style={{ fontSize: '1.8rem' }}>Vault <span>Locked</span></h3>
                        
                        {modalError && (
                            <p className="message-box error" style={modalError.includes("FINAL WARNING") ? {color: '#FFD700', borderColor: '#FFD700', background: 'rgba(255, 215, 0, 0.1)'} : {}}>
                                {modalError.includes("FINAL WARNING") && <FiAlertTriangle style={{marginRight: '0.5rem', marginBottom: '-2px'}} />}
                                {modalError}
                            </p>
                        )}
                        
                        <form onSubmit={handlePinSubmit}>
                            <div className="form-group">
                                <label className="form-label">Enter 4-Digit Vault PIN</label>
                                <input
                                    className="input-field"
                                    type="password"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.slice(0, 4))}
                                    placeholder="****"
                                    maxLength="4"
                                    pattern="\d{4}"
                                    required
                                    autoFocus
                                    disabled={failedAttempts >= 3} 
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={isChecking || failedAttempts >= 3} style={{width: '100%'}}>
                                {failedAttempts >= 3 ? 'ACCOUNT LOCKED' : (isChecking ? 'Unlocking...' : 'Unlock with PIN')}
                            </button>
                        </form>
                    </>
                )}

                 <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={handleCloseModal} 
                    disabled={isChecking} 
                    style={{width: '100%', marginTop: '1rem', background: 'var(--bg-light)'}}
                >
                    <FiXCircle style={{marginRight: '0.5rem'}}/> Cancel
                </button>

            </div>
        </div>
    );
}
// --- END VAULT LOCK COMPONENT ---


// --- Dashboard Component (Unchanged logic, PDF function fixed) ---
export default function Dashboard() {
    const { currentUser } = useAuth();
    const { showToast } = useToast(); 
    const [passwords, setPasswords] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState({ value: 'all', label: 'All Categories' });
    const [loading, setLoading] = useState(true);
    const [isVaultUnlocked, setIsVaultUnlocked] = useState(false); 
    const [showLockModal, setShowLockModal] = useState(false);
    const [modalError, setModalError] = useState('');
    const [unsubscribe, setUnsubscribe] = useState(null); 

    const handleVaultUnlock = useCallback(() => {
        setIsVaultUnlocked(true);
        setShowLockModal(false);
    }, []); 

    const categories = [
        { value: 'all', label: 'All Categories' },
        { value: 'work', label: 'Work' },
        { value: 'social', label: 'Social' },
        { value: 'finance', label: 'Finance' },
        { value: 'entertainment', label: 'Entertainment' },
        { value: 'other', label: 'Other' },
    ];
    
    const fetchPasswords = useCallback(() => {
        if (!isVaultUnlocked || !currentUser?.uid) {
             setPasswords([]); 
             setLoading(false);
             return;
        }
        setLoading(true);
        if (unsubscribe) unsubscribe();
        const q = query(collection(db, 'users', currentUser.uid, 'passwords'), orderBy('site', 'asc'));
        const newUnsubscribe = onSnapshot(q, (querySnapshot) => {
            const passwordsData = [];
            querySnapshot.forEach((doc) => {
                passwordsData.push({ ...doc.data(), id: doc.id });
            });
            setPasswords(passwordsData);
            setLoading(false);
        }, (error) => {
            console.error("Firestore Listener Error:", error);
            setLoading(false);
            showToast('Failed to load credentials. Check network.', 'error');
        });
        setUnsubscribe(() => newUnsubscribe);
        return () => newUnsubscribe();
    }, [currentUser?.uid, isVaultUnlocked, showToast]);

    useEffect(() => {
        const cleanup = fetchPasswords();
        return cleanup;
    }, [fetchPasswords]);
    
    const handleReLock = () => {
        if (unsubscribe) {
            unsubscribe();
            setUnsubscribe(null);
        }
        setIsVaultUnlocked(false);
        setSearchTerm('');
        setSelectedCategory(categories[0]);
        showToast('Vault successfully locked.', 'info');
    };
    
    const handleRefresh = () => {
        showToast('Refreshing credentials...', 'info');
        fetchPasswords(); 
    };

    const filteredPasswords = passwords.filter(p =>
        (p.site.toLowerCase().includes(searchTerm.toLowerCase()) || p.username.toLowerCase().includes(searchTerm.toLowerCase()) || p.category.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedCategory.value === 'all' || p.category === selectedCategory.value)
    );

    // --- (Professional PDF Export function - FIXED) ---
    const exportData = () => {
        if (passwords.length === 0) {
            showToast('No credentials found to export.', 'error');
            return;
        }
        
        const pdfPassword = currentUser.email;
        
        try {
            // ⭐️ ERROR FIX: 'new jsPDF()' ka istemaal, kyunki 'jsPDF' ab ek class hai
            const doc = new jsPDF('p', 'mm', 'a4'); 
            const now = new Date();
            const filename = `SentinelVault_Export_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.pdf`;
            const pageHeight = doc.internal.pageSize.height;
            
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(40, 40, 40); 
            doc.text("SentinelVault", 14, 22);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(150, 150, 150); 
            doc.text("Confidential Credentials Export", 14, 28);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(40, 40, 40);
            doc.text("Report generated for:", 196, 22, { align: 'right' });

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 170, 255); 
            doc.text(currentUser.email, 196, 28, { align: 'right' });

            doc.setLineWidth(0.5);
            doc.setDrawColor(0, 170, 255);
            doc.line(14, 35, 196, 35);
            
            const tableColumn = ["Site / App Name", "Username / Email", "Password", "Category"];
            const tableRows = passwords.map(credential => [
                credential.site || 'N/A',
                credential.username || 'N/A',
                credential.password, 
                credential.category || 'other'
            ]);

            // ⭐️ YEH LINE AB KAAM KAREGI ⭐️
            doc.autoTable(tableColumn, tableRows, {
                startY: 45, 
                theme: 'grid', 
                headStyles: { 
                    fillColor: [44, 62, 80], 
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 11
                },
                styles: { 
                    fontSize: 10,
                    cellPadding: 3,
                    lineColor: [200, 200, 200], 
                    lineWidth: 0.1
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245] 
                },
                
                columnStyles: {
                    0: { cellWidth: 50 }, 
                    1: { cellWidth: 50 },
                    2: { 
                        font: 'courier', 
                        fontStyle: 'bold',
                        textColor: [211, 84, 0], 
                        cellWidth: 'auto'
                    }, 
                    3: { cellWidth: 30 }
                },
                
                didDrawPage: (data) => {
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'italic');
                    doc.setTextColor(150, 150, 150);
                    
                    doc.text(
                        "CONFIDENTIAL: This document is encrypted. Password is your registered email address.",
                        14,
                        pageHeight - 15
                    );
                    
                    doc.text(
                        "Page " + data.pageNumber,
                        196,
                        pageHeight - 15,
                        { align: 'right' }
                    );
                }
            });

            doc.save(filename, { 
                passphrase: pdfPassword,
                encryption: {
                    userPassword: pdfPassword,
                    ownerPassword: pdfPassword,
                    userPermissions: ['print', 'copy', 'annot-forms']
                }
            });

            showToast(`Encrypted PDF exported successfully! The password is your email: ${currentUser.email}`, 'success', 10000); 

        } catch (error) {
            console.error("PDF Export Error:", error);
            if (error.message && error.message.includes("doc.autoTable is not a function")) {
                showToast('Export failed. Please reload the page and try again.', 'error');
            } else {
                showToast('An unknown error occurred during PDF export.', 'error');
            }
        }
    };

    // --- (JSX/Return statement is unchanged) ---
    return (
        <div className="dashboard-layout">
            {showLockModal && (
                <VaultPinLock 
                    onUnlock={handleVaultUnlock} 
                    onClose={() => setShowLockModal(false)}
                    setModalError={setModalError}
                    modalError={modalError}
                />
            )}
            
            <header className="dashboard-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <h1 className="dashboard-title">My Vault</h1>
                    {!isVaultUnlocked ? (
                         <button 
                            className="btn btn-primary" 
                            onClick={() => setShowLockModal(true)}
                            style={{ width: 'auto', padding: '10px 20px', background: 'var(--accent-blue)', color: 'var(--bg-dark)' }}
                            title="Unlock the vault with your PIN"
                        >
                            <FiUnlock style={{marginRight: '0.5rem'}}/> Unlock Vault
                        </button>
                    ) : (
                        <button 
                            className="btn btn-secondary" 
                            onClick={handleReLock}
                            style={{ width: 'auto', padding: '8px 15px', background: 'var(--accent-orange)', color: 'var(--bg-dark)' }}
                            title="Lock the vault immediately"
                        >
                            <FiLock style={{marginRight: '0.5rem'}}/> Re-Lock Vault
                        </button>
                    )}
                    
                    {isVaultUnlocked && (
                        <button 
                            className="btn btn-secondary" 
                            onClick={handleRefresh}
                            style={{ width: 'auto', padding: '8px 15px' }}
                            title="Refresh Credentials"
                        >
                            <FiRefreshCw style={{marginRight: '0.5rem'}}/> Refresh Data
                        </button>
                    )}
                </div>
                
                <div className="dashboard-controls dashboard-filters" style={{flexWrap: 'wrap'}}>
                    <div className="password-generator" style={{width: '300px', position: 'relative'}}>
                        <input
                            type="text"
                            className="input-field search-input"
                            placeholder="Search by Site or Username..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '40px' }}
                            disabled={!isVaultUnlocked}
                        />
                        <FiSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}/>
                    </div>
                    
                    <Select
                        className="category-filter"
                        options={categories}
                        styles={selectStyles}
                        defaultValue={categories[0]}
                        onChange={setSelectedCategory}
                        isDisabled={!isVaultUnlocked}
                    />

                    <button 
                        className="btn btn-secondary" 
                        onClick={exportData}
                        style={{ width: 'auto', padding: '10px 20px' }}
                        disabled={!isVaultUnlocked || loading}
                    >
                        Export PDF
                    </button>
                </div>
            </header>

            <div className="dashboard-grid">
                <div className="card" style={{ position: 'relative' }}>
                    {!isVaultUnlocked && (
                         <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 10,
                            backgroundColor: 'rgba(13, 17, 23, 0.95)',
                            backdropFilter: 'blur(8px)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderRadius: '8px',
                            textAlign: 'center',
                            cursor: 'pointer'
                        }}
                        onClick={() => setShowLockModal(true)}
                        >
                             <h3 style={{ color: 'var(--accent-orange)', margin: 0 }}>Vault Locked. Click to Unlock.</h3>
                        </div>
                    )}
                    
                    <h2 className="card-title">Stored Credentials ({filteredPasswords.length})</h2>
                    <div className="password-list" style={{ filter: isVaultUnlocked ? 'none' : 'blur(2px)' }}>
                        {loading ? <p>Loading...</p> : <PasswordList passwords={filteredPasswords} />}
                    </div>
                </div>
                
                <div className="card" style={{ filter: isVaultUnlocked ? 'none' : 'blur(2px)' }}>
                    <h2 className="card-title">Add New Credential</h2>
                    <AddPasswordForm categories={categories.slice(1)} /> 
                </div>
            </div>
        </div>
    );
}