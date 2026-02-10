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

  // ===== ADMIN: Fetch all users =====
  const fetchAllUsers = async () => {
    try {
      if (currentUser.role === "admin") {
        const res = await axios.get(`${BACKEND_URL}/all-users/${currentUser.email}`);
        if (res.data.success) setAllUsers(res.data.users);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  // Refresh games/slips for current user
  const refreshUser = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/games/${currentUser.email}`);
      if (Array.isArray(res.data)) {
        const updated = res.data.map((s) => ({ ...s, total: calculateTotalOdds(s.games) }));
        setLocalGames(updated);
      }
    } catch (err) {
      console.error("Failed to refresh user:", err);
    }
  };

  // ===== ACTIVATE USER =====
  const activateUser = async (email, plan) => {
    try {
      await axios.post(`${BACKEND_URL}/activate`, {
        adminEmail: currentUser.email,
        userEmail: email,
        plan,
      });
      alert(`User ${email} activated as ${plan.toUpperCase()}`);
      fetchAllUsers(); // <- ensures admin sees new user immediately
    } catch (err) {
      alert("Activation failed");
      console.error(err);
    }
  };

  // ===== APPROVE USER =====
  const approveUser = async (email) => {
    try {
      await axios.post(`${BACKEND_URL}/approve-user`, {
        adminEmail: currentUser.email,
        userEmail: email,
      });
      fetchAllUsers(); // <- refresh user list immediately
    } catch (err) {
      console.error("Approval failed:", err);
    }
  };

  // ===== AUTO REFRESH =====
  useEffect(() => {
    if (currentUser.role === "admin") {
      fetchAllUsers();
      const interval = setInterval(fetchAllUsers, 5000); // optional periodic refresh
      return () => clearInterval(interval);
    }
    const uInterval = setInterval(refreshUser, 10000); // refresh games for everyone
    return () => clearInterval(uInterval);
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
      } catch (err) {
        console.error("Failed to update game:", err);
      }
    }
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
    } catch (err) {
      console.error("Failed to update slip badge:", err);
    }
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
    } catch {
      alert("Failed to add slip");
    }
  };

  const newSlipTotal = calculateTotalOdds(newSlip.games);

  return (
    <div className="dashboard-container">
      {/* ... All your original JSX stays unchanged ... */}
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
