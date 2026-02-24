import React from "react";
import UserDashboard from "../public/user-dashboard.html";

export default function App() {
  return (
    <div>
      {/* You can serve static HTML via public folder */}
      <iframe
        src="/user-dashboard.html"
        style={{ width: "100%", height: "100vh", border: "none" }}
      />
    </div>
  );
} 
