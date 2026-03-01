import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import UserLogin from "./components/UserLogin";
import User from "./components/User";
import UserRegister from "./components/UserRegister";
import Admin from "./components/admin";
import AdminLogin from "./components/AdminLogin";

import "./style.css";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <BrowserRouter>
    <Routes>
      {/* User */}
      <Route path="/" element={<UserLogin />} />
      <Route path="/login" element={<UserLogin />} />
      <Route path="/register" element={<UserRegister />} />
      <Route path="/user" element={<User />} />

      {/* Admin */}
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  </BrowserRouter>
); 
