require('dotenv').config();

module.exports = {
  MONGO_URI: process.env.MONGO_URI || 'mongodb+srv://vithu0919:1234@questiondb.hkt4lsa.mongodb.net/?appName=questiondb',
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  EMAIL_USER: process.env.EMAIL_USER || 'loushan2025@gmail.com',
  EMAIL_PASS: process.env.EMAIL_PASS || 'hcjz odmc zgjo wsge',
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development'
};

