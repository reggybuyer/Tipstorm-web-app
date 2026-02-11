import React, { useState, useEffect } from "react";
import axios from "axios";
import AdminSlipBuilder from "./AdminSlipBuilder";
import "../styles.css"; // make sure your CSS file is imported

export default function AdminPanel({ adminEmail }) {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const backendUrl = "https://your-tipstorm-backend.onrender.com"; // your backend

  // Fetch all users
  const fetchUsers = async () => {
    if (!adminEmail) return;
    try {
      const response = await axios.get(`${backendUrl}/all-users/${adminEmail}`);
      if (response.data.success) setUsers(response.data.users);
    } catch (err) {
      console.error(err);
      setMessage("Failed to fetch users");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [adminEmail]);

  // Activate user plan
  const activateUser = async (userEmail, plan) => {
    setLoading(true);
    setMessage("");
    try {
      await axios.post(`${backendUrl}/activate`, { adminEmail, userEmail, plan });
      setMessage(`Activated ${plan} plan for ${userEmail}`);
      fetchUsers();
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "Failed to activate user");
    }
    setLoading(false);
  };

  // Approve user
  const approveUser = async (userEmail) => {
    setLoading(true);
    setMessage("");
    try {
      await axios.post(`${backendUrl}/approve-user`, { adminEmail, userEmail });
      setMessage(`Approved ${userEmail} successfully`);
      fetchUsers();
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "Failed to approve user");
    }
    setLoading(false);
  };

  const renderPlanBadge = (plan) => {
    if (plan === "vip") return <span className="vip-badge">VIP</span>;
    if (plan === "monthly") return <span className="premium-badge">Monthly</span>;
    if (plan === "weekly") return <span className="free-badge">Weekly</span>;
    return <span className="free-badge">None</span>;
  };

  return (
    <div className="admin-panel container">
      <h2>Admin Panel</h2>
      {message && <div className="message">{message}</div>}

      {/* ===== SLIP BUILDER ===== */}
      <AdminSlipBuilder adminEmail={adminEmail} />

      {/* ===== USER MANAGEMENT ===== */}
      <div className="admin-users" style={{ marginTop: "40px" }}>
        <h3>Manage Users</h3>
        <table className="users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Plan</th>
              <th>Premium</th>
              <th>Approved</th>
              <th>Expires At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={7}>No users found</td>
              </tr>
            )}
            {users.map((u, index) => (
              <tr key={index}>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{renderPlanBadge(u.plan)}</td>
                <td>{u.premium ? <span className="premium-badge">Yes</span> : "No"}</td>
                <td>{u.approved ? <span className="vip-badge">Yes</span> : "No"}</td>
                <td>{u.expiresAt ? new Date(u.expiresAt).toLocaleDateString() : "-"}</td>
                <td>
                  {u.role !== "admin" && (
                    <>
                      <button
                        onClick={() => activateUser(u.email, "weekly")}
                        disabled={loading}
                        className="badge-button add-slip"
                      >
                        Weekly
                      </button>
                      <button
                        onClick={() => activateUser(u.email, "monthly")}
                        disabled={loading}
                        className="badge-button create-slip"
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => activateUser(u.email, "vip")}
                        disabled={loading}
                        className="vip-badge"
                        style={{ padding: "5px 10px", cursor: "pointer", marginLeft: "5px" }}
                      >
                        VIP
                      </button>
                      {!u.approved && (
                        <button
                          onClick={() => approveUser(u.email)}
                          disabled={loading}
                          className="over-under-text over"
                          style={{ marginLeft: "5px", padding: "5px 10px", cursor: "pointer" }}
                        >
                          Approve
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 
