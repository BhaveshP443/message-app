const express = require('express');
const sanitizeHtml = require('sanitize-html');
const auth = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const router = express.Router();

router.get('/conversations', auth, async (req, res) => {
  const userId = req.user.id;
  const conversations = await Conversation.find({ participants: userId })
    .sort({ lastMessageAt: -1 })
    .limit(50)
    .populate('participants', 'displayName email avatarUrl isOnline lastSeenAt')
    .lean();

  const convoIds = conversations.map((c) => c._id);
  const lastMessages = await Message.aggregate([
    { $match: { conversation: { $in: convoIds } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$conversation',
        doc: { $first: '$$ROOT' },
      },
    },
  ]);

  const lastMap = {};
  for (const lm of lastMessages) {
    lastMap[lm._id.toString()] = lm.doc;
  }

  const result = conversations.map((c) => ({
    ...c,
    lastMessage: lastMap[c._id.toString()] || null,
  }));

  res.json(result);
});

router.post('/conversations/with', auth, async (req, res) => {
  const currentUserId = req.user.id;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }

  let conversation = await Conversation.findOne({
    participants: { $all: [currentUserId, userId], $size: 2 },
  }).populate('participants', 'displayName email avatarUrl isOnline lastSeenAt');

  if (!conversation) {
    const created = await Conversation.create({
      participants: [currentUserId, userId],
      lastMessageAt: new Date(),
    });
    conversation = await Conversation.findById(created._id).populate(
      'participants',
      'displayName email avatarUrl isOnline lastSeenAt'
    );
  }

  res.json(conversation);
});

router.get('/conversations/:id/messages', auth, async (req, res) => {
  const { id } = req.params;
  const { before, limit = 30 } = req.query;
  const userId = req.user.id;

  const convo = await Conversation.findById(id);
  if (!convo || !convo.participants.some((p) => p.toString() === userId)) {
    return res.status(404).json({ message: 'Conversation not found' });
  }

  const query = { conversation: id };
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit, 10))
    .lean();

  res.json(messages.reverse());
});

router.post('/messages', auth, async (req, res) => {
  const { toUserId, content } = req.body;
  const fromUserId = req.user.id;

  if (!toUserId || !content) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  const cleanContent = sanitizeHtml(content, {
    allowedTags: [],
    allowedAttributes: {},
  });

  let conversation = await Conversation.findOne({
    participants: { $all: [fromUserId, toUserId], $size: 2 },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [fromUserId, toUserId],
      lastMessageAt: new Date(),
    });
  } else {
    conversation.lastMessageAt = new Date();
    await conversation.save();
  }

  const message = await Message.create({
    conversation: conversation._id,
    from: fromUserId,
    to: toUserId,
    content: cleanContent,
    sentAt: new Date(),
  });

  res.status(201).json({ conversationId: conversation._id, message });
});

router.post('/conversations/:id/read', auth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const convo = await Conversation.findById(id);
  if (!convo || !convo.participants.some((p) => p.toString() === userId)) {
    return res.status(404).json({ message: 'Conversation not found' });
  }

  await Message.updateMany(
    { conversation: id, to: userId, readAt: null },
    { $set: { readAt: new Date() } }
  );

  res.json({ success: true });
});

module.exports = router;

