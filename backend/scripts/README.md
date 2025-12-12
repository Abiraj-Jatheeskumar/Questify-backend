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

