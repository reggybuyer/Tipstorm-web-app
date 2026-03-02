import React, { useEffect, useState, useCallback } from "react";

const API = process.env.REACT_APP_API_BASE;

export default function User() {
  const [slips, setSlips] = useState([]);
  const [user, setUser] = useState(null);
  const [planSelect, setPlanSelect] = useState("weekly");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  function logout() {
    localStorage.clear();
    window.location.href = "/login";
  }

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

  async function loadSlips() {
    try {
      const res = await fetch(`${API}/slips`);
      const data = await res.json();
      setSlips(data.slips || []);
    } catch {
      setSlips([]);
    }
  }

  function getRemainingDays() {
    if (!user?.expiresAt) return 0;
    const diff = new Date(user.expiresAt) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  function getAmount() {
    if (planSelect === "weekly") return 500;
    if (planSelect === "monthly") return 1000;
    if (planSelect === "vip") return 1500;
    return 0;
  }

  async function requestActivation() {
    try {
      await fetch(`${API}/request-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          plan: planSelect,
          message: "User request activation",
        }),
      });

      alert("Request sent. Admin will activate.");
    } catch {
      alert("Request failed");
    }
  }

  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
      return;
    }

    loadProfile();
    loadSlips();
  }, [token, loadProfile]);

  if (loading) return <div className="section"><p>Loading...</p></div>;
  if (!user) return <div className="section"><p>Session expired.</p></div>;

  return (
    <div className="section">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>Welcome, {user.email}</h2>
        <button onClick={logout}>Logout</button>
      </div>

      {user.premium ? (
        <div className="card">
          <span className={`plan-badge plan-${user.plan}`}>
            {user.plan.toUpperCase()}
          </span>
          <p>
            Expires: {new Date(user.expiresAt).toDateString()} (
            {getRemainingDays()} days)
          </p>
        </div>
      ) : (
        <div className="card">
          <h3>Upgrade Plan</h3>
          <p>
            Send money to:<br />
            Paybill: <strong>625625</strong><br />
            Account: <strong>20170457</strong>
          </p>

          <p>
            After payment:<br />
            ✔ forward payment message<br />
            ✔ email<br />
            ✔ WhatsApp: <strong>0789906001</strong>
          </p>

          <select
            value={planSelect}
            onChange={(e) => setPlanSelect(e.target.value)}
          >
            <option value="weekly">Weekly - Ksh 500</option>
            <option value="monthly">Monthly - Ksh 1000</option>
            <option value="vip">VIP - Ksh 1500</option>
          </select>

          <button onClick={requestActivation}>
            Request Activation
          </button>
        </div>
      )}

      <div className="card">
        <h3>Slips</h3>

        {slips.length === 0 && <p>No slips available</p>}

        <div className="grid">
          {slips.map((slip) => {
            const allowed =
              slip.access === "free" ||
              (user.premium &&
                ((user.plan === "weekly" && slip.access === "weekly") ||
                 (user.plan === "monthly" &&
                   (slip.access === "weekly" || slip.access === "monthly")) ||
                 user.plan === "vip"));

            return (
              <div key={slip._id} className="badge">
                {allowed ? (
                  <p>
                    <strong>{slip.date}</strong>
                    <br />
                    <span className={`badge ${slip.access}`}>
                      {slip.access.toUpperCase()}
                    </span>
                  </p>
                ) : (
                  <p>Upgrade to view this slip</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 
