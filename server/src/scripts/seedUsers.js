const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MONGO_URI } = require('../config');
const User = require('../models/User');

async function seed() {
  await mongoose.connect(MONGO_URI);

  const users = [
    {
      email: 'test1@example.com',
      password: 'Password123!',
      displayName: 'Test User One',
    },
    {
      email: 'test2@example.com',
      password: 'Password123!',
      displayName: 'Test User Two',
    },
  ];

  for (const u of users) {
    const existing = await User.findOne({ email: u.email });
    if (existing) continue;
    const passwordHash = await bcrypt.hash(u.password, 10);
    await User.create({
      email: u.email,
      passwordHash,
      displayName: u.displayName,
    });
  }

  console.log('Seeded test users');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

