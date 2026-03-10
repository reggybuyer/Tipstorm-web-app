import React, { useEffect, useState, useCallback } from "react";

const API = process.env.REACT_APP_API_BASE || "https://tipstorm-backend.onrender.com";

export default function User() {

  const [slips, setSlips] = useState([]);
  const [user, setUser] = useState(null);
  const [planSelect, setPlanSelect] = useState("weekly");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [selected, setSelected] = useState(null);

  const token = localStorage.getItem("token");

  const logout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

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

  const loadSlips = useCallback(async (newPage = 1) => {

    try {

      const res = await fetch(`${API}/slips?page=${newPage}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await res.json();

      setSlips(data.slips || []);
      setPages(data.pages || 1);
      setPage(newPage);

    } catch {
      setSlips([]);
    }

  }, [token]);

  const getRemainingDays = () => {

    if (!user?.expiresAt) return 0;

    return Math.max(
      0,
      Math.ceil((new Date(user.expiresAt) - new Date()) / 86400000)
    );
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
      body: JSON.stringify({
        email: user.email,
        plan: planSelect,
        message: "User requested upgrade",
      }),
    });

    alert("Request sent. Send payment message to WhatsApp.");

  };

  const openSlip = (slip) => setSelected({ ...slip, games: slip.games || [] });

  const closeSlip = () => setSelected(null);

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

      <div className="card premium-card">

        <span className={`plan-badge plan-${user.plan}`}>
          {user.plan.toUpperCase()} PLAN
        </span>

        <p>
          Expires:
          {user.expiresAt
            ? new Date(user.expiresAt).toDateString()
            : "No expiry"}
        </p>

        <p>Remaining: {getRemainingDays()} days</p>

        {user.plan !== "vip" && (

          <div className="upgrade-card">

            <h4>Upgrade your plan</h4>

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

            <button
              className="btn btn-upgrade"
              onClick={requestActivation}
            >
              Request Upgrade
            </button>

          </div>

        )}

      </div>

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
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {slips.map((slip) => {

                const allowed =
                  slip.access === "free" ||
                  (user?.premium &&
                    (user.plan === "vip" || user.plan === slip.access));

                const totalOdds = slip.games?.reduce((acc, g) => {

                  const odd = parseFloat(g.odds);

                  return acc * (isNaN(odd) ? 1 : odd);

                }, 1);

                return (

                  <tr key={slip._id}>

                    <td>{slip.date}</td>

                    <td>
                      <span className={`plan-badge plan-${slip.access}`}>
                        {slip.access.toUpperCase()}
                      </span>
                    </td>

                    <td>

                      {allowed ? (

                        <table className="inner-table">

                          <tbody>

                            {slip.games?.map((g, i) => (

                              <tr key={i}>

                                <td>
                                  {g.home} vs {g.away}
                                </td>

                                <td>
                                  <span
                                    className={`ou-badge ${
                                      g.overUnder?.toLowerCase().includes("over")
                                        ? "ou-over"
                                        : "ou-under"
                                    }`}
                                  >
                                    {g.overUnder || `${g.type} ${g.line}`}
                                  </span>
                                </td>

                                <td>
                                  Odd:
                                  <span className="odds">
                                    {(parseFloat(g.odds) || 1).toFixed(2)}
                                  </span>
                                </td>

                                <td>
                                  <span
                                    className={`result-badge result-${
                                      g.result || "pending"
                                    }`}
                                  >
                                    {g.result || "pending"}
                                  </span>
                                </td>

                              </tr>

                            ))}

                          </tbody>

                        </table>

                      ) : (

                        <table className="inner-table">

                          <tbody>

                            {slip.games?.map((g, i) => (

                              <tr key={i}>
                                <td>{g.home} vs {g.away}</td>
                                <td>🔒 Premium</td>
                                <td>🔒</td>
                                <td>🔒</td>
                              </tr>

                            ))}

                          </tbody>

                        </table>

                      )}

                    </td>

                    <td>
                      {slip.games?.length ? totalOdds.toFixed(2) : "-"}
                    </td>

                    <td>

                      {allowed && (

                        <button
                          className="btn btn-view"
                          onClick={() => openSlip(slip)}
                        >
                          View
                        </button>

                      )}

                    </td>

                  </tr>

                );

              })}

            </tbody>

          </table>

        )}

        <div className="pagination">

          <button
            className="btn"
            onClick={() => loadSlips(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </button>

          <span>
            Page {page} of {pages}
          </span>

          <button
            className="btn"
            onClick={() => loadSlips(page + 1)}
            disabled={page >= pages}
          >
            Next
          </button>

        </div>

      </div>

      {selected && (

        <div className="modal">

          <div className="modal-content">

            <button className="close" onClick={closeSlip}>
              ×
            </button>

            <h3>{selected.date} - Full Details</h3>

            <table className="inner-table">

              <tbody>

                {selected.games.map((g, i) => (

                  <tr key={i}>

                    <td>{g.home} vs {g.away}</td>

                    <td>
                      <span
                        className={`ou-badge ${
                          g.overUnder?.toLowerCase().includes("over")
                            ? "ou-over"
                            : "ou-under"
                        }`}
                      >
                        {g.overUnder || `${g.type} ${g.line}`}
                      </span>
                    </td>

                    <td>
                      Odd:
                      <span className="odds">
                        {(parseFloat(g.odds) || 1).toFixed(2)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`result-badge result-${
                          g.result || "pending"
                        }`}
                      >
                        {g.result || "pending"}
                      </span>
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      )}

    </div>

  );

} 
