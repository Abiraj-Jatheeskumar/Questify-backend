const mongoose = require('mongoose');
const User = require('./models/User');
const config = require('./config'); // uses your existing DB config

async function createAdmin() {
  try {
    console.log('⏳ Connecting to MongoDB...');

    // Connect using your existing config.mongoURI
    await mongoose.connect(config.mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists. No action taken.');
      return process.exit();
    }

    // Create admin (password will be hashed automatically)
    const adminUser = new User({
      name: 'System Admin',
      email: 'admin@example.com',
      password: 'admin123',   // IMPORTANT: plain text here
      role: 'admin',
      classIds: []
    });

    await adminUser.save();

    console.log('✅ Admin user created successfully!');
    console.log('🔐 Login credentials:');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin123');

    process.exit();
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin();
