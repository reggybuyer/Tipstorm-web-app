require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = process.env.JWT_SECRET || "supersecretkey";

// ===================
// MongoDB
// ===================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ===================
// Schema
// ===================
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" },
  premium: { type: Boolean, default: false },
  approved: { type: Boolean, default: false },
  plan: { type: String, default: "free" },
  expiresAt: { type: Date, default: null },
});

const User = mongoose.model("User", userSchema);

// ===================
// Auto Expire Premium + Fix Null Plan
// ===================
app.use(async (req, res, next) => {
  const now = new Date();

  await User.updateMany(
    { premium: true, expiresAt: { $lt: now } },
    { premium: false, plan: "free", expiresAt: null }
  );

  // fix null plans
  await User.updateMany({ plan: null }, { plan: "free" });

  next();
});

// ===================
// JWT Middleware
// ===================
function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ success: false, message: "No token provided" });

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ success: false, message: "Admin only" });

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}

// ===================
// Test Route
// ===================
app.get("/api", (req, res) => {
  res.json({ message: "TipStorm backend running" });
});

// ===================
// Register
// ===================
app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password required" });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ success: false, message: "User already exists" });

    const hashed = bcrypt.hashSync(password, 10);
    await User.create({ email, password: hashed });

    res.json({ success: true, message: "Registered. Await admin approval." });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ===================
// Login
// ===================
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user)
      return res.json({ success: false, message: "Invalid login" });

    if (!user.approved)
      return res.json({ success: false, message: "Account not approved" });

    const match = bcrypt.compareSync(password, user.password);
    if (!match)
      return res.json({ success: false, message: "Invalid login" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        email: user.email,
        role: user.role,
        plan: user.plan,
        premium: user.premium,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ===================
// Get All Users (Admin)
// ===================
app.get("/all-users", verifyAdmin, async (req, res) => {
  const users = await User.find();
  res.json({ success: true, users });
});

// ===================
// Approve User (Admin)
// ===================
app.post("/approve-user", verifyAdmin, async (req, res) => {
  const { userEmail } = req.body;

  const user = await User.findOne({ email: userEmail });
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  user.approved = true;
  await user.save();

  res.json({ success: true, message: "User approved" });
});

// ===================
// Activate Plan (Admin)
// ===================
app.post("/activate", verifyAdmin, async (req, res) => {
  const { userEmail, plan } = req.body;

  const user = await User.findOne({ email: userEmail });
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  user.plan = plan;
  user.premium = plan !== "free";
  user.expiresAt =
    plan !== "free"
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : null;

  await user.save();

  res.json({ success: true, message: "Plan activated" });
});

// ===================
// Serve Frontend
// ===================
const frontendPath = path.join(__dirname, "../frontend/build");
app.use(express.static(frontendPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ===================
// Start Server
// ===================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`TipStorm backend running on port ${PORT}`);
}); 
