import React, { useEffect, useState } from "react";
import "../styles.css";
import axios from "axios";

export default function Dashboard({ games, user }) {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL; // <- online backend URL
  const [allUsers, setAllUsers] = useState([]);
  const [localGames, setLocalGames] = useState([]);
  const [currentUser, setCurrentUser] = useState(user);
  const [newSlip, setNewSlip] = useState({
    date: "",
    premium: false,
    vip: false,
    games: [{ home: "", away: "", odd: "", overUnder: "" }]
  });
  const [paymentMessage, setPaymentMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  const subscriptions = { weekly: { price: 500 }, monthly: { price: 1500 }, vip: { price: 3000 } };

  const calculateTotalOdds = (gamesArray) => {
    const total = gamesArray.reduce((t, g) => t * parseFloat(g.odd || 1), 1);
    return total < 2 ? 2.0 : total.toFixed(2);
  };

  // Load games
  useEffect(() => {
    if (Array.isArray(games)) {
      const updated = games.map((s) => ({ ...s, total: calculateTotalOdds(s.games) }));
      setLocalGames(updated);
    }
  }, [games]);

  // Payment popup
  useEffect(() => {
    if (!currentUser.premium) {
      setPaymentMessage(
        "Send payment to 0789906001 (Mpesa), then forward your payment confirmation along with your registered email via WhatsApp or SMS for activation."
      );
      setShowPopup(true);
    }
  }, [currentUser]);

  const fetchAllUsers = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/all-users/${currentUser.email}`);
      if (res.data.success) setAllUsers(res.data.users);
    } catch (err) { console.error(err); }
  };

  const refreshUser = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/games/${currentUser.email}`);
      if (Array.isArray(res.data)) {
        const updated = res.data.map((s) => ({ ...s, total: calculateTotalOdds(s.games) }));
        setLocalGames(updated);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (currentUser.role === "admin") {
      fetchAllUsers();
      const i = setInterval(fetchAllUsers, 5000);
      return () => clearInterval(i);
    }
    const u = setInterval(refreshUser, 10000);
    return () => clearInterval(u);
  }, [currentUser]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const updateGame = async (slipIndex, gameIndex, field, value) => {
    const updated = [...localGames];
    if (field === "status") updated[slipIndex].games[gameIndex].result = value.toLowerCase();
    if (field === "overUnder") updated[slipIndex].games[gameIndex].overUnder = value;
    setLocalGames(updated);

    if (currentUser.role === "admin") {
      try {
        await axios.post(`${BACKEND_URL}/update-game`, {
          adminEmail: currentUser.email,
          slipIndex,
          gameIndex,
          result: field === "status" ? value : undefined,
          overUnder: field === "overUnder" ? value : undefined
        });
      } catch (err) { console.error("Failed to update game:", err); }
    }
  };

  const approveUser = async (email) => {
    await axios.post(`${BACKEND_URL}/approve-user`, { adminEmail: currentUser.email, userEmail: email });
    fetchAllUsers();
  };

  const activateUser = async (email, plan) => {
    try {
      await axios.post(`${BACKEND_URL}/activate`, { adminEmail: currentUser.email, userEmail: email, plan });
      alert(`User ${email} activated as ${plan.toUpperCase()}`);
      fetchAllUsers();
    } catch (err) { alert("Activation failed"); console.error(err); }
  };

  const handleSubscribe = (type) => {
    const price = subscriptions[type].price;
    setPaymentMessage(
      `Send KES ${price} to 0789906001 (Mpesa), then forward your payment confirmation along with your registered email via WhatsApp or SMS for activation.`
    );
    setShowPopup(true);
  };
  const closePopup = () => setShowPopup(false);

  const isLocked = (slip) => {
    if (currentUser.role === "admin") return false;
    if (slip.free) return false;
    if (slip.vip && currentUser.plan !== "vip") return true;
    if (slip.premium && !["vip", "weekly", "monthly"].includes(currentUser.plan)) return true;
    return false;
  };

  const updateSlipType = async (slipIndex, type) => {
    const updated = [...localGames];
    updated[slipIndex].free = type === "free";
    updated[slipIndex].premium = type === "premium";
    updated[slipIndex].vip = type === "vip";
    setLocalGames(updated);
    try {
      await axios.post(`${BACKEND_URL}/update-slip-type`, { adminEmail: currentUser.email, slipIndex, type });
    } catch (err) { console.error("Failed to update slip badge:", err); }
  };

  const addGameRow = () => setNewSlip({ ...newSlip, games: [...newSlip.games, { home: "", away: "", odd: "", overUnder: "" }] });
  const updateNewGame = (i, field, value) => {
    const games = [...newSlip.games];
    games[i][field] = value;
    setNewSlip({ ...newSlip, games });
  };

  const saveSlip = async () => {
    if (!newSlip.date) return alert("Select slip date");
    for (const g of newSlip.games) if (!g.home || !g.away || !g.odd) return alert("Fill all game fields");
    const slipToSave = { ...newSlip };
    slipToSave.total = calculateTotalOdds(slipToSave.games);
    slipToSave.free = !slipToSave.premium && !slipToSave.vip;
    try {
      await axios.post(`${BACKEND_URL}/add-slip`, { adminEmail: currentUser.email, slip: slipToSave });
      alert("Slip added successfully");
      setNewSlip({ date: "", premium: false, vip: false, games: [{ home: "", away: "", odd: "", overUnder: "" }] });
      refreshUser();
    } catch { alert("Failed to add slip"); }
  };

  const newSlipTotal = calculateTotalOdds(newSlip.games);

  return (
    <div className="dashboard-container">
      {/* Top bar */}
      <div className="top-bar" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", marginBottom: "15px" }}>
        <span className="welcome">Welcome, {currentUser.email} ({currentUser.role})</span>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>

      {/* Subscriptions */}
      <div className="subscription-container">
        <h3>Subscriptions</h3>
        <ul>
          {Object.entries(subscriptions).map(([type, data]) => (
            <li key={type}>
              <strong>{type.toUpperCase()}</strong> – KES {data.price}
              <button className={type} onClick={() => handleSubscribe(type)}>Subscribe</button>
            </li>
          ))}
        </ul>
      </div>

      {/* Payment Popup */}
      {showPopup && paymentMessage && (
        <div className="popup-overlay">
          <div className="popup-content">
            <h3>Payment Instructions</h3>
            <p>{paymentMessage}</p>
            <button onClick={closePopup}>Close</button>
          </div>
        </div>
      )}

      {/* Admin: create slips */}
      {currentUser.role === "admin" && (
        <div className="admin-slip-builder">
          <h3>Create New Slip</h3>
          <input type="date" value={newSlip.date} onChange={e => setNewSlip({ ...newSlip, date: e.target.value })} />
          <label><input type="checkbox" checked={newSlip.premium} onChange={e => setNewSlip({ ...newSlip, premium: e.target.checked })} /> Premium</label>
          <label><input type="checkbox" checked={newSlip.vip} onChange={e => setNewSlip({ ...newSlip, vip: e.target.checked, premium: true })} /> VIP</label>
          {newSlip.games.map((g, i) => (
            <div key={i} className="game-row">
              <input placeholder="Home" value={g.home} onChange={e => updateNewGame(i, "home", e.target.value)} />
              <input placeholder="Away" value={g.away} onChange={e => updateNewGame(i, "away", e.target.value)} />
              <input placeholder="Odd" value={g.odd} onChange={e => updateNewGame(i, "odd", e.target.value)} />
              <input placeholder="Over / Under" value={g.overUnder} onChange={e => updateNewGame(i, "overUnder", e.target.value)} />
            </div>
          ))}
          <div><strong>Total Odds:</strong> {newSlipTotal}</div>
          <button onClick={addGameRow}>+ Add Game</button>
          <button onClick={saveSlip}>Save Slip</button>
        </div>
      )}

      {/* Display slips */}
      {localGames.map((slip, si) => (
        <div key={si} className={`slip ${slip.premium ? "premium" : slip.free ? "free" : ""}`}>
          <div className="slip-date">
            {slip.date}
            {slip.vip && <span className={`vip-badge ${isLocked(slip) ? "locked-badge" : ""}`}>VIP</span>}
            {!slip.vip && slip.premium && <span className={`premium-badge ${isLocked(slip) ? "locked-badge" : ""}`}>Premium</span>}
            {slip.free && <span className="free-badge">Free</span>}
          </div>
          {isLocked(slip) ? <div className="locked-slip">🔒 Locked content</div> : slip.games.map((g, i) => (
            <div key={i} className="game-row">
              <span className="team home">{g.home}</span> vs <span className="team away">{g.away}</span>
              <span className="odd">{g.odd}</span>
              {currentUser.role === "admin" ? (
                <>
                  <input placeholder="Over / Under" value={g.overUnder || ""} onChange={e => updateGame(si, i, "overUnder", e.target.value)} />
                  <select value={g.result || "Pending"} onChange={e => updateGame(si, i, "status", e.target.value)}>
                    <option value="Pending">Pending</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </>
              ) : (
                <>
                  {g.overUnder && <span className={`over-under-text ${g.overUnder.toLowerCase() === "over" ? "over" : "under"}`}>{g.overUnder}</span>}
                  <span className={`over-under-text ${g.result?.toLowerCase() === "won" ? "over" : g.result?.toLowerCase() === "lost" ? "under" : "neutral"}`}>{g.result || "Pending"}</span>
                </>
              )}
            </div>
          ))}
          {!isLocked(slip) && <div className="total-odds">Total Odds: {slip.total}</div>}
          {currentUser.role === "admin" && (
            <div className="badge-controls" style={{ marginTop: "10px" }}>
              <span>Set Badge: </span>
              <button onClick={() => updateSlipType(si, "free")}>Free</button>
              <button onClick={() => updateSlipType(si, "premium")}>Premium</button>
              <button onClick={() => updateSlipType(si, "vip")}>VIP</button>
            </div>
          )}
        </div>
      ))}

      {/* Admin users table */}
      {currentUser.role === "admin" && (
        <div className="admin-logged-users">
          <h3>Users</h3>
          <table className="users-table">
            <thead>
              <tr><th>Email</th><th>Plan</th><th>Approved</th><th>Action</th></tr>
            </thead>
            <tbody>
              {allUsers.map((u, i) => (
                <tr key={i} className={u.premium && !u.approved ? "premium-user-glow" : ""}>
                  <td>{u.email}</td>
                  <td>{u.plan ? u.plan.toUpperCase() : "None"} {u.expiresAt ? `(expires ${new Date(u.expiresAt).toLocaleDateString()})` : ""}</td>
                  <td>{u.approved ? "Yes" : "No"}</td>
                  <td>
                    {!u.premium ? (
                      <select onChange={e => activateUser(u.email, e.target.value)} defaultValue="">
                        <option value="" disabled>Select Plan</option>
                        {Object.keys(subscriptions).map(p => (<option key={p} value={p}>{p.toUpperCase()}</option>))}
                      </select>
                    ) : (!u.approved && <button onClick={() => approveUser(u.email)}>Approve</button>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
} 
