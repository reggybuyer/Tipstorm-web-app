require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

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
    { home: String, away: String, odd: Number, overUnder: String, result: String },
  ],
  total: Number,
});

const User = mongoose.model("User", userSchema);
const Slip = mongoose.model("Slip", slipSchema);

// ===== Auto-expire premium users =====
app.use(async (req, res, next) => {
  const now = new Date();
  await User.updateMany(
    { premium: true, expiresAt: { $lt: now } },
    { premium: false, approved: false, plan: null, expiresAt: null }
  );
  next();
});

// ================== API ROUTES ==================

// Test route (root)
app.get("/api", (req, res) => {
  res.json({ message: "TipStorm backend running" });
});

// Register
app.post("/api/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password required" });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ success: false, message: "User already exists" });

    const hashed = bcrypt.hashSync(password, 10);

    await User.create({
      email,
      password: hashed,
      role: "user",
    });

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
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user)
      return res.json({ success: false, message: "Invalid login" });

    if (!user.approved)
      return res.json({ success: false, message: "Account not approved yet" });

    if (!bcrypt.compareSync(password, user.password))
      return res.json({ success: false, message: "Invalid login" });

    if (user.plan !== "free" && user.expiresAt && new Date() > new Date(user.expiresAt)) {
      user.plan = "free";
      user.expiresAt = null;
      await user.save();
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

// Approve user
app.post("/api/approve-user", async (req, res) => {
  try {
    const { adminEmail, userEmail } = req.body;

    const admin = await User.findOne({ email: adminEmail });
    if (!admin || admin.role !== "admin")
      return res.status(403).json({ success: false, message: "Unauthorized" });

    const user = await User.findOne({ email: userEmail });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    user.approved = true;
    await user.save();

    res.json({ success: true, message: `${userEmail} approved successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Activate plan
app.post("/api/activate", async (req, res) => {
  try {
    const { adminEmail, userEmail, plan } = req.body;

    const admin = await User.findOne({ email: adminEmail });
    if (!admin || admin.role !== "admin")
      return res.status(403).json({ success: false, message: "Unauthorized" });

    const user = await User.findOne({ email: userEmail });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    user.plan = plan;
    user.premium = plan !== "free";
    user.expiresAt = plan !== "free"
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : null;

    await user.save();

    res.json({ success: true, message: `${userEmail} activated on ${plan}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ================== SERVE FRONTEND ==================
const frontendPath = path.join(__dirname, "../frontend/build");
app.use(express.static(frontendPath));

// Serve admin.html
app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(frontendPath, "admin.html"));
});

// React SPA fallback (last)
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ===== Start Server =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`TipStorm backend running on port ${PORT}`)
); 
