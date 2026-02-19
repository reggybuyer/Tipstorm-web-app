// TipStorm Backend - index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cron = require("node-cron");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// ===== MongoDB connection =====
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ===== Schemas =====
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" },
  premium: { type: Boolean, default: false },
  approved: { type: Boolean, default: false },
  plan: { type: String, default: null },
  expiresAt: { type: Date, default: null },
});

const slipSchema = new mongoose.Schema({
  date: { type: String, required: true },
  vip: { type: Boolean, default: false },
  premium: { type: Boolean, default: false },
  free: { type: Boolean, default: true },
  games: [
    {
      home: String,
      away: String,
      odd: Number,
      overUnder: String,
      result: String,
    },
  ],
  total: Number,
});

const User = mongoose.model("User", userSchema);
const Slip = mongoose.model("Slip", slipSchema);

// ===== Helper =====
function totalOdds(games) {
  return Number(
    games.reduce((total, game) => total * Number(game.odd || 1), 1).toFixed(2)
  );
}

// ===== Auto-expire premium users with cron =====
// Runs every hour at minute 0
cron.schedule("0 * * * *", async () => {
  const now = new Date();
  try {
    const result = await User.updateMany(
      { premium: true, expiresAt: { $lt: now } },
      { premium: false, approved: false, plan: null, expiresAt: null }
    );
    console.log(`Auto-expired users checked at ${now}. Modified: ${result.modifiedCount}`);
  } catch (err) {
    console.error("Cron auto-expire error:", err);
  }
});

// ===== Routes =====

// Test route
app.get("/", (req, res) => {
  res.json({ message: "TipStorm backend running" });
});

// Register
app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password required" });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ success: false, message: "User already exists" });

    const hashed = bcrypt.hashSync(password, 10);
    await User.create({ email, password: hashed, role: "user" });

    res.json({
      success: true,
      message: "User registered successfully. Await admin approval.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "Invalid login" });
    if (!user.approved) return res.json({ success: false, message: "Account not approved yet" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.json({ success: false, message: "Invalid login" });

    // Expiry check
    if (user.plan !== "free" && user.expiresAt) {
      const now = new Date();
      if (now > new Date(user.expiresAt)) {
        user.plan = "free";
        user.expiresAt = null;
        await user.save();
      }
    }

    res.json({
      success: true,
      user: {
        email: user.email,
        role: user.role,
        plan: user.plan,
        premium: user.premium,
        approved: user.approved,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get all users (admin)
app.get("/all-users/:adminEmail", async (req, res) => {
  try {
    const admin = await User.findOne({ email: req.params.adminEmail });
    if (!admin || admin.role !== "admin")
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const users = await User.find();
    res.json({ success: true, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Activate user (admin sets plan)
app.post("/activate", async (req, res) => {
  try {
    const { adminEmail, userEmail, plan } = req.body;
    const admin = await User.findOne({ email: adminEmail });
    if (!admin || admin.role !== "admin")
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const user = await User.findOne({ email: userEmail });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const days = plan === "monthly" || plan === "vip" ? 30 : 7;
    user.premium = true;
    user.approved = false; // admin still needs to approve
    user.plan = plan;
    user.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await user.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Approve user
app.post("/approve-user", async (req, res) => {
  try {
    const { adminEmail, userEmail } = req.body;
    const admin = await User.findOne({ email: adminEmail });
    if (!admin || admin.role !== "admin")
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const user = await User.findOne({ email: userEmail });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.approved = true;
    await user.save();

    res.json({ success: true, message: `${userEmail} approved successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get slips for user
app.get("/games/:email", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    let slips = await Slip.find();
    slips = slips.map((s) => ({ ...s.toObject(), total: totalOdds(s.games) }));

    if (user.role === "admin") return res.json(slips);

    const visibleSlips = slips.filter((s) => {
      if (s.free) return true;
      if (s.premium && ["weekly", "monthly", "vip"].includes(user.plan)) return true;
      if (s.vip && user.plan === "vip") return true;
      return false;
    });

    res.json(visibleSlips);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Add slip (admin)
app.post("/add-slip", async (req, res) => {
  try {
    const { adminEmail, slip } = req.body;
    const admin = await User.findOne({ email: adminEmail });
    if (!admin || admin.role !== "admin")
      return res.status(403).json({ success: false, message: "Unauthorized" });

    if (!slip || !slip.date || !Array.isArray(slip.games) || slip.games.length === 0)
      return res.status(400).json({ success: false, message: "Invalid slip data" });

    const formattedGames = slip.games.map((g) => ({
      home: g.home,
      away: g.away,
      odd: Number(g.odd),
      overUnder: g.overUnder || "",
      result: g.result || "",
    }));

    const newSlip = await Slip.create({
      date: slip.date,
      vip: slip.vip || false,
      premium: slip.premium || false,
      free: !slip.vip && !slip.premium,
      games: formattedGames,
      total: totalOdds(formattedGames),
    });

    res.json({ success: true, slip: newSlip });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to add slip" });
  }
});

// Update game (admin)
app.post("/update-game", async (req, res) => {
  try {
    const { adminEmail, slipId, gameIndex, result, overUnder } = req.body;
    const admin = await User.findOne({ email: adminEmail });
    if (!admin || admin.role !== "admin")
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const slip = await Slip.findById(slipId);
    if (!slip || !slip.games[gameIndex])
      return res.status(400).json({ success: false, message: "Invalid slip/game index" });

    if (result !== undefined) slip.games[gameIndex].result = result;
    if (overUnder !== undefined) slip.games[gameIndex].overUnder = overUnder;
    await slip.save();

    res.json({ success: true, game: slip.games[gameIndex] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update slip type (admin)
app.post("/update-slip-type", async (req, res) => {
  try {
    const { adminEmail, slipId, type } = req.body;
    const admin = await User.findOne({ email: adminEmail });
    if (!admin || admin.role !== "admin")
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const slip = await Slip.findById(slipId);
    if (!slip) return res.status(400).json({ success: false, message: "Invalid slip" });

    slip.free = type === "free";
    slip.premium = type === "premium";
    slip.vip = type === "vip";
    await slip.save();

    res.json({ success: true, slip });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`TipStorm backend running on port ${PORT}`);
}); 
