const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://127.0.0.1:27017/glampro_db')
  .then(async () => {
    console.log('✅ Connected to DB. Creating users...');

    // 1. Delete old users to avoid duplicates
    await User.deleteMany({});

    // 2. Create Admin
    await User.create({
      username: 'admin',
      password: 'Glam@123',  // <--- This is the REAL password
      role: 'admin'
    });

    // 3. Create Manager
    await User.create({
      username: 'Glam',      // <--- This is the REAL username
      password: 'Glam@123',
      role: 'manager'
    });

    console.log('🎉 Users Created Successfully!');
    console.log('-----------------------------------');
    console.log('👉 Admin Login:   admin / Glam@123');  // Fixed text to match code
    console.log('👉 Manager Login: Glam  / Glam@123');  // Fixed text to match code
    console.log('-----------------------------------');
    process.exit();
  })
  .catch(err => console.log(err));