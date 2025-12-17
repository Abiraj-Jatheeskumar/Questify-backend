# Network Metrics Explanation

## Overview
These metrics measure the student's internet connection quality during quiz attempts, helping differentiate between technical issues and actual disengagement.

---

## Metrics Collected

### 1. **RTT (Round Trip Time)** - `rtt_ms`
- **What it is:** Time (in milliseconds) for a request to travel from the student's browser to the server and back
- **What it means:**
  - **Low (< 100ms):** Excellent connection, fast response
  - **Medium (100-300ms):** Good connection, acceptable speed
  - **High (> 300ms):** Slow connection, may cause delays
- **Why it matters:** High RTT can make the quiz feel slow, potentially affecting student engagement

---

### 2. **Jitter** - `jitter_ms`
- **What it is:** Variation in RTT between requests (measures connection consistency)
- **What it means:**
  - **Low (< 50ms):** Stable connection, consistent performance
  - **Medium (50-100ms):** Moderate variation, some inconsistency
  - **High (> 100ms):** Unstable connection, unpredictable delays
- **Why it matters:** High jitter indicates unstable internet, which can frustrate students and affect performance

---

### 3. **Stability** - `stability_percent`
- **What it is:** Percentage of successful requests vs. total requests (0-100%)
- **What it means:**
  - **High (90-100%):** Reliable connection, few or no failed requests
  - **Medium (70-89%):** Some connection issues, occasional failures
  - **Low (< 70%):** Poor connection, frequent failures
- **Why it matters:** Low stability means the student may experience loading errors, which can disrupt their quiz experience

---

### 4. **Network Quality** - `network_quality`
- **What it is:** Overall classification based on RTT, Jitter, and Stability
- **Categories:**
  - **Excellent:** Fast, stable, reliable connection
  - **Good:** Acceptable connection with minor issues
  - **Fair:** Moderate connection problems
  - **Poor:** Significant connection issues
- **Why it matters:** Quick way to identify if technical issues may be affecting student engagement

---

## Use in Research

These metrics help answer:
- **Was the student's poor performance due to slow/unstable internet?**
- **Did network issues cause frustration or disengagement?**
- **Should we classify low engagement as technical vs. behavioral?**

**Example:** A student with slow responses AND poor network quality may be struggling due to technical issues, not disengagement. This helps train more accurate ML models.

---

## Data Format in Exports

- **RTT:** Number in milliseconds (e.g., `150`)
- **Jitter:** Number in milliseconds (e.g., `25`)
- **Stability:** Number as percentage (e.g., `95`)
- **Network Quality:** String (e.g., `"Good"`)
- **Missing Data:** Shows `null` or `N/A` for old responses collected before this feature was added

