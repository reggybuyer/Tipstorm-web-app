import React, { useEffect, useState, useCallback } from "react";

const API = process.env.REACT_APP_API_BASE || "http://localhost:5000";

export default function User() {
  const [slips, setSlips] = useState([]);
  const [user, setUser] = useState(null);
  const [planSelect, setPlanSelect] = useState("weekly");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

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

  async function loadSlips(newPage = 1) {
    try {
      const res = await fetch(`${API}/slips?page=${newPage}`);
      const data = await res.json();
      setSlips(data.slips || []);
      setPage(newPage);
    } catch {
      setSlips([]);
    }
  }

  function getRemainingDays() {
    if (!user?.expiresAt) return 0;
    return Math.max(
      0,
      Math.ceil((new Date(user.expiresAt) - new Date()) / 86400000)
    );
  }

  function getAmount() {
    if (planSelect === "weekly") return 500;
    if (planSelect === "monthly") return 1000;
    if (planSelect === "vip") return 1500;
    return 0;
  }

  async function requestActivation() {
    await fetch(`${API}/request-subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        plan: planSelect,
        message: "User requested upgrade",
      }),
    });
    alert("Request sent. Forward payment message to WhatsApp.");
  }

  function openSlip(slip) {
    setSelected({ ...slip, games: slip.games || [] });
  }

  function closeSlip() {
    setSelected(null);
  }

  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
      return;
    }
    loadProfile();
    loadSlips();
  }, [token, loadProfile]);

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

      <div className="card premium-card">
        <span className={`plan-badge plan-${user.plan}`}>
          {user.plan.toUpperCase()} PLAN
        </span>
        <p>
          Expires:{" "}
          {user.expiresAt
            ? new Date(user.expiresAt).toDateString()
            : "No expiry"}
        </p>
        <p>Remaining: {getRemainingDays()} days</p>

        {user.plan !== "vip" && (
          <div className="upgrade-card">
            <h4>Upgrade your plan</h4>
            <p>You are on {user.plan.toUpperCase()}.</p>

            <select
              value={planSelect}
              onChange={(e) => setPlanSelect(e.target.value)}
            >
              <option value="weekly">Weekly - Ksh 500</option>
              <option value="monthly">Monthly - Ksh 1000</option>
              <option value="vip">VIP - Ksh 1500</option>
            </select>

            <div className="amount-display">
              Amount: <strong>Ksh {getAmount()}</strong>
            </div>

            <button className="btn btn-upgrade" onClick={requestActivation}>
              Request Upgrade
            </button>
          </div>
        )}
      </div>

      {/* SLIPS */}
      <div className="card">
        <h3>Available Slips</h3>
        {slips.length === 0 && <p>No slips available</p>}

        <div className="grid">
          {slips.map((slip) => {
            const allowed =
              slip.access === "free" ||
              (user.premium &&
                (user.plan === "vip" || user.plan === slip.access));

            const totalOdds = slip.games?.reduce(
              (acc, g) => acc * (parseFloat(g.odd) || 1),
              1
            );

            return (
              <div key={slip._id} className="slip-card">
                <div className="slip-header">
                  <strong>{slip.date}</strong>
                  <span className={`plan-badge plan-${slip.access}`}>
                    {slip.access.toUpperCase()}
                  </span>
                </div>

                <div className={allowed ? "" : "blur-teams"}>
                  {slip.games?.map((g, i) => (
                    <div key={i} className="game-row">
                      <div className="teams">
                        {g.home} vs {g.away}
                      </div>
                      {g.type && (
                        <span
                          className={`ou-badge ${
                            g.type === "Over" ? "ou-over" : "ou-under"
                          }`}
                        >
                          {g.type} {g.line}
                        </span>
                      )}
                      <div className="odd">Odd: {g.odd}</div>
                      <span
                        className={`result-badge result-${
                          g.result || "pending"
                        }`}
                      >
                        {g.result || "Pending"}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="slip-footer">
                  <strong>Total Odds: {totalOdds?.toFixed(2)}</strong>
                </div>

                {allowed ? (
                  <button
                    className="btn btn-view"
                    onClick={() => openSlip(slip)}
                  >
                    View Full Slip
                  </button>
                ) : (
                  <div className="lock-overlay">
                    Premium slip — upgrade to view
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pagination">
          <button
            className="btn"
            onClick={() => loadSlips(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            className="btn"
            onClick={() => loadSlips(page + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {/* FULL SLIP MODAL */}
      {selected && (
        <div className="modal">
          <div className="modal-content">
            <button className="close" onClick={closeSlip}>×</button>
            <h3>{selected.date} - Full Details</h3>

            {selected.games && selected.games.length > 0 ? (
              selected.games.map((g, i) => (
                <div key={i} className="game-row">
                  <div className="teams">{g.home} vs {g.away}</div>
                  <span className={`ou-badge ${
                    g.type === "Over" ? "ou-over" : "ou-under"
                  }`}>
                    {g.type} {g.line}
                  </span>
                  <div className="odd">Odd: {g.odd}</div>
                  <span className={`result-badge result-${g.result || "pending"}`}>
                    {g.result || "pending"}
                  </span>
                </div>
              ))
            ) : (
              <p>No game details available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 
