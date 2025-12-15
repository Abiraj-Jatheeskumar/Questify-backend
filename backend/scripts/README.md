# Seed Scripts

This directory contains scripts to easily seed the database with initial data.

## Available Scripts

### 1. Seed Admin (`seedAdmin.js`)

Creates a default admin user for initial access.

**Usage:**
```bash
npm run seed:admin
```

**Default Credentials:**
- Email: `vithu0919@gmail.com`
- Password: `Admin@123`

**Note:** Edit the script to change the admin email and password before running.

---

### 2. Seed Students (`seedStudents.js`)

Bulk create multiple students with the same easy password for research purposes.

**Usage:**
```bash
npm run seed:students
```

**How to Use:**

1. Open `seedStudents.js` in a text editor
2. Edit the `students` array and add your students:

```javascript
const students = [
  { name: 'John Doe', email: 'john@example.com', admissionNo: 'A001', classIds: [] },
  { name: 'Jane Smith', email: 'jane@example.com', admissionNo: 'A002', classIds: [] },
  // Add more students here...
];
```

3. **Optional:** To assign students to a class:
   - First create the class in the admin panel
   - Copy the class ID
   - Add it to the `classIds` array for each student:
   ```javascript
   { name: 'John Doe', email: 'john@example.com', admissionNo: 'A001', classIds: ['CLASS_ID_HERE'] }
   ```

4. Run the script:
   ```bash
   npm run seed:students
   ```

**Default Password:** `Student@123` (same for all students)

**Features:**
- ✅ Skips students that already exist (by email or admission number)
- ✅ Validates class IDs before assigning
- ✅ Shows detailed summary of created/skipped/errors
- ✅ Handles duplicates gracefully

**Example Output:**
```
🌱 Starting student seeding...

✅ Created: John Doe (john@example.com)
✅ Created: Jane Smith (jane@example.com)
⏭️  Skipped: Bob Wilson (bob@example.com) - Email already exists

============================================================
📊 SEEDING SUMMARY
============================================================
✅ Created: 2 students
⏭️  Skipped: 1 students
❌ Errors: 0 students

📝 Default Password for all students: Student@123
```

---

### 3. Fix Question Answer (`fixQuestionAnswer.js`)

Fixes a question's correct answer and automatically re-evaluates all existing student responses.

**When to Use:**
- When you discover a question has an incorrect answer set
- When students have already submitted responses based on the wrong answer
- You need to update the correct answer and fix all historical responses

**Usage:**
```bash
node scripts/fixQuestionAnswer.js <questionId> <newCorrectAnswer>
```

**Example:**
```bash
node scripts/fixQuestionAnswer.js 507f1f77bcf86cd799439011 2
```

This will:
1. ✅ Update the question's `correctAnswer` field
2. ✅ Find all existing responses for this question
3. ✅ Re-evaluate each response's `isCorrect` field based on the new correct answer
4. ✅ Update all affected responses in the database
5. ✅ Show a detailed summary of changes

**Parameters:**
- `questionId`: The MongoDB ObjectId of the question to fix
- `newCorrectAnswer`: The new correct answer index (0-4)

**Example Output:**
```
🔌 Connecting to database...
✅ Connected to database

📋 Question Details:
   ID: 507f1f77bcf86cd799439011
   Question: What is the capital of France?
   Current Correct Answer: 0 (Paris)
   New Correct Answer: 2 (London)

🔍 Finding all responses for this question...
   Found 150 responses

🔄 Re-evaluating responses...

✅ Fix completed successfully!

📊 Summary:
   Total responses: 150
   Responses updated: 45
   - Changed from correct to incorrect: 30
   - Changed from incorrect to correct: 15
   Responses unchanged: 105
   Question correct answer updated: 2 (London)

💡 Note: Leaderboard scores will automatically reflect these changes on next calculation.
```

**Important Notes:**
- ⚠️ This script modifies existing data. Make sure you have a database backup before running.
- ✅ The script is safe to run multiple times (idempotent)
- ✅ Leaderboard scores will automatically update when recalculated
- ✅ All future responses will use the new correct answer automatically

**Alternative Method:**
You can also fix the answer through the admin panel by editing the question. The system will automatically re-evaluate all existing responses when you update the correct answer.

---

## Requirements

- MongoDB connection must be configured in `.env` file
- `MONGO_URI` environment variable must be set
- Database must be accessible

---

## Notes

- All passwords are hashed automatically by the User model
- Students can change their password after first login
- The seed scripts are safe to run multiple times (skips existing users)
- Make sure to change default passwords in production!




