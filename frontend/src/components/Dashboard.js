import React, { useEffect, useState, useRef } from "react";
import "../styles.css";
import axios from "axios";

export default function Dashboard({ games, user }) {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const [allUsers, setAllUsers] = useState([]);
  const [localGames, setLocalGames] = useState([]);
  const [currentUser, setCurrentUser] = useState(user);
  const [newSlip, setNewSlip] = useState({
    date: "",
    premium: false,
    vip: false,
    games: [{ home: "", away: "", odd: "", overUnder: "" }],
  });
  const [paymentMessage, setPaymentMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  const subscriptions = {
    weekly: { price: 500 },
    monthly: { price: 1500 },
    vip: { price: 3000 },
  };

  const emailRef = useRef();
  const passwordRef = useRef();

  // Calculate total odds
  const calculateTotalOdds = (gamesArray) => {
    const total = gamesArray.reduce((t, g) => t * parseFloat(g.odd || 1), 1);
    return total < 2 ? 2.0 : total.toFixed(2);
  };

  // Load initial games
  useEffect(() => {
    if (Array.isArray(games)) {
      const updated = games.map((s) => ({ ...s, total: calculateTotalOdds(s.games) }));
      setLocalGames(updated);
    }
  }, [games]);

  // Payment popup for non-premium users
  useEffect(() => {
    if (!currentUser.premium) {
      setPaymentMessage(
        "Send payment to 0789906001 (Mpesa), then forward your payment confirmation along with your registered email via WhatsApp or SMS for activation."
      );
      setShowPopup(true);
    }
  }, [currentUser]);

  // Fetch all users (admin)
  const fetchAllUsers = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/all-users/${currentUser.email}`);
      if (res.data.success) setAllUsers(res.data.users);
    } catch (err) {
      console.error(err);
    }
  };

  // Refresh slips for current user
  const refreshUser = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/games/${currentUser.email}`);
      if (Array.isArray(res.data)) {
        const updated = res.data.map((s) => ({ ...s, total: calculateTotalOdds(s.games) }));
        setLocalGames(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Set up intervals
  useEffect(() => {
    let userInterval, adminInterval;
    if (currentUser.role === "admin") {
      fetchAllUsers();
      adminInterval = setInterval(fetchAllUsers, 5000);
    }
    userInterval = setInterval(refreshUser, 10000);
    return () => {
      clearInterval(userInterval);
      if (adminInterval) clearInterval(adminInterval);
    };
  }, [currentUser]);

  // Logout
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // Update game results/overUnder
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
          overUnder: field === "overUnder" ? value : undefined,
        });
      } catch (err) {
        console.error("Failed to update game:", err);
      }
    }
  };

  // Approve user
  const approveUser = async (email) => {
    await axios.post(`${BACKEND_URL}/approve-user`, { adminEmail: currentUser.email, userEmail: email });
    fetchAllUsers();
  };

  // Activate user
  const activateUser = async (email, plan) => {
    try {
      await axios.post(`${BACKEND_URL}/activate`, { adminEmail: currentUser.email, userEmail: email, plan });
      alert(`User ${email} activated as ${plan.toUpperCase()}`);
      fetchAllUsers();
    } catch (err) {
      alert("Activation failed");
      console.error(err);
    }
  };

  // Subscribe payment popup
  const handleSubscribe = (type) => {
    const price = subscriptions[type].price;
    setPaymentMessage(
      `Send KES ${price} to 0789906001 (Mpesa), then forward your payment confirmation along with your registered email via WhatsApp or SMS for activation.`
    );
    setShowPopup(true);
  };

  const closePopup = () => setShowPopup(false);

  // Check if slip is locked
  const isLocked = (slip) => {
    if (currentUser.role === "admin") return false;
    if (slip.free) return false;
    if (slip.vip && currentUser.plan !== "vip") return true;
    if (slip.premium && !["vip", "weekly", "monthly"].includes(currentUser.plan)) return true;
    return false;
  };

  // Update slip badge/type
  const updateSlipType = async (slipIndex, type) => {
    const updated = [...localGames];
    updated[slipIndex].free = type === "free";
    updated[slipIndex].premium = type === "premium";
    updated[slipIndex].vip = type === "vip";
    setLocalGames(updated);
    try {
      await axios.post(`${BACKEND_URL}/update-slip-type`, { adminEmail: currentUser.email, slipIndex, type });
    } catch (err) {
      console.error("Failed to update slip badge:", err);
    }
  };

  // Add new game row for slip creation
  const addGameRow = () => setNewSlip({ ...newSlip, games: [...newSlip.games, { home: "", away: "", odd: "", overUnder: "" }] });

  // Update new slip game
  const updateNewGame = (i, field, value) => {
    const games = [...newSlip.games];
    games[i][field] = value;
    setNewSlip({ ...newSlip, games });
  };

  // Save new slip
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
    } catch {
      alert("Failed to add slip");
    }
  };

  const newSlipTotal = calculateTotalOdds(newSlip.games);

  // ===== REGISTER NEW USER =====
  const handleRegister = async () => {
    const email = emailRef.current.value.trim();
    const password = passwordRef.current.value.trim();
    if (!email || !password) return alert("Enter email and password");
    try {
      const res = await axios.post(`${BACKEND_URL}/register`, { email, password });
      if (res.data.success) {
        alert(res.data.message);
        emailRef.current.value = "";
        passwordRef.current.value = "";
        fetchAllUsers();
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Registration failed");
    }
  };

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

      {/* Payment popup */}
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
          <label>
            <input type="checkbox" checked={newSlip.premium} onChange={e => setNewSlip({ ...newSlip, premium: e.target.checked })} /> Premium
          </label>
          <label>
            <input type="checkbox" checked={newSlip.vip} onChange={e => setNewSlip({ ...newSlip, vip: e.target.checked, premium: true })} /> VIP
          </label>
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

      {/* ===== SLIPS TABLE DISPLAY ===== */}
      {localGames.map((slip, si) => (
        <div key={si} className={`slip ${slip.premium ? "premium" : slip.free ? "free" : ""}`} style={{ marginBottom: "20px" }}>
          <div className="slip-date">
            {slip.date}
            {slip.vip && <span className={`vip-badge ${isLocked(slip) ? "locked-badge" : ""}`}>VIP</span>}
            {!slip.vip && slip.premium && <span className={`premium-badge ${isLocked(slip) ? "locked-badge" : ""}`}>Premium</span>}
            {slip.free && <span className="free-badge">Free</span>}
          </div>

          {isLocked(slip) ? (
            <div className="locked-slip">🔒 Locked content</div>
          ) : (
            <table className="slip-table">
              <thead>
                <tr>
                  <th>Home</th>
                  <th>Away</th>
                  <th>Odd</th>
                  <th>Over/Under</th>
                  <th>Won/Lost</th>
                  {currentUser.role === "admin" && <th>Update</th>}
                </tr>
              </thead>
              <tbody>
                {slip.games.map((g, i) => (
                  <tr key={i}>
                    <td>{g.home}</td>
                    <td>{g.away}</td>
                    <td>{g.odd}</td>
                    <td>
                      {currentUser.role === "admin" ? (
                        <input placeholder="Over / Under" value={g.overUnder || ""} onChange={(e) => updateGame(si, i, "overUnder", e.target.value)} />
                      ) : (
                        g.overUnder && <span className={`over-under-text ${g.overUnder.toLowerCase() === "over" ? "over" : "under"}`}>{g.overUnder}</span>
                      )}
                    </td>
                    <td>
                      {currentUser.role === "admin" ? (
                        <select value={g.result || "Pending"} onChange={(e) => updateGame(si, i, "status", e.target.value)}>
                          <option value="Pending">Pending</option>
                          <option value="Won">Won</option>
                          <option value="Lost">Lost</option>
                        </select>
                      ) : (
                        <span className={`over-under-text ${g.result?.toLowerCase() === "won" ? "over" : g.result?.toLowerCase() === "lost" ? "under" : "neutral"}`}>
                          {g.result || "Pending"}
                        </span>
                      )}
                    </td>
                    {currentUser.role === "admin" && <td>—</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

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

      {/* Admin: Register and users table */}
      {currentUser.role === "admin" && (
        <>
          <div className="admin-register-user">
            <h3>Register New User</h3>
            <input type="email" placeholder="Email" ref={emailRef} />
            <input type="password" placeholder="Password" ref={passwordRef} />
            <button onClick={handleRegister}>Register</button>
          </div>
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
        </>
      )}
    </div>
  );
} 
