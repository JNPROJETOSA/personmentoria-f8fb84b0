import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Using createRoot without StrictMode to avoid double-rendering issues
// that can cause DOM manipulation errors with Radix UI portals
const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
