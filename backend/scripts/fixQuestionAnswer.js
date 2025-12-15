require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const Response = require('../models/Response');
const { MONGO_URI } = require('../config');

/**
 * Script to fix a question's correct answer and re-evaluate all existing responses
 * 
 * Usage:
 * node scripts/fixQuestionAnswer.js <questionId> <newCorrectAnswer>
 * 
 * Example:
 * node scripts/fixQuestionAnswer.js 507f1f77bcf86cd799439011 2
 * 
 * This will:
 * 1. Update the question's correctAnswer field
 * 2. Find all responses for this question
 * 3. Re-evaluate each response's isCorrect field based on the new correct answer
 * 4. Update all affected responses
 * 5. Show a summary of changes
 */

async function fixQuestionAnswer(questionId, newCorrectAnswer) {
  try {
    // Validate inputs
    if (!questionId) {
      console.error('❌ Error: Question ID is required');
      console.log('Usage: node scripts/fixQuestionAnswer.js <questionId> <newCorrectAnswer>');
      process.exit(1);
    }

    if (newCorrectAnswer === undefined || newCorrectAnswer === null) {
      console.error('❌ Error: New correct answer is required (0-4)');
      console.log('Usage: node scripts/fixQuestionAnswer.js <questionId> <newCorrectAnswer>');
      process.exit(1);
    }

    const correctAnswerNum = parseInt(newCorrectAnswer);
    if (isNaN(correctAnswerNum) || correctAnswerNum < 0 || correctAnswerNum > 4) {
      console.error('❌ Error: Correct answer must be a number between 0 and 4');
      process.exit(1);
    }

    // Connect to database
    console.log('🔌 Connecting to database...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to database');

    // Find the question
    const question = await Question.findById(questionId);
    if (!question) {
      console.error(`❌ Error: Question with ID ${questionId} not found`);
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('\n📋 Question Details:');
    console.log(`   ID: ${question._id}`);
    console.log(`   Question: ${question.question.substring(0, 100)}${question.question.length > 100 ? '...' : ''}`);
    console.log(`   Current Correct Answer: ${question.correctAnswer} (${question.options[question.correctAnswer]})`);
    console.log(`   New Correct Answer: ${correctAnswerNum} (${question.options[correctAnswerNum]})`);

    if (question.correctAnswer === correctAnswerNum) {
      console.log('\n⚠️  Warning: The correct answer is already set to this value. No changes needed.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Find all responses for this question
    console.log('\n🔍 Finding all responses for this question...');
    const responses = await Response.find({ questionId: question._id });
    console.log(`   Found ${responses.length} responses`);

    if (responses.length === 0) {
      console.log('   No responses found. Only updating the question.');
      question.correctAnswer = correctAnswerNum;
      await question.save();
      console.log('✅ Question updated successfully');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Re-evaluate responses using bulk updates for better performance
    console.log('\n🔄 Re-evaluating responses...');
    
    // Update responses that should be marked as correct
    const correctUpdateResult = await Response.updateMany(
      { 
        questionId: question._id,
        selectedAnswer: correctAnswerNum,
        isCorrect: false // Only update those currently marked incorrect
      },
      { $set: { isCorrect: true } }
    );
    const incorrectToCorrect = correctUpdateResult.modifiedCount || 0;

    // Update responses that should be marked as incorrect
    const incorrectUpdateResult = await Response.updateMany(
      { 
        questionId: question._id,
        selectedAnswer: { $ne: correctAnswerNum },
        isCorrect: true // Only update those currently marked correct
      },
      { $set: { isCorrect: false } }
    );
    const correctToIncorrect = incorrectUpdateResult.modifiedCount || 0;

    const updatedCount = incorrectToCorrect + correctToIncorrect;
    const unchanged = responses.length - updatedCount;

    // Update the question
    question.correctAnswer = correctAnswerNum;
    await question.save();

    // Summary
    console.log('\n✅ Fix completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Total responses: ${responses.length}`);
    console.log(`   Responses updated: ${updatedCount}`);
    console.log(`   - Changed from correct to incorrect: ${correctToIncorrect}`);
    console.log(`   - Changed from incorrect to correct: ${incorrectToCorrect}`);
    console.log(`   Responses unchanged: ${unchanged}`);
    console.log(`   Question correct answer updated: ${question.correctAnswer} (${question.options[question.correctAnswer]})`);

    console.log('\n💡 Note: Leaderboard scores will automatically reflect these changes on next calculation.');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Get command line arguments
const questionId = process.argv[2];
const newCorrectAnswer = process.argv[3];

fixQuestionAnswer(questionId, newCorrectAnswer);

