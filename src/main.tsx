import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n"; // Initialize i18n
import { getLogger } from "./lib/logger";

const log = getLogger('Main');
log.info('Initialized at', new Date().toISOString());

// Global error handlers for observability
window.addEventListener('error', (event) => {
  log.error('Unhandled error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  log.error('Unhandled promise rejection:', event.reason);
});

createRoot(document.getElementById("root")!).render(<App />);
