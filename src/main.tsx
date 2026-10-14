import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { consumePairingLink } from "./features/sync/sync";

consumePairingLink(); // must run before the router mounts: it consumes a #sync= pairing link

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
