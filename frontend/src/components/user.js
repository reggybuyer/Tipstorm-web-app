import React, { useEffect, useState, useCallback } from "react";

const API = process.env.REACT_APP_API_BASE || "https://tipstorm-backend.onrender.com";

export default function User() {
  const [slips, setSlips] = useState([]);
  const [user, setUser] = useState(null);
  const [planSelect, setPlanSelect] = useState("weekly");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const limit = 10;
  const token = localStorage.getItem("token");

  function logout() {
    localStorage.clear();
    window.location.href = "/login";
  }

  /* ================= PROFILE LOAD ================= */
  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API}/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!data.success || !data.user) {
        logout();
        return;
      }

      const userData = data.user;

      // Expiry check
      if (userData.premium && userData.expiresAt) {
        const now = new Date();
        const expiry = new Date(userData.expiresAt);

        if (now > expiry) {
          logout();
          return;
        }
      }

      setUser(userData);
    } catch (err) {
      console.error("Profile error:", err);
      logout();
    } finally {
      setLoading(false);
    }
  }, [token]);

  /* ================= ACCESS CONTROL ================= */
  function hasAccess(slipAccess) {
    if (!user) return false;
    if (slipAccess === "free") return true;
    if (!user.premium) return false;

    if (user.plan === "weekly") return slipAccess === "weekly";
    if (user.plan === "monthly")
      return slipAccess === "weekly" || slipAccess === "monthly";
    if (user.plan === "vip") return true;

    return false;
  }

  /* ================= LOAD SLIPS ================= */
  async function loadSlips(newPage = 1) {
    try {
      const res = await fetch(
        `${API}/slips?page=${newPage}&limit=${limit}`
      );
      const data = await res.json();

      setSlips(data.slips || []);
      setPages(data.pages || 1);
      setPage(newPage);
    } catch (err) {
      console.error("Slips error:", err);
      setSlips([]);
    }
  }

  /* ================= SUBSCRIPTION ================= */
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

      alert("Request sent successfully");
    } catch {
      alert("Request failed");
    }
  }

  /* ================= INIT ================= */
  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
      return;
    }

    loadProfile();
    loadSlips(1);
  }, [token, loadProfile]);

  /* ================= UI STATES ================= */
  if (loading) {
    return (
      <div className="section">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="section">
        <p>Session expired. Please login again.</p>
      </div>
    );
  }

  /* ================= UI ================= */
  return (
    <div className="section">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>Welcome, {user.email}</h2>
        <button className="logout" onClick={logout}>
          Logout
        </button>
      </div>

      {user.premium && (
        <p className="plan-badge">
          {user.plan.toUpperCase()} — Expires in {getRemainingDays()} days
        </p>
      )}

      {user.plan !== "vip" && (
        <div className="card upgrade-card">
          <h3>Upgrade Plan</h3>
          <p>
            Email: <strong>{user.email}</strong>
            <br />
            Plan: <strong>{planSelect.toUpperCase()}</strong>
            <br />
            Amount: <strong>Ksh {getAmount()}</strong>
          </p>

          <select
            value={planSelect}
            onChange={(e) => setPlanSelect(e.target.value)}
          >
            <option value="weekly">Weekly - Ksh 500</option>
            <option value="monthly">Monthly - Ksh 1000</option>
            <option value="vip">VIP - Ksh 1500</option>
          </select>

          <button className="success" onClick={requestActivation}>
            Request Activation
          </button>
        </div>
      )}

      <button className="primary" onClick={() => loadSlips(1)}>
        Load Slips
      </button>

      <div className="grid">
        {slips.length === 0 && <p>No slips available</p>}

        {slips.map((slip) => {
          const allowed = hasAccess(slip.access);

          return (
            <div key={slip._id} className="card">
              {!allowed && <div className="lock-overlay">Upgrade Plan</div>}

              <div className="badge">
                {slip.date} — {slip.access.toUpperCase()}
              </div>

              <div className={!allowed ? "blur-teams" : ""}>
                <p>
                  Total Odds:{" "}
                  <span className="badge">
                    {slip.totalOdds.toFixed(2)}
                  </span>
                </p>

                {slip.games.map((g, i) => (
                  <div key={i}>
                    <strong>
                      {g.home} vs {g.away}
                    </strong>
                    <br />
                    Odd: <span className="badge">{g.odd}</span>
                    <br />
                    Over/Under: {g.overUnder || "N/A"}
                    <br />
                    Result:{" "}
                    <span className={`badge ${g.result}`}>
                      {g.result}
                    </span>
                    <hr />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => loadSlips(page - 1)}>
          Previous
        </button>

        <span>
          Page {page} of {pages}
        </span>

        <button disabled={page >= pages} onClick={() => loadSlips(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
} 
