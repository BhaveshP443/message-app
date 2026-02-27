const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, CLIENT_ORIGINS } = require('../config');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const sanitizeHtml = require('sanitize-html');

const onlineUsers = new Map(); // userId -> count of active sockets

function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: CLIENT_ORIGINS,
      methods: ['GET', 'POST'],
    },
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Unauthorized'));
      }

      const payload = jwt.verify(token, JWT_SECRET);
      socket.userId = payload.userId;

      await User.findByIdAndUpdate(socket.userId, {
        isOnline: true,
        lastSeenAt: new Date(),
      });

      const current = onlineUsers.get(socket.userId) || 0;
      onlineUsers.set(socket.userId, current + 1);

      socket.join(`user:${socket.userId}`);

      next();
    } catch (err) {
      console.error('Socket auth error', err);
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('conversation:join', async (conversationId) => {
      if (!conversationId) return;
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('message:send', async (payload, callback) => {
      try {
        const { toUserId, content } = payload || {};
        if (!toUserId || !content) return;

        const cleanContent = sanitizeHtml(content, {
          allowedTags: [],
          allowedAttributes: {},
        });

        let conversation = await Conversation.findOne({
          participants: { $all: [socket.userId, toUserId], $size: 2 },
        });

        if (!conversation) {
          conversation = await Conversation.create({
            participants: [socket.userId, toUserId],
            lastMessageAt: new Date(),
          });
        } else {
          conversation.lastMessageAt = new Date();
          await conversation.save();
        }

        const message = await Message.create({
          conversation: conversation._id,
          from: socket.userId,
          to: toUserId,
          content: cleanContent,
          sentAt: new Date(),
        });

        const payloadMessage = {
          ...message.toObject(),
          conversationId: conversation._id,
        };

        io.to(`conversation:${conversation._id}`).emit('message:new', payloadMessage);
        io.to(`user:${toUserId}`).emit('message:new', payloadMessage);
        io.to(`user:${socket.userId}`).emit('message:new', payloadMessage);

        callback && callback({ ok: true, conversationId: conversation._id, message: payloadMessage });
      } catch (err) {
        console.error('message:send error', err);
        callback && callback({ ok: false });
      }
    });

    socket.on('typing', (payload) => {
      const { toUserId, isTyping } = payload || {};
      if (!toUserId) return;
      io.to(`user:${toUserId}`).emit('typing', {
        fromUserId: socket.userId,
        isTyping: !!isTyping,
      });
    });

    socket.on('messages:markRead', async (conversationId) => {
      try {
        if (!conversationId) return;
        await Message.updateMany(
          { conversation: conversationId, to: socket.userId, readAt: null },
          { $set: { readAt: new Date() } }
        );
        io.to(`conversation:${conversationId}`).emit('messages:read', {
          conversationId,
          userId: socket.userId,
        });
      } catch (err) {
        console.error('messages:markRead error', err);
      }
    });

    socket.on('disconnect', async () => {
      try {
        const current = onlineUsers.get(socket.userId) || 0;
        if (current <= 1) {
          onlineUsers.delete(socket.userId);
          await User.findByIdAndUpdate(socket.userId, {
            isOnline: false,
            lastSeenAt: new Date(),
          });
        } else {
          onlineUsers.set(socket.userId, current - 1);
        }
      } catch (err) {
        console.error('disconnect error', err);
      }
    });
  });

  return io;
}

module.exports = { createSocketServer };

