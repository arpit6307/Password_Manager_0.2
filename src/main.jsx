// src/main.jsx
// ⭐️ FIX: PDF export error ko theek karne ke liye yahaan se imports hata diye gaye hain.

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom';

// Note: jsPDF aur jspdf-autotable ke imports yahaan se hata diye gaye hain.
// Unhe seedha Dashboard.jsx mein import kiya jayega.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)