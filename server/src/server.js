const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { PORT, MONGO_URI, CLIENT_ORIGINS } = require('./config');
const { createSocketServer } = require('./socket');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chat');

async function start() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const app = express();
  const server = http.createServer(app);

  app.use(
    cors({
      origin: CLIENT_ORIGINS,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/chat', chatRoutes);

  app.get('/health', (req, res) => {
    res.json({ ok: true });
  });

  createSocketServer(server);

  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});

