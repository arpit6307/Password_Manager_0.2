import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; 
import { auth, db } from '../firebase-config';
import LoadingSpinner from '../components/LoadingSpinner'; 
import { useToast } from './ToastContext'; // Toast ko yahaan import karein

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // ====================================================================
  // ⭐️ FIX: Toast ko context mein use karein (taaki error dikha sakein)
  // ====================================================================
  const { showToast } = useToast(); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const userData = docSnap.data();
          
          // 1. Banned check
          if (userData.isBanned) {
            await signOut(auth);
            setCurrentUser(null);
            setIsAdmin(false);
            setLoading(false);
            // showToast yahaan kaam nahi karega kyunki user login page par hai
            return;
          }

          // ====================================================================
          // ⭐️ FIX: Naya 'isLocked' check add kiya gaya
          // ====================================================================
          if (userData.isLocked) {
            await signOut(auth);
            setCurrentUser(null);
            setIsAdmin(false);
            setLoading(false);
            // showToast yahaan bhi kaam nahi karega, Login page par dikhana hoga
            return;
          }
          
          setIsAdmin(!!userData.isAdmin); 
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, [showToast]); // showToast ko dependency mein add karein

  const value = { currentUser, isAdmin, loading }; 

  return (
    <AuthContext.Provider value={value}>
      {loading ? <LoadingSpinner /> : children}
    </AuthContext.Provider>
  );
}

// ⭐️ FIX: AuthContext ko ToastProvider ke *andar* hona chahiye,
// isliye hum AuthProvider se 'useToast' ko safely call kar sakte hain.
// Iske liye `App.jsx` mein setup check karein.
// `App.jsx` mein setup sahi hai: <ToastProvider> <AuthProvider> ... </AuthProvider> </ToastProvider>