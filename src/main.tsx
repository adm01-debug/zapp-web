import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n"; // Initialize i18n
import { getLogger } from "./lib/logger";
import { initWebVitals } from "./lib/web-vitals";

const log = getLogger('App');
log.info('Initialized at', new Date().toISOString());

// Initialize Web Vitals monitoring
initWebVitals();

createRoot(document.getElementById("root")!).render(<App />);
