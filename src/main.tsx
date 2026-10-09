
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./style.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Asset Oracle root element was not found.");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
