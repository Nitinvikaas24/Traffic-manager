const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

// Dev-only bootstrap seed. These are throwaway demo credentials, not
// production accounts — change or remove them before any real deployment.
const DEMO_USERS = [
  { username: 'admin', password: 'ChangeMe123!', role: 'admin', badgeId: 'ADMIN-001' },
  { username: 'officer1', password: 'ChangeMe123!', role: 'officer', badgeId: 'OFC-101' },
];

async function createUsers() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trafficSignals');
  console.log('MongoDB connected successfully');

  for (const demo of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(demo.password, 10);
    await User.findOneAndUpdate(
      { username: demo.username },
      { username: demo.username, passwordHash, role: demo.role, badgeId: demo.badgeId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`Upserted user "${demo.username}" (role: ${demo.role})`);
  }

  console.log('\nDemo credentials (CHANGE THESE before any real deployment):');
  DEMO_USERS.forEach((u) => console.log(`  ${u.username} / ${u.password} (${u.role})`));

  await mongoose.disconnect();
}

createUsers().catch((err) => {
  console.error('Error creating users:', err);
  process.exit(1);
});
