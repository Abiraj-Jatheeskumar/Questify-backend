const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');

// Load models (needed for index migration)
require('./models/Response');

const app = express();

// Middleware - Simple CORS allowing all origins
app.use(cors({
  origin: true, // Allow all origins
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/students', require('./routes/students'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/responses', require('./routes/responses'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/messages', require('./routes/messages'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Connect to MongoDB
mongoose.connect(config.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async () => {
    console.log('MongoDB Atlas Connected');
    
    // Auto-migrate Response model index (allow same question in different quizzes)
    try {
      const Response = mongoose.model('Response');
      const collection = Response.collection;
      
      // Get all indexes
      const indexes = await collection.indexes();
      const oldIndexName = 'studentId_1_questionId_1';
      
      // Check if old unique index exists
      const oldIndex = indexes.find(idx => 
        idx.name === oldIndexName || 
        (idx.key && idx.key.studentId === 1 && idx.key.questionId === 1 && !idx.key.assignedQuestionId && idx.unique)
      );
      
      if (oldIndex) {
        console.log('🔄 Migrating Response model index...');
        try {
          await collection.dropIndex(oldIndexName);
          console.log('✅ Dropped old unique index');
        } catch (dropErr) {
          // Try to drop by key if name doesn't work
          try {
            await collection.dropIndex({ studentId: 1, questionId: 1 });
            console.log('✅ Dropped old unique index (by key)');
          } catch (err) {
            console.log('⚠️  Could not drop old index (may not exist):', err.message);
          }
        }
      }
      
      // Ensure new index exists (Mongoose will create it automatically, but we verify)
      const newIndexExists = indexes.some(idx => 
        idx.key && idx.key.studentId === 1 && idx.key.questionId === 1 && idx.key.assignedQuestionId === 1 && idx.unique
      );
      
      if (!newIndexExists) {
        console.log('📝 Creating new unique index...');
        // The index will be created automatically by Mongoose when the model is loaded
        // But we can also create it explicitly
        await collection.createIndex(
          { studentId: 1, questionId: 1, assignedQuestionId: 1 },
          { unique: true, name: 'studentId_1_questionId_1_assignedQuestionId_1' }
        );
        console.log('✅ New unique index created');
      } else {
        console.log('✅ Response model index is up to date');
      }
    } catch (migrationErr) {
      console.log('⚠️  Index migration warning (non-critical):', migrationErr.message);
      // Don't exit - server can still run
    }
    
    app.listen(config.PORT, () => {
      console.log(`Server running on port ${config.PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = app;

