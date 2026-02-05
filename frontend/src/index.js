// Entry point for React frontend
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";        // Main app component
import "./styles.css";          // Global styles

// Create root and mount the app
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 
