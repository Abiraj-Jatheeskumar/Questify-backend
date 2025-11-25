require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { MONGO_URI } = require('../config');

const email = 'vithu0919@gmail.com';
const plainPassword = 'Admin@123'; // change this after first login if needed

async function seedAdmin() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const existing = await User.findOne({ email, role: 'admin' });
    if (existing) {
      console.log('Admin already exists:', email);
      return;
    }

    const admin = await User.create({
      name: 'vithusan',
      email,
      password: plainPassword, // model hook will hash before save
      role: 'admin',
    });

    console.log('Admin created successfully:');
    console.log('Email:', admin.email);
    console.log('Temporary password:', plainPassword);
  } catch (err) {
    console.error('Failed to seed admin:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedAdmin();
