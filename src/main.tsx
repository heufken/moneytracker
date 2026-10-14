import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { startSync } from "./features/sync/sync";

startSync(); // opt-in; must run before the router mounts (it consumes a #sync= pairing link)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
