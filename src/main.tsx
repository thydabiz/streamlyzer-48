
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { Capacitor } from '@capacitor/core';

// Log platform info
if (Capacitor.isNativePlatform()) {
  console.log('Running on: ' + Capacitor.getPlatform());
} else {
  console.log('Running in browser');
}

// Initialize app
createRoot(document.getElementById("root")!).render(<App />);
