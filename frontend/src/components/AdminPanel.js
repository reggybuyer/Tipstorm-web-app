import React, { useState, useEffect } from "react";
import axios from "axios";
import AdminSlipBuilder from "./AdminSlipBuilder";
import "../styles.css";

export default function AdminPanel({ adminEmail }) {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const backendUrl = "https://your-tipstorm-backend.onrender.com";

  const fetchUsers = async () => {
    if (!adminEmail) return;
    try {
      const res = await axios.get(`${backendUrl}/all-users/${adminEmail}`);
      if (res.data.success) setUsers(res.data.users);
    } catch (err) {
      setMessage("Failed to fetch users");
    }
  };

  useEffect(() => { fetchUsers(); }, [adminEmail]);

  const activateUser = async (email, plan) => {
    setLoading(true); setMessage("");
    try {
      await axios.post(`${backendUrl}/activate`, { adminEmail, userEmail: email, plan });
      setMessage(`Activated ${plan} for ${email}`); fetchUsers();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to activate user");
    }
    setLoading(false);
  };

  const approveUser = async (email) => {
    setLoading(true); setMessage("");
    try {
      await axios.post(`${backendUrl}/approve-user`, { adminEmail, userEmail: email });
      setMessage(`Approved ${email}`); fetchUsers();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to approve user");
    }
    setLoading(false);
  };

  const renderPlanBadge = plan => {
    if (plan === "vip") return <span className="vip-badge">VIP</span>;
    if (plan === "monthly") return <span className="premium-badge">Monthly</span>;
    if (plan === "weekly") return <span className="free-badge">Weekly</span>;
    return <span className="free-badge">None</span>;
  };

  return (
    <div className="admin-panel container">
      <h2>Admin Panel</h2>
      {message && <div className="message">{message}</div>}
      <AdminSlipBuilder adminEmail={adminEmail} />

      <h3>Manage Users</h3>
      <table className="users-table">
        <thead>
          <tr>
            <th>Email</th><th>Role</th><th>Plan</th><th>Premium</th><th>Approved</th><th>Expires At</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && <tr><td colSpan={7}>No users found</td></tr>}
          {users.map(u => (
            <tr key={u.email}>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{renderPlanBadge(u.plan)}</td>
              <td>{u.premium ? "Yes" : "No"}</td>
              <td>{u.approved ? "Yes" : "No"}</td>
              <td>{u.expiresAt ? new Date(u.expiresAt).toLocaleDateString() : "-"}</td>
              <td>
                {u.role !== "admin" && (
                  <>
                    <button onClick={() => activateUser(u.email, "weekly")} disabled={loading}>Weekly</button>
                    <button onClick={() => activateUser(u.email, "monthly")} disabled={loading}>Monthly</button>
                    <button onClick={() => activateUser(u.email, "vip")} disabled={loading}>VIP</button>
                    {!u.approved && <button onClick={() => approveUser(u.email)} disabled={loading}>Approve</button>}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 
