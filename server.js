require("dotenv").config();
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors({}));
// app.options("*", cors());

// Cache the Mongo connection across serverless invocations.
// On Vercel each function instance may be reused; without this every cold
// start would open a new connection and exhaust the Atlas connection pool.
let mongoPromise = null;
function connectMongo() {
  if (!process.env.MONGO_URI) {
    return Promise.reject(new Error("MONGO_URI is not set"));
  }
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!mongoPromise) {
    mongoPromise = mongoose
      .connect(process.env.MONGO_URI)
      .then(() => console.log("MongoDB connected"))
      .catch((err) => {
        mongoPromise = null;
        throw err;
      });
  }
  return mongoPromise;
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // ignored on Vercel — static assets are served from /public by Vercel's CDN

// Explicit handler so "/" works on Vercel too (express.static is ignored there)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Ensure DB is connected before any route runs
app.use(async (req, res, next) => {
  try {
    await connectMongo();
    next();
  } catch (err) {
    next(err);
  }
});

// Routes
app.use("/api", require("./routes/media.routes"));

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR HANDLER:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Server error"
  });
});

// Local dev only. On Vercel, the file is imported and Vercel calls the
// exported handler — `require.main === module` is false there.
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  connectMongo().catch(console.error);
  app.listen(PORT, () => console.log("Server running on port", PORT));
}

module.exports = app;
