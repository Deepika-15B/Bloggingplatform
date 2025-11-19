const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') }); // ensure backend/.env is used

const authRoutes = require('./routes/auth');        // signup/login for normal users
const adminAuthRoutes = require('./routes/admin');    // admin login
const adminManageRoutes = require('./routes/adminRoutes'); // admin user/post management
const userRoutes = require('./routes/userRoutes');    // user profiles, following, etc.
const postRoutes = require("./routes/postRoutes");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// ✅ DB connection (Atlas instead of local Compass)
const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/blog-project";
mongoose.connect(mongoURI)
  .then(() => {
    try {
      const safeUri = new URL(mongoURI.replace('mongodb+srv://', 'http://').replace('mongodb://', 'http://'));
      console.log(`✅ MongoDB connected → host: ${safeUri.hostname}, db: ${safeUri.pathname.replace('/', '')}`);
    } catch (_) {
      console.log("✅ MongoDB connected");
    }
  })
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Route mounting
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin/manage', adminManageRoutes);
app.use('/api/users', userRoutes);
app.use("/api/posts", postRoutes);

// ******************************************************
// ✅ VERCEL DEPLOYMENT FIX: Serve React Frontend
// ******************************************************

// 1. Define the path to the static build files (assuming 'build' folder in 'frontend')
const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'build');

// 2. Serve static files from the React build directory
// This must be placed AFTER your API routes (e.g., /api/posts)
app.use(express.static(frontendBuildPath));

// 3. Handle React routing, return all other requests to React app's index.html
app.get('/*', (req, res) => {
  // Check if the file exists before sending to prevent internal errors
  const indexPath = path.join(frontendBuildPath, 'index.html');
  if (req.originalUrl.includes('/api/')) {
    // This case should be caught by the routes above, but good for safety
    return res.status(404).send('API route not found');
  } else if (!require('fs').existsSync(indexPath)) {
    // This means the frontend build likely failed on Vercel
    return res.status(500).send('Frontend build not found. Check Vercel build logs.');
  }
  res.sendFile(indexPath);
});
// ******************************************************
// ✅ VERCEL REQUIREMENT: EXPORT THE APP
// ******************************************************
module.exports = app;

console.log('✅ Server setup complete for Vercel Serverless Function.');

// Allow local execution via `node backend/server.js`
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

