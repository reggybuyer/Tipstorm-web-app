import React, { useEffect, useState, useCallback } from "react";

const API = process.env.REACT_APP_API_BASE || "https://tipstorm-backend.onrender.com";

export default function User() {
  const [slips, setSlips] = useState([]);
  const [user, setUser] = useState(null);
  const [planSelect, setPlanSelect] = useState("weekly");
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  const logout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // Load user profile
  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success || !data.user) {
        logout();
        return;
      }
      setUser(data.user);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load slips
  const loadSlips = useCallback(async () => {
    try {
      const res = await fetch(`${API}/slips`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSlips(data.slips || []);
    } catch {
      setSlips([]);
    }
  }, [token]);

  const getRemainingDays = () => {
    if (!user?.expiresAt) return 0;
    return Math.max(0, Math.ceil((new Date(user.expiresAt) - new Date()) / 86400000));
  };

  const getAmount = () => {
    if (planSelect === "weekly") return 500;
    if (planSelect === "monthly") return 1000;
    if (planSelect === "vip") return 1500;
    return 0;
  };

  const requestActivation = async () => {
    await fetch(`${API}/request-subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, plan: planSelect, message: "User requested upgrade" }),
    });
    alert("Request sent. Send payment message to WhatsApp.");
  };

  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
      return;
    }
    loadProfile();
    loadSlips();
  }, [token, loadProfile, loadSlips]);

  if (loading) return <div className="section">Loading...</div>;
  if (!user) return <div className="section">Session expired.</div>;

  return (
    <div className="section">
      <div className="header-row">
        <h2>Welcome, {user.email}</h2>
        <button className="btn btn-logout" onClick={logout}>
          Logout
        </button>
      </div>

      {/* User Plan */}
      <div className="card premium-card">
        <span className={`plan-badge plan-${user.plan}`}>{user.plan.toUpperCase()} PLAN</span>
        <p>Expires: {user.expiresAt ? new Date(user.expiresAt).toDateString() : "No expiry"}</p>
        <p>Remaining: {getRemainingDays()} days</p>

        {user.plan !== "vip" && (
          <div className="upgrade-card">
            <h4>Upgrade your plan</h4>
            <select value={planSelect} onChange={(e) => setPlanSelect(e.target.value)}>
              <option value="weekly">Weekly - Ksh 500</option>
              <option value="monthly">Monthly - Ksh 1000</option>
              <option value="vip">VIP - Ksh 1500</option>
            </select>
            <div className="amount-display">
              Amount: <strong>Ksh {getAmount()}</strong>
            </div>
            <div className="manual-payment">
              <p>Playbill: <strong>625625</strong></p>
              <p>Acc Number: <strong>20170457</strong></p>
              <p>
                Send your <strong>{user.email}</strong> and payment confirmation to WhatsApp: <strong>0789906001</strong>
              </p>
            </div>
            <button className="btn btn-upgrade" onClick={requestActivation}>
              Request Upgrade
            </button>
          </div>
        )}
      </div>

      {/* Slips */}
      <div className="card">
        <h3>Available Slips</h3>
        {slips.length === 0 ? (
          <p>No slips available</p>
        ) : (
          <table className="slip-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Access</th>
                <th>Games</th>
                <th>Total Odds</th>
              </tr>
            </thead>
            <tbody>
              {slips.map((slip) => {
                const allowed =
                  slip.access === "free" || (user?.premium && (user.plan === "vip" || user.plan === slip.access));
                return (
                  <tr key={slip._id}>
                    <td>{slip.date}</td>
                    <td>
                      <span className={`plan-badge plan-${slip.access}`}>{slip.access.toUpperCase()}</span>
                    </td>
                    <td>
                      {allowed ? (
                        slip.games?.map((g, i) => (
                          <div key={i}>
                            {g.home} vs {g.away} | Odd: {(parseFloat(g.odds) || 1).toFixed(2)} | {g.type} {g.line}
                          </div>
                        ))
                      ) : (
                        <div>🔒 Premium</div>
                      )}
                    </td>
                    <td>{(slip.totalOdds || slip.games?.reduce((acc, g) => acc * (parseFloat(g.odds) || 1), 1)).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
} 
