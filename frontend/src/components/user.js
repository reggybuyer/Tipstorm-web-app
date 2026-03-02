import React, { useEffect, useState, useCallback } from "react";

const API =
  process.env.REACT_APP_API_BASE || "http://localhost:5000";

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
          message: "User requested manual activation",
        }),
      });
      alert("Payment request sent. Admin will activate.");
    } catch {
      alert("Request failed.");
    }
  }

  function openSlip(slip) {
    setSelected(slip);
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

  if (loading)
    return <div className="section"><p>Loading...</p></div>;

  if (!user)
    return <div className="section"><p>Session expired.</p></div>;

  return (
    <div className="section">
      <div className="header-row">
        <h2>Welcome, {user.email}</h2>
        <button onClick={logout}>Logout</button>
      </div>

      {/* PREMIUM STATUS */}
      {user.premium ? (
        <div className="card premium-card">
          <span className={`plan-badge plan-${user.plan}`}>
            {user.plan.toUpperCase()} PLAN
          </span>
          <p>
            Expires: <strong>{new Date(user.expiresAt).toDateString()}</strong>
          </p>
          <p>
            Remaining: <strong>{getRemainingDays()} days</strong>
          </p>
        </div>
      ) : (
        <div className="card upgrade-card">
          <h3>Upgrade Plan</h3>
          <p>
            Send money to:<br />
            <strong>Paybill:</strong> 625625<br />
            <strong>Account:</strong> 20170457
          </p>
          <p>
            After payment:<br />
            ✔ forward payment message<br />
            ✔ email confirmation<br />
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

          <p className="amount-display">
            Selected: <strong>{planSelect.toUpperCase()}</strong><br />
            Amount: <strong>Ksh {getAmount()}</strong>
          </p>

          <button onClick={requestActivation}>
            Request Activation
          </button>
        </div>
      )}

      {/* SLIPS GRID */}
      <div className="card">
        <h3>Available Slips</h3>
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

            const totalOdds = slip.games?.reduce(
              (acc, g) => acc * (parseFloat(g.odd) || 1),
              1
            );

            const resultBadge = (result) =>
              result === "win"
                ? "badge win"
                : result === "lost"
                ? "badge lost"
                : "badge pending";

            return (
              <div key={slip._id} className="slip-card">
                <div className="slip-header">
                  <strong>{slip.date}</strong>
                  <span className={`badge ${slip.access}`}>
                    {slip.access.toUpperCase()}
                  </span>
                </div>

                <div className={allowed ? "" : "blur-teams"}>
                  {slip.games?.map((g, i) => (
                    <div key={i} className="game-row">
                      <span>{g.home} vs {g.away}</span>
                      <span>Odd: {g.odd}</span>
                      <span className={resultBadge(g.result)}>
                        {g.result}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="slip-footer">
                  <span>Total Odds:</span>
                  <strong>{totalOdds.toFixed(2)}</strong>
                </div>

                {allowed ? (
                  <button className="view-btn" onClick={() => openSlip(slip)}>
                    View Details
                  </button>
                ) : (
                  <div className="lock-overlay">Upgrade to view</div>
                )}
              </div>
            );
          })}
        </div>

        {/* PAGINATION */}
        <div className="pagination">
          <button onClick={() => loadSlips(page - 1)} disabled={page <= 1}>
            Previous
          </button>
          <span>Page {page}</span>
          <button onClick={() => loadSlips(page + 1)}>
            Next
          </button>
        </div>
      </div>

      {/* SLIP DETAILS MODAL */}
      {selected && (
        <div className="modal">
          <div className="modal-content">
            <button className="close" onClick={closeSlip}>
              ×
            </button>
            <h3>{selected.date}</h3>

            {selected.games?.map((g, i) => (
              <div key={i} className="game-row">
                <span>{g.home} vs {g.away}</span>
                <span>Odd: {g.odd}</span>
                <span className={resultBadge(g.result)}>
                  {g.result}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 
