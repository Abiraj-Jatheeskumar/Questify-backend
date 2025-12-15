# Fixing Incorrect Question Answer - Quick Guide

## Problem
A question has an incorrect answer set, and students have already submitted responses based on that wrong answer. The system recorded their responses as correct/incorrect based on the wrong answer.

## Solution
We have two ways to fix this:

### Method 1: Using the Admin Panel (Recommended for Single Questions)

1. **Log in to the admin panel**
2. **Go to "Manage Questions"**
3. **Find the question with the wrong answer**
4. **Click "Edit"**
5. **Change the correct answer** to the right option (0-4)
6. **Save the question**

✅ **The system will automatically:**
- Update the question's correct answer
- Re-evaluate all existing responses
- Update the `isCorrect` field for all responses
- Leaderboard scores will reflect changes on next calculation

### Method 2: Using the Fix Script (Recommended for Bulk Fixes or When Admin Panel is Not Available)

**Step 1: Find the Question ID**
- You can find the question ID from:
  - The admin panel (inspect the question)
  - MongoDB database
  - Browser developer tools when viewing the question

**Step 2: Run the Fix Script**

```bash
cd Questify-backend/backend
node scripts/fixQuestionAnswer.js <questionId> <newCorrectAnswer>
```

**Example:**
```bash
node scripts/fixQuestionAnswer.js 507f1f77bcf86cd799439011 2
```

Where:
- `507f1f77bcf86cd799439011` is the question ID
- `2` is the new correct answer index (0-4)

**Step 3: Verify the Results**
The script will show you:
- How many responses were found
- How many were updated
- How many changed from correct to incorrect
- How many changed from incorrect to correct

## What Happens After Fixing

1. ✅ **Question Updated**: The correct answer is now set correctly
2. ✅ **All Responses Re-evaluated**: Every student's response is checked against the new correct answer
3. ✅ **isCorrect Field Updated**: All response records are updated with the correct status
4. ✅ **Leaderboard Updated**: When students view the leaderboard, scores will reflect the corrected answers
5. ✅ **Future Responses**: All new responses will be evaluated against the correct answer

## Important Notes

⚠️ **Before Running:**
- Make sure you have identified the correct answer
- Consider backing up your database (especially in production)
- Verify the question ID is correct

✅ **Safe to Run:**
- The script is safe to run multiple times
- It won't duplicate or corrupt data
- It only updates what needs to be changed

## Example Scenario

**Situation:**
- Question: "What is 2 + 2?"
- Options: [0: "3", 1: "4", 2: "5", 3: "6", 4: "7"]
- Wrong answer set: 0 (which is "3")
- Correct answer should be: 1 (which is "4")
- 100 students have already answered

**Fix:**
```bash
node scripts/fixQuestionAnswer.js <questionId> 1
```

**Result:**
- Question's correct answer updated to 1
- All 100 responses re-evaluated
- Students who answered "4" (index 1) now marked as correct
- Students who answered "3" (index 0) now marked as incorrect
- Leaderboard scores updated automatically

## Need Help?

If you're unsure about:
- Finding the question ID: Check the admin panel or database
- Which answer is correct: Verify with subject matter experts
- Running the script: See `scripts/README.md` for detailed documentation

## Prevention

To prevent this in the future:
1. ✅ Double-check correct answers before publishing questions
2. ✅ Have a second person review questions
3. ✅ Test questions with a small group first
4. ✅ Use the admin panel's edit feature to fix issues early

