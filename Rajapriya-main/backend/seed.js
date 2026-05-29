require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Center = require('./models/Center');

const required = ['MONGO_URI', 'SEED_RV_OWNER_PASSWORD', 'SEED_GLAM_OWNER_PASSWORD', 'SEED_GLAM_MANAGER_PASSWORD'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`${key} is required before running npm run seed`);
    process.exit(1);
  }
}

async function createUserIfMissing(user) {
  const existing = await User.findOne({ username: user.username });
  if (existing) {
    console.log(`${user.username} already exists`);
    return;
  }

  await new User(user).save();
  console.log(`${user.username} created`);
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  let center = await Center.findOne({ name: 'Glam' });
  if (!center) {
    center = await new Center({
      name: 'Glam',
      address: 'Chennai',
      gstNumber: 'GST000000',
      gstRate: 18
    }).save();
    console.log('Glam center created');
  } else {
    console.log('Glam center already exists');
  }

  await createUserIfMissing({
    name: 'RV Owner',
    username: 'rvowner',
    password: process.env.SEED_RV_OWNER_PASSWORD,
    role: 'rv_owner'
  });

  await createUserIfMissing({
    name: 'Glam Owner',
    username: 'glamowner',
    password: process.env.SEED_GLAM_OWNER_PASSWORD,
    role: 'center_owner',
    centerId: center._id
  });

  await createUserIfMissing({
    name: 'Glam Manager',
    username: 'glammanager',
    password: process.env.SEED_GLAM_MANAGER_PASSWORD,
    role: 'manager',
    centerId: center._id
  });

  console.log('Seed complete');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
