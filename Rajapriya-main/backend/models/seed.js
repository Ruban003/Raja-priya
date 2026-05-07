require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Center = require('./models/Center');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected');

  // Create Glam center
  let center = await Center.findOne({ name: 'Glam' });
  if (!center) {
    center = await new Center({
      name: 'Glam',
      address: 'Chennai',
      gstNumber: 'GST000000',
      gstRate: 18
    }).save();
    console.log('✅ Glam center created:', center._id);
  } else {
    console.log('ℹ️  Glam center exists:', center._id);
  }

  // Create RV Owner
  const existing = await User.findOne({ username: 'rvowner' });
  if (!existing) {
    await new User({
      name: 'RV Owner',
      username: 'rvowner',
      password: 'RVOwner@123',
      role: 'rv_owner'
    }).save();
    console.log('✅ RV Owner created — username: rvowner / password: RVOwner@123');
  } else {
    console.log('ℹ️  RV Owner already exists');
  }

  // Create Glam center owner
  const glamOwner = await User.findOne({ username: 'glamowner' });
  if (!glamOwner) {
    await new User({
      name: 'Glam Owner',
      username: 'glamowner',
      password: 'GlamOwner@123',
      role: 'center_owner',
      centerId: center._id
    }).save();
    console.log('✅ Glam Owner created — username: glamowner / password: GlamOwner@123');
  } else {
    console.log('ℹ️  Glam Owner already exists');
  }

  // Create Glam manager
  const glamMgr = await User.findOne({ username: 'glammanager' });
  if (!glamMgr) {
    await new User({
      name: 'Glam Manager',
      username: 'glammanager',
      password: 'GlamMgr@123',
      role: 'manager',
      centerId: center._id
    }).save();
    console.log('✅ Glam Manager created — username: glammanager / password: GlamMgr@123');
  } else {
    console.log('ℹ️  Glam Manager already exists');
  }

  console.log('\n🎉 Seed complete!');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
