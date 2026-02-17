import React, { useState, useEffect } from "react";
import axios from "axios";
import AdminSlipBuilder from "./AdminSlipBuilder";
import "../styles.css";

export default function AdminPanel({ adminEmail }) {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [slips, setSlips] = useState([]);

  // ✅ CORRECT BACKEND URL
  const backendUrl = "https://tipstorm-web-app.onrender.com";

  // Fetch all users
  const fetchUsers = async () => {
    if (!adminEmail) return;
    try {
      const res = await axios.get(`${backendUrl}/all-users/${adminEmail}`);
      if (res.data.success) {
        const sorted = res.data.users.sort((a, b) =>
          a.role === "admin" ? -1 : 1
        );
        setUsers(sorted);
      }
    } catch (err) {
      setMessage("Failed to fetch users");
      console.error(err);
    }
  };

  // Fetch all slips
  const fetchSlips = async () => {
    if (!adminEmail) return;
    try {
      const res = await axios.get(`${backendUrl}/games/${adminEmail}`);
      setSlips(res.data);
    } catch (err) {
      console.error("Failed to fetch slips:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchSlips();

    const interval = setInterval(() => {
      fetchUsers();
      fetchSlips();
    }, 15000);

    return () => clearInterval(interval);
  }, [adminEmail]);

  // Activate user plan
  const activateUser = async (email, plan) => {
    setLoading(true);
    setMessage("");
    try {
      await axios.post(`${backendUrl}/activate`, {
        adminEmail,
        userEmail: email,
        plan,
      });

      setMessage(`Activated ${plan.toUpperCase()} plan for ${email}`);
      fetchUsers();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to activate user");
      console.error(err);
    }
    setLoading(false);
  };

  // Approve user
  const approveUser = async (email) => {
    setLoading(true);
    setMessage("");
    try {
      await axios.post(`${backendUrl}/approve-user`, {
        adminEmail,
        userEmail: email,
      });

      setMessage(`Approved ${email}`);
      fetchUsers();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to approve user");
      console.error(err);
    }
    setLoading(false);
  };

  const renderPlanBadge = (plan) => {
    if (!plan || plan === "none")
      return <span className="free-badge">None</span>;
    if (plan === "weekly")
      return <span className="free-badge">Weekly</span>;
    if (plan === "monthly")
      return <span className="premium-badge">Monthly</span>;
    if (plan === "vip")
      return <span className="vip-badge">VIP</span>;
    return <span className="free-badge">None</span>;
  };

  return (
    <div className="admin-panel container">
      <h2>Admin Panel</h2>

      {message && <div className="message">{message}</div>}

      <AdminSlipBuilder
        adminEmail={adminEmail}
        onSlipAdded={() => fetchSlips()}
      />

      <h3>All Slips</h3>

      {slips.length === 0 ? (
        <p>No slips available</p>
      ) : (
        <table className="slips-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Premium</th>
              <th>VIP</th>
              <th>Free</th>
              <th>Games</th>
              <th>Total Odds</th>
            </tr>
          </thead>
          <tbody>
            {slips.map((s) => (
              <tr key={s._id}>
                <td>{s.date}</td>
                <td>{s.premium ? "Yes" : "No"}</td>
                <td>{s.vip ? "Yes" : "No"}</td>
                <td>{s.free ? "Yes" : "No"}</td>
                <td>
                  {s.games.map((g, i) => (
                    <div key={i}>
                      {g.home} vs {g.away} - Odd: {g.odd} - O/U:{" "}
                      {g.overUnder || "-"}
                    </div>
                  ))}
                </td>
                <td>{s.total || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

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
          {users.length === 0 ? (
            <tr>
              <td colSpan={7}>No users found</td>
            </tr>
          ) : (
            users.map((u) => (
              <tr key={u.email}>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{renderPlanBadge(u.plan)}</td>
                <td>{u.premium ? "Yes" : "No"}</td>
                <td>{u.approved ? "Yes" : "No"}</td>
                <td>
                  {u.expiresAt
                    ? new Date(u.expiresAt).toLocaleDateString()
                    : "-"}
                </td>
                <td>
                  {u.role !== "admin" && (
                    <>
                      <button
                        onClick={() => activateUser(u.email, "weekly")}
                        disabled={loading}
                      >
                        Weekly
                      </button>

                      <button
                        onClick={() => activateUser(u.email, "monthly")}
                        disabled={loading}
                      >
                        Monthly
                      </button>

                      <button
                        onClick={() => activateUser(u.email, "vip")}
                        disabled={loading}
                      >
                        VIP
                      </button>

                      {!u.approved && (
                        <button
                          onClick={() => approveUser(u.email)}
                          disabled={loading}
                        >
                          Approve
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
} 
