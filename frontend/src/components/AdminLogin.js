import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "https://tipstorm-backend.onrender.com";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  async function login() {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!data.success || data.user.role !== "admin") {
      alert("Admin login failed");
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.user.role);
    localStorage.setItem("email", data.user.email);

    alert("Welcome Admin");
    navigate("/admin");
  }

  return (
    <div className="auth-wrapper">
      {/* LEFT SIDE */}
      <div className="auth-left admin">
        <img src="/logo.png" alt="Logo" className="auth-logo" />
        <h1>TipStorm Admin</h1>
        <p>Manage slips professionally</p>
      </div>

      {/* RIGHT SIDE */}
      <div className="auth-right">
        <div className="auth-box">
          <h2>Admin Login</h2>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button onClick={login}>Login</button>
        </div>
      </div>
    </div>
  );
} 
