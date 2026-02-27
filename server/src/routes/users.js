const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('-passwordHash');
  res.json(user);
});

router.put('/me', auth, async (req, res) => {
  const { displayName, about, avatarUrl } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { displayName, about, avatarUrl },
    { new: true }
  ).select('-passwordHash');

  res.json(user);
});

router.get('/', auth, async (req, res) => {
  const { q } = req.query;
  const currentUserId = req.user.id;

  const query = q
    ? {
        _id: { $ne: currentUserId },
        $or: [
          { email: { $regex: q, $options: 'i' } },
          { displayName: { $regex: q, $options: 'i' } },
        ],
      }
    : { _id: { $ne: currentUserId } };

  const users = await User.find(query)
    .select('displayName email about avatarUrl isOnline lastSeenAt')
    .sort({ displayName: 1 })
    .limit(50);

  res.json(users);
});

module.exports = router;

