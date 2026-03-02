import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import UserLogin from "./components/UserLogin";
import UserRegister from "./components/UserRegister";
import AdminLogin from "./components/AdminLogin";
import User from "./components/User";
import Admin from "./components/admin";

import "./style.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<UserLogin />} />
      <Route path="/login" element={<UserLogin />} />
      <Route path="/register" element={<UserRegister />} />

      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin" element={<Admin />} />

      <Route path="/user" element={<User />} />
    </Routes>
  </BrowserRouter>
); 
