require('dotenv').config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chat-app';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

// Support one or more allowed client origins for CORS / Socket.io.
// Example: CLIENT_ORIGINS="http://localhost:5173,https://your-app.com"
const rawOrigins =
  process.env.CLIENT_ORIGINS ||
  process.env.CLIENT_ORIGIN || // backwards compatibility
  'http://localhost:5173';
const CLIENT_ORIGINS = rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);

module.exports = {
  PORT,
  MONGO_URI,
  JWT_SECRET,
  CLIENT_ORIGINS,
};

