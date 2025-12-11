# Engagement Algorithm Solutions for Educational Research

## Current Algorithm (Simple Weighted)
- **Correctness**: 60% weight
- **Speed**: 40% weight
- **Limitation**: Doesn't consider context, difficulty, or patterns

---

## Algorithm Options

### 1. **Percentile-Based Algorithm** (Recommended for Research)
**Best for**: Normalizing across different question types and difficulty levels

```javascript
const calculateEngagementPercentile = (isCorrect, responseTimeSec, allResponseTimes, allCorrectness) => {
  // Calculate percentiles for response time
  const sortedTimes = allResponseTimes.sort((a, b) => a - b);
  const timePercentile = sortedTimes.findIndex(t => t >= responseTimeSec) / sortedTimes.length;
  const speedScore = 1 - timePercentile; // Faster = higher score
  
  // Correctness score
  const correctnessScore = isCorrect ? 1.0 : 0.0;
  
  // Calculate average correctness rate
  const avgCorrectness = allCorrectness.filter(c => c).length / allCorrectness.length;
  const adjustedCorrectness = isCorrect ? 1.0 : (avgCorrectness * 0.5); // Penalty for wrong
  
  // Weighted score
  const engagementScore = (adjustedCorrectness * 0.65) + (speedScore * 0.35);
  
  if (engagementScore >= 0.75) return 'Active';
  if (engagementScore >= 0.45) return 'Moderate';
  return 'Passive';
};
```

**Pros**: Accounts for relative performance, adapts to question difficulty
**Cons**: Requires all responses to calculate percentiles

---

### 2. **Time-Efficiency Algorithm** (Best for Speed Analysis)
**Best for**: Research focusing on learning efficiency

```javascript
const calculateEngagementTimeEfficiency = (isCorrect, responseTimeSec) => {
  // Optimal time range: 5-15 seconds (thinking + answering)
  const optimalMin = 5;
  const optimalMax = 15;
  
  let timeScore = 0;
  if (responseTimeSec < optimalMin) {
    // Too fast - might be guessing (unless correct)
    timeScore = isCorrect ? 0.7 : 0.2;
  } else if (responseTimeSec >= optimalMin && responseTimeSec <= optimalMax) {
    // Optimal range - thoughtful response
    timeScore = 1.0;
  } else if (responseTimeSec <= 30) {
    // Still reasonable
    timeScore = 0.6;
  } else if (responseTimeSec <= 60) {
    // Slow but acceptable
    timeScore = 0.3;
  } else {
    // Very slow - likely disengaged
    timeScore = 0.1;
  }
  
  // Correctness weight
  const correctnessScore = isCorrect ? 1.0 : 0.0;
  
  // Combined: Time efficiency (50%) + Correctness (50%)
  const engagementScore = (timeScore * 0.5) + (correctnessScore * 0.5);
  
  if (engagementScore >= 0.75) return 'Active';
  if (engagementScore >= 0.45) return 'Moderate';
  return 'Passive';
};
```

**Pros**: Identifies optimal engagement window, penalizes guessing
**Cons**: May penalize careful thinkers

---

### 3. **Adaptive Threshold Algorithm** (Best for Mixed Difficulty)
**Best for**: Quizzes with varying question difficulty

```javascript
const calculateEngagementAdaptive = (isCorrect, responseTimeSec, questionDifficulty = 'medium') => {
  // Adjust thresholds based on question difficulty
  const difficultyMultipliers = {
    'easy': { fast: 8, medium: 20, slow: 40 },
    'medium': { fast: 12, medium: 30, slow: 60 },
    'hard': { fast: 15, medium: 45, slow: 90 }
  };
  
  const thresholds = difficultyMultipliers[questionDifficulty] || difficultyMultipliers['medium'];
  
  let speedScore = 0;
  if (responseTimeSec < thresholds.fast) {
    speedScore = 1.0;
  } else if (responseTimeSec < thresholds.medium) {
    speedScore = 0.7;
  } else if (responseTimeSec < thresholds.slow) {
    speedScore = 0.4;
  } else {
    speedScore = 0.1;
  }
  
  // Correctness with difficulty adjustment
  const correctnessScore = isCorrect ? 1.0 : 0.0;
  const difficultyWeight = questionDifficulty === 'hard' ? 0.7 : 0.6;
  
  const engagementScore = (correctnessScore * difficultyWeight) + (speedScore * (1 - difficultyWeight));
  
  if (engagementScore >= 0.7) return 'Active';
  if (engagementScore >= 0.4) return 'Moderate';
  return 'Passive';
};
```

**Pros**: Adapts to question complexity, fairer assessment
**Cons**: Requires difficulty metadata

---

### 4. **Confidence-Based Algorithm** (Best for Learning Analytics)
**Best for**: Understanding student confidence and engagement correlation

