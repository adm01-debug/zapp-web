import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n"; // Initialize i18n

// Force cache bust on rebuild
console.log('[App] Initialized at', new Date().toISOString());

createRoot(document.getElementById("root")!).render(<App />);
