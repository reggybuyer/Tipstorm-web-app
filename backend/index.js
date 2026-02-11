// TipStorm backend - index.js
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const USERS_FILE = path.join(__dirname, "users.json");
const SLIPS_FILE = path.join(__dirname, "slips.json");

// ===== Load users =====
let users = {};
if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    let updated = false;
    Object.keys(users).forEach(email => {
        if (!users[email].password.startsWith("$2")) {
            users[email].password = bcrypt.hashSync(users[email].password, 10);
            updated = true;
        }
    });
    if (updated) fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ===== Load slips =====
let slips = [];
if (fs.existsSync(SLIPS_FILE)) {
    slips = JSON.parse(fs.readFileSync(SLIPS_FILE, "utf-8"));
}

// ===== Helper functions =====
function saveUsers() { fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2)); }
function saveSlips() { fs.writeFileSync(SLIPS_FILE, JSON.stringify(slips, null, 2)); }
function totalOdds(games) { return games.reduce((t, g) => t * Number(g.odd), 1).toFixed(2); }
function checkExpiry() {
    const now = new Date();
    Object.values(users).forEach(u => {
        if (u.premium && u.expiresAt && now > new Date(u.expiresAt)) {
            u.premium = false;
            u.approved = false;
            u.plan = null;
            u.expiresAt = null;
        }
    });
}

// Middleware to check expiry
app.use((req, res, next) => { checkExpiry(); next(); });

// ===== LOGIN =====
app.post("/login", (req, res) => {
    const { email, password } = req.body;
    const user = users[email];
    if (!user) return res.status(401).json({ success: false, message: "Invalid login" });
    const match = bcrypt.compareSync(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: "Invalid login" });

    res.json({
        success: true,
        user: {
            email,
            role: user.role,
            premium: user.role === "admin" ? true : user.premium || false,
            approved: user.role === "admin" ? true : user.approved || false,
            plan: user.role === "admin" ? "admin" : user.plan || null,
        },
    });
});

// ===== REGISTER =====
app.post("/register", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password required" });
    if (users[email]) return res.status(400).json({ success: false, message: "User already exists" });

    users[email] = {
        password: bcrypt.hashSync(password, 10),
        role: "user",
        active: true,
        premium: false,
        approved: false,
        plan: null,
        expiresAt: null,
    };
    saveUsers();

    res.json({ success: true, message: "User registered successfully" });
});

// ===== GET ALL USERS =====
app.get("/all-users/:adminEmail", (req, res) => {
    if (fs.existsSync(USERS_FILE)) {
        users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    }
    const admin = users[req.params.adminEmail];
    if (!admin || admin.role !== "admin")
        return res.status(401).json({ success: false, message: "Unauthorized" });

    const allUsers = Object.keys(users).map(email => ({
        email,
        role: users[email].role,
        premium: users[email].premium || false,
        approved: users[email].approved || false,
        plan: users[email].plan || null,
        expiresAt: users[email].expiresAt || null,
    }));
    res.json({ success: true, users: allUsers });
});

// ===== GET GAMES =====
app.get("/games/:email", (req, res) => {
    const user = users[req.params.email];
    if (!user) return res.status(401).json({ success: false, message: "Invalid user" });

    const data = slips.map(s => ({ ...s, total: totalOdds(s.games), free: s.free || false }));
    if (user.role === "admin") return res.json(data);
    if (user.premium && user.approved) return res.json(data);
    res.json(data.filter(s => !s.premium));
});

// ===== ADD SLIP =====
app.post("/add-slip", (req, res) => {
    const { adminEmail, slip } = req.body;
    const admin = users[adminEmail];
    if (!admin || admin.role !== "admin") return res.status(401).json({ success: false, message: "Unauthorized" });

    if (!slip || !slip.date || !Array.isArray(slip.games) || slip.games.length === 0)
        return res.status(400).json({ success: false, message: "Invalid slip data" });

    const formattedGames = slip.games.map(g => ({
        home: g.home,
        away: g.away,
        odd: Number(g.odd),
        overUnder: g.overUnder || "",
        result: g.result || "",
    }));

    const formattedSlip = {
        date: slip.date,
        vip: slip.vip || false,
        premium: slip.premium || false,
        free: !slip.vip && !slip.premium,
        games: formattedGames,
    };
    slips.unshift(formattedSlip);
    saveSlips();

    res.json({ success: true, slip: formattedSlip });
});

// ===== ACTIVATE USER =====
app.post("/activate", (req, res) => {
    const { adminEmail, userEmail, plan } = req.body;
    const admin = users[adminEmail];
    if (!admin || admin.role !== "admin") return res.status(401).json({ success: false, message: "Unauthorized" });

    const user = users[userEmail];
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const days = plan === "monthly" ? 30 : plan === "vip" ? 30 : 7;
    user.premium = true;
    user.approved = false;
    user.plan = plan;
    user.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    saveUsers();

    res.json({ success: true });
});

// ===== APPROVE USER =====
app.post("/approve-user", (req, res) => {
    const { adminEmail, userEmail } = req.body;
    const admin = users[adminEmail];
    if (!admin || admin.role !== "admin") return res.status(401).json({ success: false, message: "Unauthorized" });

    const user = users[userEmail];
    if (!user || !user.premium) return res.status(400).json({ success: false, message: "User not eligible" });

    user.approved = true;
    saveUsers();

    res.json({ success: true });
});

// ===== UPDATE GAME =====
app.post("/update-game", (req, res) => {
    const { adminEmail, slipIndex, gameIndex, result, overUnder } = req.body;
    const admin = users[adminEmail];
    if (!admin || admin.role !== "admin") return res.status(401).json({ success: false, message: "Unauthorized" });

    if (!slips[slipIndex] || !slips[slipIndex].games[gameIndex])
        return res.status(400).json({ success: false, message: "Invalid slip/game index" });

    const game = slips[slipIndex].games[gameIndex];
    if (result !== undefined) game.result = result;
    if (overUnder !== undefined) game.overUnder = overUnder;
    saveSlips();

    res.json({ success: true, game });
});

// ===== START SERVER =====
app.listen(PORT, () => console.log(`TipStorm backend running at http://localhost:${PORT}`)); 
