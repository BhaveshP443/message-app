const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const chatRoutes = require("./routes/chat");
const { createSocketServer } = require("./socket");

// ===== ENV =====
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Allowed frontend origins
const allowedOrigins = [
  "http://localhost:5173",
  "https://message-app-theta-eight.vercel.app",
];

// ===== START SERVER =====
async function start() {
  try {
    // Connect MongoDB
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const app = express();
    const server = http.createServer(app);

    // ===== CORS SETUP =====
    app.use(
      cors({
        origin: function (origin, callback) {
          // Allow server-to-server requests or tools like Postman
          if (!origin) return callback(null, true);

          if (allowedOrigins.includes(origin)) {
            return callback(null, true);
          } else {
            return callback(new Error("Not allowed by CORS"));
          }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      })
    );

    // Handle preflight
    app.options("*", cors());

    // ===== MIDDLEWARE =====
    app.use(express.json());
    app.use(cookieParser());

    // ===== ROUTES =====
    app.use("/api/auth", authRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/chat", chatRoutes);

    // Health check route
    app.get("/health", (req, res) => {
      res.json({ ok: true });
    });

    // ===== SOCKET.IO =====
    createSocketServer(server);

    // ===== LISTEN =====
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server", err);
    process.exit(1);
  }
}

start();