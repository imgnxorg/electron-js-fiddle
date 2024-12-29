// src/renderer/index.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root container not found!");
}
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
