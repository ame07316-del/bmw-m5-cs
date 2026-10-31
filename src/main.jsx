import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/600.css';
import App from './App.jsx';
import './style.css';

createRoot(document.getElementById('root')).render(<App />);
