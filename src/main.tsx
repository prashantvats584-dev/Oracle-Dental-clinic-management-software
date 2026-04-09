import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log("Oracle Dental Clinic: Initializing application...");

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("Oracle Dental Clinic: Root element not found!");
} else {
  console.log("Oracle Dental Clinic: Root element found, rendering...");
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
