import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_BASE;

export default function UserRegister() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  async function register() {
    const res = await fetch(`${API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!data.success) {
      alert("Register failed");
      return;
    }
    alert("Registered. Login now.");
    navigate("/login");
  }

  return (
    <div>
      <h2>Register</h2>
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
      <button onClick={register}>Register</button>
    </div>
  );
} 
