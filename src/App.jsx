import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import LoadingSpinner from './components/LoadingSpinner';

import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';
import LandingPage from './pages/LandingPage';
import ToastNotification from './components/ToastNotification';

// ====================================================================
// ⭐️ FIX: Naye pages ko import karein
// ====================================================================
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import './pages/LegalPage.css'; // Naya CSS import karein (yahaan ya App.css mein)

import './App.css';

// A new inner component to access the context
function AppRoutes() {
  const { loading, currentUser } = useAuth(); // Get currentUser to check login status

  if (loading) {
    return <LoadingSpinner />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* If user is logged in, default to dashboard, otherwise show landing page */}
        <Route index element={currentUser ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
        
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />

        {/* ==================================================================== */}
        {/* ⭐️ FIX: Naye routes add karein (yeh public pages hain) */}
        {/* ==================================================================== */}
        <Route path="terms-of-service" element={<TermsOfService />} />
        <Route path="privacy-policy" element={<PrivacyPolicy />} />
        
        <Route path="dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        <Route path="profile" element={ 
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        
        <Route path="admin" element={ 
          <AdminRoute>
            <AdminPanel />
          </AdminRoute>
        } />
        
        <Route path="*" element={<h1 style={{color: 'red'}}>404 - Page Not Found</h1>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <ToastNotification /> 
        <AppRoutes />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;