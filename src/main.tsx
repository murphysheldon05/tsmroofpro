import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { shouldShowRedirectPage } from "./lib/domainRedirect";
import DomainRedirect from "./pages/DomainRedirect";

/**
 * DOMAIN ENFORCEMENT
 * 
 * If user somehow bypassed the early redirect script in index.html
 * and is still on a lovable.dev or lovable.app domain, show the
 * friendly redirect page instead of the main app.
 * 
 * This prevents:
 * - Auth routes from triggering on preview domains
 * - "Access Denied" confusion from Lovable platform pages
 * - Race conditions with JavaScript redirects
 */
const rootElement = document.getElementById("root")!;

if (shouldShowRedirectPage()) {
  // On wrong domain - show redirect page instead of main app
  createRoot(rootElement).render(<DomainRedirect />);
} else {
  // On correct domain - render the main app
  createRoot(rootElement).render(<App />);
}