```javascript
const calculateEngagementConfidence = (isCorrect, responseTimeSec) => {
  // Fast + Correct = High confidence (Active)
  // Fast + Wrong = Guessing (Passive)
  // Slow + Correct = Careful thinking (Moderate/Active)
  // Slow + Wrong = Struggling (Passive)
  
  const isFast = responseTimeSec < 15;
  const isSlow = responseTimeSec > 30;
  
  if (isCorrect && isFast) {
    // High confidence, quick answer
    return 'Active';
  } else if (isCorrect && !isSlow) {
    // Correct with reasonable time
    return 'Active';
  } else if (isCorrect && isSlow) {
    // Correct but took time (thoughtful)
    return 'Moderate';
  } else if (!isCorrect && isFast) {
    // Wrong quickly (guessing)
    return 'Passive';
  } else if (!isCorrect && !isSlow) {
    // Wrong with reasonable time
    return 'Moderate';
  } else {
    // Wrong and slow (struggling)
    return 'Passive';
  }
};
```

**Pros**: Simple, interpretable, identifies guessing patterns
**Cons**: Less granular scoring

---

### 5. **Z-Score Normalization Algorithm** (Best for Statistical Research)
**Best for**: Advanced statistical analysis and research papers

```javascript
const calculateEngagementZScore = (isCorrect, responseTimeSec, meanTime, stdTime, meanCorrectness) => {
  // Z-score for response time (how many standard deviations from mean)
  const timeZScore = (responseTimeSec - meanTime) / stdTime;
  // Negative z-score = faster than average (good)
  const speedScore = Math.max(0, Math.min(1, 0.5 - (timeZScore * 0.2))); // Normalize to 0-1
  
  // Correctness score
  const correctnessScore = isCorrect ? 1.0 : 0.0;
  
  // Adjust based on overall difficulty
  const difficultyAdjustment = meanCorrectness < 0.5 ? 1.1 : 1.0; // Harder questions get slight boost
  
  const engagementScore = ((correctnessScore * 0.6) + (speedScore * 0.4)) * difficultyAdjustment;
  
  if (engagementScore >= 0.75) return 'Active';
  if (engagementScore >= 0.45) return 'Moderate';
  return 'Passive';
};
```

**Pros**: Statistically rigorous, accounts for distribution
**Cons**: Requires mean/std calculations, more complex

---

### 6. **Multi-Factor Composite Algorithm** (Most Comprehensive)
**Best for**: Comprehensive engagement analysis

```javascript
const calculateEngagementMultiFactor = (isCorrect, responseTimeSec, studentHistory = null) => {
  // Factor 1: Correctness (40%)
  const correctnessScore = isCorrect ? 1.0 : 0.0;
  
  // Factor 2: Speed efficiency (30%)
  let speedScore = 0;
  if (responseTimeSec < 10) speedScore = 1.0;
  else if (responseTimeSec < 20) speedScore = 0.8;
  else if (responseTimeSec < 30) speedScore = 0.6;
  else if (responseTimeSec < 60) speedScore = 0.3;
  else speedScore = 0.1;
  
  // Factor 3: Consistency (20%) - if student history available
  let consistencyScore = 0.5; // Default neutral
  if (studentHistory && studentHistory.length > 0) {
    const recentAccuracy = studentHistory.filter(r => r.isCorrect).length / studentHistory.length;
    consistencyScore = recentAccuracy;
  }
  
  // Factor 4: Improvement trend (10%) - if history available
  let improvementScore = 0.5;
  if (studentHistory && studentHistory.length >= 3) {
    const recent = studentHistory.slice(-3);
    const older = studentHistory.slice(-6, -3);
    const recentAcc = recent.filter(r => r.isCorrect).length / recent.length;
    const olderAcc = older.filter(r => r.isCorrect).length / older.length;
    improvementScore = recentAcc > olderAcc ? 0.8 : (recentAcc === olderAcc ? 0.5 : 0.2);
  }
  
  // Weighted composite score
  const engagementScore = 
    (correctnessScore * 0.4) +
    (speedScore * 0.3) +
    (consistencyScore * 0.2) +
    (improvementScore * 0.1);
  
  if (engagementScore >= 0.7) return 'Active';
  if (engagementScore >= 0.4) return 'Moderate';
  return 'Passive';
};
```

**Pros**: Most comprehensive, considers patterns
**Cons**: Requires student history data

---

## Recommended Implementation

### For Your Research (2000 Students):

**Option A: Enhanced Current Algorithm** (Easiest to implement)
- Keep current structure
- Add percentile-based speed scoring
- Adjust thresholds based on data distribution

**Option B: Confidence-Based** (Best balance)
- Simple to understand
- Identifies guessing vs. learning
- Good for research interpretation

**Option C: Multi-Factor** (Most accurate)
- Best for comprehensive analysis
- Requires tracking student history
- Most research value

---

## Implementation Recommendation

I recommend **Option B (Confidence-Based)** because:
1. ✅ Easy to explain in research papers
2. ✅ Identifies clear engagement patterns
3. ✅ No complex calculations needed
4. ✅ Works well with your current data structure
5. ✅ Produces meaningful categories for 2000 students

Would you like me to implement one of these algorithms?

