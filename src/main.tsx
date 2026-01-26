import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { enforceCanonicalDomain } from "./lib/domainRedirect";

// FAILSAFE: If user hits any lovable.dev or lovable.app domain,
// redirect them to tsmroofpro.com with the same path/query
enforceCanonicalDomain();

createRoot(document.getElementById("root")!).render(<App />);
