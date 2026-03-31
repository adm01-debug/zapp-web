import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n"; // Initialize i18n
import { getLogger } from "./lib/logger";
import { initWebVitals } from "./lib/web-vitals";

const log = getLogger('App');
log.info('Initialized at', new Date().toISOString());

// Initialize Web Vitals monitoring
initWebVitals();

// Accessibility auditing in development mode
if (import.meta.env.DEV) {
  import('@axe-core/react').then((axe) => {
    axe.default(React, ReactDOM, 1000, undefined, undefined, (results: any) => {
      if (results?.violations?.length) {
        log.warn(`[A11Y] ${results.violations.length} accessibility violation(s) detected`);
      }
    });
    log.info('[A11Y] axe-core accessibility auditing enabled');
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
