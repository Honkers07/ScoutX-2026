# FuelScored Calculator - Implementation Plan

## Overview

This document outlines the implementation plan for a utility function that calculates `fuelScored` (auto and tele) using Firebase Firestore collections, based on the FRC 2026 Reefscape game rules.

## Moving Average Ball/S Estimation

### Problem
In FRC 2026 Reefscape, synchronized robot rotations mean that exclusive shooting time is often very low or zero. This results in many matches where calculated confidence is below the threshold. Rather than discarding this data, we can use historical performance to estimate ball/s.

### Solution: Confidence-Weighted Exponential Moving Average

When a match has calculated confidence below `CONFIDENCE.LOW_CONFIDENCE_THRESHOLD` (0.3), blend the current match's ball/s with the robot's historical performance using a weighted moving average.

### Formula

```javascript
/**
 * Estimates ball/s using matchData collection when confidence is low
 * @param {number} currentBps - Ball per second from current match
 * @param {number} currentConfidence - Confidence from current match (0-1)
 * @param {Array} matchDataTeams - Teams array from matchData collection: [{teamNumber, ballsPerSecond, confidence, matchesAgo}, ...]
 * @param {number} teamNumber - Team number to look up
 * @param {number} decayRate - How much to weight recent matches (0-1)
 * @returns {number} - Estimated ball/s
 */
function estimateBallPerSecond(currentBps, currentConfidence, matchDataTeams, teamNumber, decayRate = 0.8) {
  // If high confidence, trust current calculation
  if (currentConfidence >= CONFIDENCE.LOW_CONFIDENCE_THRESHOLD) {
    return currentBps;
  }
  
  // Get historical data for this team from matchData
  const historicalData = matchDataTeams.filter(t => t.teamNumber === teamNumber);
  
  // If no historical data, use current calculation
  if (historicalData.length === 0) {
    return currentBps;
  }
  
  // Calculate weighted historical average
  // Weight = confidence × recency_factor
  // recency_factor decays exponentially for older matches
  
  let weightedSum = currentBps * currentConfidence;
  let weightSum = currentConfidence;
  
  for (const match of historicalData) {
    // More recent matches get higher weight
    // matchesAgo is based on position in sorted historical list (most recent = 1)
    const recencyFactor = Math.pow(decayRate, match.matchesAgo);
    const weight = match.confidence * recencyFactor;
    
    weightedSum += match.ballsPerSecond * weight;
    weightSum += weight;
  }
  
  return weightSum > 0 ? weightedSum / weightSum : currentBps;
}
```

### Key Design Decisions

1. **Threshold**: Only apply when confidence < 0.3 (tunable)
2. **Recency weighting**: More recent matches count more (robots improve)
3. **Confidence weighting**: High-confidence historical matches contribute more

### When to Use

- This enhancement is used in Step 9 of the Video Method
- Only applies when: confidence < 0.3 AND matchData exists for this team
- Query matchData collection to get historical ball/s and confidence for the team
- If no matchData exists for team: use current calculation only
- The matchData collection structure: `{ matchNumber, teams: [{ teamNumber, ballsPerSecond, confidence, matchesAgo }] }`

### Formula

```
estimatedBps = (bps_c · conf_c + Σ(bps_h · conf_h · r^n)) / (conf_c + Σ(conf_h · r^n))
```

Where:
- `bps_c` = ball/s from current match
- `conf_c` = confidence from current match
- `bps_h` = ball/s from historical match
- `conf_h` = confidence from historical match
- `n` = matchesAgo (position in sorted list: 1, 2, 3, etc.)
- `r` = decayRate (weight factor for recency, e.g., 0.8)

### Constants

```javascript
const HISTORICAL_AVERAGING = {
  LOW_CONFIDENCE_THRESHOLD: 0.3,  // Only blend below this
  DECAY_RATE: 0.8,                 // Recent matches weight more
  MIN_HISTORICAL_MATCHES: 1        // Minimum matches needed for averaging
};
```

### Sample Calculation

Given:
- Current match: team 1768, match 30, bps = 2.0, confidence = 0.15 (below threshold)
- Historical data (sorted by most recent first, matchesAgo calculated by position):
  - Match 27: bps = 1.9, confidence = 0.5, matchesAgo = 1
  - Match 21: bps = 2.2, confidence = 0.6, matchesAgo = 2
  - Match 17: bps = 1.8, confidence = 0.7, matchesAgo = 3
  - Match 9: bps = 1.5, confidence = 0.8, matchesAgo = 4

Calculation:
- Current weight: 0.15
- decayRate = 0.8

Historical weights (confidence × decayRate^matchesAgo):
- Match 27: 0.5 × 0.8^1 = 0.5 × 0.8 = 0.40
- Match 21: 0.6 × 0.8^2 = 0.6 × 0.64 = 0.384
- Match 17: 0.7 × 0.8^3 = 0.7 × 0.512 = 0.3584
- Match 9: 0.8 × 0.8^4 = 0.8 × 0.4096 = 0.3277

Weighted sum:
- Current: 2.0 × 0.15 = 0.30
- Match 27: 1.9 × 0.40 = 0.76
- Match 21: 2.2 × 0.384 = 0.8448
- Match 17: 1.8 × 0.3584 = 0.6451
- Match 9: 1.5 × 0.3277 = 0.4916
- Total: 3.0415

Total weight: 1.6201

Estimated bps: 3.0415 / 1.6201 = **1.88 balls/second**

vs. original: 2.0 balls/second (unadjusted)

## FRC 2026 Match Timing

| Period | Time Range | Duration |
|--------|------------|----------|
| AUTO | 0:00 - 0:20 | 20 seconds |
| TRANSITION SHIFT | 0:20 - 0:23 | 3 seconds |
| TELEOP - TRANSITION | 0:23 - 0:33 | 10 seconds |
| TELEOP - SHIFT 1 | 0:33 - 0:58 | 25 seconds |
| TELEOP - SHIFT 2 | 0:58 - 1:23 | 25 seconds |
| TELEOP - SHIFT 3 | 1:23 - 1:48 | 25 seconds |
| TELEOP - SHIFT 4 | 1:48 - 2:13 | 25 seconds |
| END GAME | 2:13 - 2:43 | 30 seconds |

**Note**: Timer counts UP from 0:00 to approximately 2:43 (total 163 seconds)

## HUB Active Periods

- **Both HUBs active**: AUTO, TRANSITION SHIFT, END GAME
- **Only ONE HUB active**: During ALLIANCE SHIFTS (SHIFT 1-4)
- **HUB status determination**: Based on AUTO results
  - Alliance with more AUTO fuel → their HUB becomes INACTIVE for SHIFT 1
  - Opponent's HUB becomes ACTIVE for SHIFT 1
  - HUBs alternate each shift

## Data Filtering Rules

### 1. Clean and Merge Shooting Times

**Problem**: Scouters may accidentally count a single burst as multiple small bursts, which artificially inflates the robot's ball/s metric. Also, very short shooting times (< 1.0s) are likely accidental clicks.

**Solution**: First filter out short times, then merge shooting times that are within 1 second of each other.

```javascript
/**
 * Cleans and merges shooting times: filters short times then merges close times
 * @param {Array<{startShootTime: number, endShootTime: number, duration: number}>} shootingTimes
 * @param {number} minShootingTime - minimum duration to keep (default: SCOUTER_DELAY.END - SCOUTER_DELAY.START)
 * @param {number} mergeThreshold - seconds between times to merge (default: 1)
 * @returns {Array<{startShootTime: number, endShootTime: number, duration: number}>}
 */
function cleanAndMergeShootingTimes(shootingTimes, minShootingTime = SCOUTER_DELAY.END - SCOUTER_DELAY.START, mergeThreshold = DATA_FILTERING.SHOOTING_TIME_MERGE_THRESHOLD) {
  if (!shootingTimes || shootingTimes.length === 0) return [];
  
  // Step 1: Filter out short shooting times (accidental clicks)
  const filtered = shootingTimes.filter(time => time.duration >= minShootingTime);
  
  if (filtered.length === 0) return [];
  
  // Step 2: Sort by start time
  const sorted = [...filtered].sort((a, b) => a.startShootTime - b.startShootTime);
  
  const merged = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    
    // If current starts within mergeThreshold seconds of last ending, merge them
    if (current.startShootTime - last.endShootTime <= mergeThreshold) {
      // Extend the last entry to include current
      last.endShootTime = current.endShootTime;
      last.duration = last.endShootTime - last.startShootTime;
    } else {
      merged.push(current);
    }
  }
  
  return merged;
}
```

### 2. Filter Score Increments < 5

**Problem**: Score increments of 5 or greater are likely from other point sources (fouls, other game pieces), not fuel.

**Solution**: Only count score increments that are LESS than 5.

```javascript
/**
 * Filters score timeline to only include fuel-related increments
 * @param {Array<{time: number, score: number}>} scoreTimeline
 * @returns {Array<{time: number, score: number, increment: number}>}
 */
function filterFuelIncrements(scoreTimeline) {
  if (!scoreTimeline || scoreTimeline.length === 0) return [];
  
  const filtered = [];
  
  for (let i = 1; i < scoreTimeline.length; i++) {
    const current = scoreTimeline[i];
    const previous = scoreTimeline[i - 1];
    
    // Skip if missing required fields
    if (current == null || previous == null || current.score == null || previous.score == null) {
      continue;
    }
    
    const increment = current.score - previous.score;
    
    // Only include positive increments < 5 (i.e., 1, 2, 3, 4)
    if (increment > 0 && increment < 5) {
      filtered.push({
        time: current.time,
        score: current.score,
        increment: increment
      });
    }
  }
  
  return filtered;
}
```

## Delay Model

### Overview

We use a TWO-STEP delay adjustment process:

1. **Scouter Delay Adjustment** - Corrects for scouter reaction time to get "real" shooting times
2. **Scoreboard Offset** - Accounts for scoreboard lag to match score timeline

### Step 1: Scouter Delay Adjustment

Scouter reaction time differs at start vs end of shooting:
- **Start delay**: ~0.75s (easy to see robot begin shooting)
- **End delay**: ~2s (harder to determine when robot stops - needs time with no scoring)

**Note:** START and END delays are different because they depend on where the robot is shooting from. The start delay is lower since it's easier to see when a robot starts shooting.

We SUBTRACT these delays to get "real" shooting times:

```javascript
const SCOUTER_DELAY = {
  START: 1.0,  // seconds - scouter reaction to robot starting
  END: 2.0     // seconds - scouter reaction to robot ending
};

/**
 * Adjusts original shooting times for scouter reaction delay
 * @param {Array} shootingTimes - Merged shooting times
 * @returns {Array} - Adjusted "real" shooting times
 */
function adjustForScouterDelay(shootingTimes) {
  return shootingTimes.map(time => {
    const adjustedStart = Math.max(0, time.startShootTime - SCOUTER_DELAY.START);
    const adjustedEnd = Math.max(0, time.endShootTime - SCOUTER_DELAY.END);
    return {
      start: adjustedStart,
      end: adjustedEnd,
      duration: adjustedEnd - adjustedStart
    };
  });
}
```

**Example:**
- Raw (scouter reports): 30-32s (duration = 2s)
- After adjustment: start = 30-1.0 = 29s, end = 32-2.0 = 30s
- Result: 29-30s (duration = 1s)
- **Note:** Times are clipped to 0 minimum, so early times like 0.5s become 0s

### Step 2: Crop to Active HUB Periods

Crop each robot's shooting times to only include periods when their alliance's HUB is active.

```javascript
/**
 * Crops shooting times to active HUB periods
 * @param {Array} shootingTimes - Array of {start, end, duration} shooting times
 * @param {Array} hubActivePeriods - Array of {start, end} active periods
 * @returns {Array} - Cropped shooting times
 */
function cropToActiveHub(shootingTimes, hubActivePeriods) {
  if (!shootingTimes || shootingTimes.length === 0) return [];
  if (!hubActivePeriods || hubActivePeriods.length === 0) return [];
  
  const cropped = [];
  
  for (const time of shootingTimes) {
    for (const period of hubActivePeriods) {
      // Check if there's any overlap
      if (time.end <= period.start || time.start >= period.end) continue;
      
      // Calculate overlap
      const overlapStart = Math.max(time.start, period.start);
      const overlapEnd = Math.min(time.end, period.end);
      
      if (overlapEnd > overlapStart) {
        cropped.push({
          start: overlapStart,
          end: overlapEnd,
          duration: overlapEnd - overlapStart
        });
      }
    }
  }
  
  return cropped;
}
```

### Step 3: Scoreboard Offset

The scoreboard has its own delay from when scoring happens to when it appears:
- **Scoreboard start delay**: 1.5s (delay for first ball scored)
- **Scoreboard end delay**: 2.2s (delay for last ball scored)
- **Rate**: 0.05 (additional delay per second of shooting)

**Note:** START and END delays are different because they depend on where the robot is shooting from on the field. The delay changes based on shooting position.

We ADD this offset to match score timeline:

```javascript
const SCOREBOARD = {
  START: 1.5,   // seconds - delay for first ball scored (changes based on shooting position)
  END: 2.2,     // seconds - delay for last ball scored
  RATE: 0.05    // additional delay per second of shooting
};

/**
 * Creates offsetted shooting times for scoreboard matching
 * @param {Array} adjustedTimes - Times after scouter adjustment
 * @returns {Array} - Offset times for score matching
 */
function createScoreboardOffset(adjustedTimes) {
  return adjustedTimes.map(time => {
    const duration = time.duration;
    return {
      start: time.start + SCOREBOARD.START,
      end: time.end + SCOREBOARD.END + (duration * SCOREBOARD.RATE),
      originalStart: time.start,
      originalEnd: time.end,
      duration: duration
    };
  });
}
```

**Examples:**
- Burst with duration 3s starting at 10s:
  - Start offset: 10 + 1.5 = 11.5s
  - End offset: (10+3) + 2.2 + 0.05×3 = 13 + 2.2 + 0.15 = 15.35s
  - Adjusted time range: [11.5, 15.35]s

### Important: Two Types of Offsets

There are two different types of delay adjustments:

1. **Scouter Delay Adjustment** (applied to each robot's individual shooting times)
   - Applied to each robot's shooting times separately
   - Used to get "real" shooting times
   - Later used for confidence calculation

2. **Scoreboard Offset** (applied to combined exclusive/multiple segments)
   - First, combine all robots' scouter-adjusted shooting times into segments
   - Then apply scoreboard offset to the combined segments
   - Used for score attribution

### New: Finding Exclusive and Multiple Shooting Times

Before applying scoreboard offset, we need to combine all robots' scouter-adjusted shooting times into a single array of exclusive and multiple segments. This is because scoreboard offset should be applied to the combined timeline, not each robot individually.

```javascript
/**
 * Combines multiple robots' shooting times into exclusive and multiple segments
 * @param {Array} robotTimes - Array of arrays, each containing scouter-adjusted shooting times for one robot
 * @returns {Array} - Combined array of {start, end, type, robots} segments
 *                   type = 'exclusive' | 'multiple'
 *                   robots = array of team numbers that were shooting
 */
function findExclusiveAndMultipleShootingTimes(robotTimes) {
  if (!robotTimes || robotTimes.length === 0) return [];
  
  // Flatten all shooting times with robot identifier
  const allTimes = [];
  robotTimes.forEach((times, robotIndex) => {
    times.forEach(time => {
      allTimes.push({
        start: time.start,
        end: time.end,
        duration: time.duration,
        robotIndex: robotIndex
      });
    });
  });
  
  // Sort by start time
  allTimes.sort((a, b) => a.start - b.start);
  
  if (allTimes.length === 0) return [];
  
  // Build segments
  const segments = [];
  let currentSegment = {
    start: allTimes[0].start,
    end: allTimes[0].end,
    robots: [allTimes[0].robotIndex]
  };
  
  for (let i = 1; i < allTimes.length; i++) {
    const time = allTimes[i];
    
    if (time.start <= currentSegment.end) {
      // Overlaps with current segment
      currentSegment.end = Math.max(currentSegment.end, time.end);
      if (!currentSegment.robots.includes(time.robotIndex)) {
        currentSegment.robots.push(time.robotIndex);
      }
    } else {
      // No overlap - finalize current and start new
      segments.push(currentSegment);
      currentSegment = {
        start: time.start,
        end: time.end,
        robots: [time.robotIndex]
      };
    }
  }
  
  // Don't forget last segment
  segments.push(currentSegment);
  
  // Mark as exclusive or multiple
  return segments.map(seg => ({
    start: seg.start,
    end: seg.end,
    duration: seg.end - seg.start,
    type: seg.robots.length === 1 ? 'exclusive' : 'multiple',
    robots: seg.robots
  }));
}
```

**Example:**
Given 3 robots with scouter-adjusted times:
- Robot 1: 20-25s
- Robot 2: 22-28s
- Robot 3: 30-35s

Output segments (each unique time range is a separate segment, multiple segments track which robots are shooting):
- [20, 22], type=exclusive, robots=[1] (Robot 1 only)
- [22, 25], type=multiple, robots=[1,2] (Robot 1 & 2 overlap - this specific combination)
- [25, 28], type=exclusive, robots=[2] (Robot 2 only)
- [30, 35], type=exclusive, robots=[3] (Robot 3 only)

**Note:** Multiple segments are specific to which robots are shooting. If Robot 1 & 2 shoot together, and later Robot 2 & 3 shoot together, these are two different "multiple" segments with different robot combinations.

**Key Insight:** The scouter delay is applied to EACH ROBOT'S shooting times individually. But the scoreboard offset is applied to the COMBINED exclusive/multiple segments (not to each robot individually).

### Why This Matters
- Scouter delay adjusts for when scouters observed shooting start/end
- Scoreboard offset accounts for scoreboard lag
- These are fundamentally different adjustments applied at different stages
- The combined segments ensure we don't double-count score increments

### Algorithm Flow

```javascript
// Algorithm flow:
// 1. cleanAndMergeShootingTimes() → cleaned times per robot
// 2. adjustForScouterDelay() → scouter-adjusted times per robot (APPLIED INDIVIDUALLY)
// 3. cropToActiveHub() → for confidence/exclusivity per robot
// 4. findExclusiveAndMultipleShootingTimes() → combined segments
// 5. Calculate confidence from exclusive segments in combined array
// 6. createScoreboardOffset() → scoreboard-offset segments (APPLIED TO COMBINED)
// 7. resolveOverlaps() → split evenly for score matching
```

## Delay Offset and Overlap Resolution

### The Problem

When using delay to account for scoreboard lag, adjacent shooting times can cause score increments to be double-counted between robots. See "Example with overlap" below.

### The Solution: Split Overlap Evenly

Instead of giving the full overlap time to the first robot (unfair advantage), we split the overlapping time evenly between both robots.

```javascript
/**
 * Resolves overlaps between scoreboard-offset shooting segments
 * Splits the overlap evenly between adjacent segments
 * @param {Array} offsetSegments - Array of scoreboard-offset shooting segments
 * @returns {Array} - Offset segments with resolved overlaps
 */
function resolveOverlaps(offsetSegments) {
  if (!offsetSegments || offsetSegments.length === 0) return [];
  
  // Sort by original start time
  const sorted = [...offsetSegments].sort((a, b) => a.originalStart - b.originalStart);
  
  const resolved = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = resolved[resolved.length - 1];
    
    // Check if current's offset window overlaps with last's
    if (current.start < last.end) {
      // Calculate overlap amount
      const overlap = last.end - current.start;
      const halfOverlap = overlap / 2;
      
      // Adjust both: earlier segment gets less end time, later segment gets more start time
      last.end = last.end - halfOverlap;
      current.start = current.start + halfOverlap;
    }
    
    resolved.push(current);
  }
  
  return resolved;
}
```

**Example with overlap:**
Given two robots:
- Robot 1: shoots 20-23s
- Robot 2: shoots 22-24s

First, identify the exclusive and multiple segments:
- Segment 1 (Robot 1 exclusive): 20-22s (duration=2s)
- Segment 2 (Multiple): 22-23s (duration=1s)
- Segment 3 (Robot 2 exclusive): 23-24s (duration=1s)

Apply scoreboard offset to each segment:
- Segment 1: start=21.5, end=22+2.2+0.05×2=24.3 → [21.5, 24.3]
- Segment 2: start=23.5, end=23+2.2+0.05×1=25.25 → [23.5, 25.25]
- Segment 3: start=24.5, end=24+2.2+0.05×1=26.25 → [24.5, 26.25]

Resolve overlaps (split evenly):
- Segment 1 [21.5, 24.3] and Segment 2 [23.5, 25.25]: overlap = 0.8s, split = 0.4s each
  - Segment 1 new end: 24.3 - 0.4 = 23.9
  - Segment 2 new start: 23.5 + 0.4 = 23.9
- Segment 2 [23.9, 25.25] and Segment 3 [24.5, 26.25]: overlap = 0.75s, split = 0.375s each
  - Segment 2 new end: 25.25 - 0.375 = 24.875
  - Segment 3 new start: 24.5 + 0.375 = 24.875

Final offset times after resolution:
- Segment 1: [21.5, 23.9]
- Segment 2: [23.9, 24.875]
- Segment 3: [24.875, 26.25]



> **Note on methodology**: The overlap resolution is applied to the scoreboard-offset times, which represent the exclusive and multiple scoring segments. This is separate from the original robot shooting times used for confidence calculation. We split overlapping time evenly between adjacent segments rather than giving full priority to the earlier shooter.

## Confidence Level Metric

### Concept
A confidence level (0-1) is calculated based on the robot's **exclusive shooting time** using an exponential decay function. The rationale is:

1. **Exclusivity is what matters**: We can only confidently attribute ball/s to a robot when they are shooting alone - during overlapped periods, we can't know which robot scored
2. **Exponential scaling**: The function `1 - e^(-kt)` provides appropriate scaling - it rises quickly initially and plateaus, reflecting that additional exclusive time provides diminishing confidence gains

### Formula
```
confidence = 1 - e^(-k·t)
```

Where:
- `t` = Total seconds the robot spent shooting ALONE during active HUB periods
- `k` = Decay constant (controls how quickly confidence approaches 1.0)

### Decay Constant Selection
With k=0.1:
| Exclusive Time | Confidence |
|----------------|-------------|
| 0 seconds | 0.00 |
| 5 seconds | 0.39 |
| 10 seconds | 0.63 |
| 15 seconds | 0.78 |
| 20 seconds | 0.86 |
| 30 seconds | 0.95 |

### Edge Cases
- If robot has NO exclusive shooting time → confidence = 0
- Maximum confidence is capped at 1.0

## Data Collections

| Collection | Key Fields | Description |
|------------|------------|-------------|
| `fuelScoutData` | `bursts: {fuelScored: number, duration: number}[]`, `team`, `match` | Array of burst objects with fuel scored and duration |
| `timerScoutData` | `shootingTimes: {duration, endShootTime, startShootTime}[]`, `team`, `match`, `alliance` | Array of shooting time objects |
| `videoScoreData` | `redScoreTimeline: {time, score}[]`, `blueScoreTimeline: {time, score}[]`, `match` | Score increments per alliance over time |
| `matchData` | `matchNumber: number`, `teams: {teamNumber: number, ballsPerSecond: number, confidence: number}[]` | Historical match data for moving average calculations |

## Function Signature

```javascript
/**
 * Calculates fuelScored for all teams in a given match
 * @param {number} matchNumber - The match number to calculate fuel for
 * @returns {Promise<Array<{team: number, match: number, autoFuel: number, teleFuel: number, totalFuel: number, ballsPerSec: number, shootingTime: number, confidence: number, method: string}>>}
 * 
 * Note: When using Basic Method (no videoScoreData), confidence returns -1 to indicate not calculated
 */
async function calculateFuelScored(matchNumber)
```

## Logic Flow

```mermaid
flowchart TD
    A[Start: calculateFuelScored] --> B[Query videoScoreData for match]
    B --> C{videoScoreData exists?}
    C -->|No| D[Use Basic Method]
    C -->|Yes| E{Query timerScoutData count}
    E --> F{count === 6?}
    F -->|Yes| G[Use Video Method]
    F -->|No| D
    D --> I[Query fuelScoutData + timerScoutData per team]
    I --> J{Has fuel doc AND shootingTimes doc?}
    J -->|Yes| K[Calculate using bursts array + timer data]
    J -->|No| L[No data - skip team]
    G --> M[Get shootingTimes for all 6 teams]
    M --> N[Merge shooting times within 1 second]
    N --> O[Apply scouter delay adjustment]
    O --> P[Crop to active HUB periods]
    P --> Q[Filter score increments: keep only increment < 5]
    Q --> R[Calculate exclusive shooting time]
    R --> S[Calculate confidence: 1 - e^(-k × exclusiveTime)]
    S --> T[Find exclusive/multiple segments]
    T --> U[Create scoreboard-offset times]
    U --> V[Resolve overlaps in offset times]
    U --> V[Match score increments to offset times]
    V --> W[Calculate fuel per robot]
    W --> X[Separate auto vs tele by timestamp]
    X --> Y[Return team fuel data with confidence]
    K --> Z[Calculate confidence for basic method]
    L --> Y
    Z --> Y
```

## Algorithm: Video Method (Priority)

> **Note:** Apart from HUB status, the blue and red alliance calculations are identical. The algorithm processes each alliance separately with different shooting times and score increments.

### Preliminary: Determine HUB Status (DO FIRST)
- Compare AUTO fuel scores between alliances (from videoScoreData)
- If AUTO scores are different:
  - Winner alliance → HUB inactive for SHIFT 1, then alternates
  - Loser alliance → HUB active for SHIFT 1
- **If AUTO scores are TIE:**
  - **Do NOT use Video Method** - cannot reliably determine HUB patterns
  - Fall back to Basic Method
- Both HUBS active during: AUTO, TRANSITION SHIFT, END GAME

### Step 1: Get Shooting Times Per Robot
- Query timerScoutData for all teams in the match
- Extract shootingTimes array for each robot
- Each entry has: startShootTime, endShootTime, duration

### Step 2: Clean Original Shooting Data
- First, filter out all shooting times with duration < MIN_SHOOTING_TIME (END - START delay difference)
- This removes accidental clicks by scouters
- **Important:** This also prevents inverse shooting times after delay adjustment
  - Example: A shooting time of 20-21.25s (duration=1.25s) would become 19.25-19.25s after delay adjustment, which is invalid
- Then apply `cleanAndMergeShootingTimes()` to each robot's shootingTimes array
- This prevents artificially high ball/s metrics from fragmented burst recordings

### Step 3: Apply Scouter Delay Adjustment
- Apply `adjustForScouterDelay()` to merged times
- This corrects for scouter reaction time to get "real" shooting times
- Start: -0.75s, End: -2s

### Step 4: Crop to Active HUB Periods
- Use HUB active periods determined in Preliminary step
- Fuel scored during inactive HUB periods won't increment the score
- Crop each robot's shooting times to only include active periods for their alliance

### Step 5: Filter Score Increments
- Apply `filterFuelIncrements()` to videoScoreData timeline
- Only keep increments where `increment > 0 && increment < 5`
- This removes score changes from fouls, other game pieces, or score decrements
- **Assumption:** Fuel scored from human player is negligible and can be ignored

### Step 6: Find Exclusive and Multiple Segments
- Combine all robots' scouter-adjusted shooting times into segments
- Use `findExclusiveAndMultipleShootingTimes(robotTimes)`
- Each segment has: start, end, type (exclusive/multiple), robots array
- This combined array is used for scoreboard offset and for calculating confidence

### Step 7: Calculate Exclusive Shooting Time & Confidence
- From the combined segments array, sum up exclusive time per robot
- For each robot, sum durations of segments where type='exclusive' AND robots includes that robot
- Calculate confidence using exponential decay: `confidence = 1 - e^(-k × exclusiveTime)`

### Step 8: Create Scoreboard-Offset Segments
- Apply `createScoreboardOffset()` to the combined segments (not each robot individually)
- This creates a NEW array for score matching
- Start: +1.5s, End: +2.2s + 0.05 × duration

### Step 9: Resolve Overlaps in Offset Segments
- Sort all segments by original start time
- When offset windows overlap, split the overlap evenly between both segments
- This prevents double-counting of score increments while preserving actual shooting behavior

### Step 10: Calculate Fuel Per Second Rate
- For each exclusive segment (type='exclusive'):
  - Track: fuel scored (from score increments) and duration
  - Do NOT calculate ball/s per segment
- Use the COMBINED segments array (not individual robot times)
- **Final ball/s calculation (at the end):**
  - `ballsPerSecond = totalFuelScoredAcrossAllExclusivePeriods / totalExclusiveDuration`
- **Moving Average:** If confidence < 0.3 AND there are prior confidence and ball/s metrics available for this team, use the moving average formula to estimate ball/s instead. See "Moving Average Ball/S Estimation" section for details.

**Exclusive Segment Calculation:**
1. Find exclusive segments from the combined segments array (type='exclusive')
2. Map each exclusive segment to the corresponding scoreboard-offset segments
3. Count score increments that fall within each offset segment = fuel scored for that segment
4. Sum all fuel scored across all exclusive segments
5. Divide by total exclusive time = final ball/s

### Step 11: Distribute Fuel for Multi-Robot Periods
When multiple robots are shooting simultaneously, we need to distribute the total fuel scored based on each robot's known ball/s rate:

**Case A: ALL robots have known ball/s rates (most common)**
- Use percentage method: `robotPercentage = robotBallsPerSec / totalBallsPerSec`
- Example: Robot A = 3 bps, Robot B = 7 bps
  - Robot A: 3 / (3+7) = 30%
  - Robot B: 7 / (3+7) = 70%

**Case B: Some robots have unknown ball/s rates (1 or 2 unknown)**
1. Use ball/s × duration for known robots: `knownFuel = ballPerSec × duration`
2. Sum known robots' fuel
3. **If sum EXCEEDS actual scored**: Scale down proportionally and give ZERO to unknown
   - Example: Robot A = 10 balls (calculated), Robot B = 10 balls (calculated), Actual = 15 balls
   - Scale factor: 15/20 = 0.75
   - Robot A: 10 × 0.75 = 7.5 → round to 7
   - Robot B: 10 × 0.75 = 7.5 → round to 8
   - Unknown: 0 balls
4. **If sum is LESS than actual**: Remaining goes to unknown
   - Example: Robot A = 50 balls (calculated), Unknown, Actual = 100 balls
   - Known: 50, Remaining for unknown: 100 - 50 = 50 balls
5. **If 1 known + 2 unknown**: Split remaining equally between unknowns

**Case C: All robots have unknown ball/s rates (unlikely)**
- Split total fuel evenly among all robots (temporary solution)

**Case D: Exclusive Periods**
- If robot has exclusive shooting time, use ACTUAL fuel scored from videoScoreData
- Don't use ball/s calculation - directly count score increments during exclusive period
- This is the most accurate method

**Important Notes:**
- Do NOT round intermediate calculations
- Only round `fuelScored` (final result) at the very end
- **Division by zero:** If totalExclusiveDuration === 0, set ballsPerSec to 0 (no exclusive time to calculate rate)
- It's unlikely a robot will have exactly 0 ball/s (they're usually shooting during the match)

### Step 11: Separate Auto vs Tele
- **AUTO**: 0-20 seconds
- **TELEOP**: 20-163 seconds
- Sum fuel for each period separately

## Algorithm: Basic Method (Fallback)

> **Note:** Apart from HUB status, the blue and red alliance calculations are identical. The algorithm processes each alliance separately with different shooting times.

This method is used when:
- No videoScoreData exists for the match, OR
- timerScoutData is not available for all 6 teams

**Requirement:** Need BOTH fuelScoutData AND timerScoutData for each team.

### Step 1: Calculate Average Ball/S from bursts Array
- bursts is an array of objects: `[{fuelScored: number, duration: number}, ...]`
- For each object: `ballPerSec = fuelScored / duration`
- Average all ball/s values: `avgBallPerSec = sum(ballPerSec) / count`

### Step 2: Clean and Apply Scouter Delay Adjustment
- First, filter out all shooting times with duration < MIN_SHOOTING_TIME (END - START delay difference)
- This removes accidental clicks like in Video Method
- Then apply scouter delay adjustment to timerScoutData shooting times
- This gives more realistic "actual" shooting times

### Step 3: Assume Active HUB Periods (No Cropping)
- Cannot determine if alliance won/lost auto (no videoScoreData)
- Assume robot only shot during periods when their HUB was active
- Use default alternating pattern: both active in auto/transition/endgame, alternating in shifts

### Step 4: Calculate Auto vs Tele Time
- Calculate time spent shooting in AUTO (0-20s) vs TELEOP (20-163s)
- Use scouter-adjusted times from Step 2

### Step 5: Calculate Fuel Scored
- `autoFuel = avgBallPerSec × autoTime`
- `teleFuel = avgBallPerSec × teleTime`
- `totalFuel = autoFuel + teleFuel`
- Round only final result

### Step 6: Calculate Total Shooting Time for Return
- Sum all shooting durations from scouter-adjusted times

**Note:** No confidence metric calculated for Basic Method

## Return Data Structure

```javascript
[
  {
    team: 111,
    match: 1,
    autoFuel: 3,
    teleFuel: 7,
    totalFuel: 10,           // autoFuel + teleFuel
    ballsPerSec: 2.5,        // Calculated from exclusive periods when available
    shootingTime: 4.0,       // Total shooting time (seconds), not exclusive
    confidence: 0.63,        // Based on exclusive time: 1 - e^(-0.1 × 10)
    method: "video"          // or "basic"
  },
  {
    team: 222,
    match: 1,
    autoFuel: 5,
    teleFuel: 12,
    totalFuel: 17,
    ballsPerSec: 3.4,
    shootingTime: 5.0,
    confidence: -1,          // -1 when using Basic Method (not calculated)
    method: "basic"
  }
]
```

**Field Descriptions:**
- `autoFuel`: Fuel scored during autonomous period (0-20s)
- `teleFuel`: Fuel scored during teleoperated period (20-163s)
- `totalFuel`: Sum of autoFuel + teleFuel
- `ballsPerSec`: Calculated ball/s rate (from exclusive periods when available)
- `shootingTime`: Total time robot spent shooting (seconds), not exclusive time
- `confidence`: 0-1 based on exclusive shooting time, or -1 when using Basic Method
- `method`: "video" or "basic"

## Implementation Steps

1. **Create `src/components/FuelCalculator.js`**
   - Import Firebase firestore functions
   - Define the main `calculateFuelScored` function
   - Export for use in other components

2. **Implement Helper Functions**
   - `cleanAndMergeShootingTimes(shootingTimes, minShootingTime, mergeThreshold)` - Filter short times then merge
   - `adjustForScouterDelay(shootingTimes)` - Apply scouter reaction delay
   - `cropToActiveHub(shootingTimes, hubActivePeriods)` - Crop shooting times to active HUB periods
   - `filterFuelIncrements(scoreTimeline)` - Keep only increments < 5
   - `findExclusiveAndMultipleShootingTimes(robotTimes)` - Combine all robots' times
   - `createScoreboardOffset(segments)` - Create scoreboard-offset segments
   - `resolveOverlaps(offsetSegments)` - Split overlap evenly
   - `calculateConfidence(exclusiveTime)` - Calculate using exponential decay

3. **Implement Firestore queries**
   - `getVideoScoreData(matchNumber)` - Query videoScoreData collection
   - `getTimerScoutData(matchNumber)` - Query timerScoutData collection
   - `getFuelScoutData(matchNumber)` - Query fuelScoutData collection

4. **Implement Video Method**
   - Parse shooting times
   - Merge shooting times within 1 second
   - Apply scouter delay adjustment
   - Crop to active HUB periods
   - Filter score increments to < 5
   - Calculate exclusive shooting time
   - Calculate confidence using exponential decay
   - Find exclusive/multiple segments
   - Create scoreboard-offset segments
   - Resolve overlaps (split evenly)
   - Match score increments to offset times
   - Calculate fuel per second rates
   - Distribute proportionally for multi-robot periods

5. **Implement Basic Method**
   - Sum fuelScored array for total
   - Merge shooting times within 1 second
   - Calculate confidence from exclusive time
   - Distribute proportionally

## Constants

```javascript
const MATCH_TIMING = {
  AUTO_END: 20,        // seconds from start of match
  TRANSITION_SHIFT_END: 23,  // seconds from start (3 second transition shift)
  TRANSITION_END: 33,  // seconds from start (10 second transition after shift)
  SHIFT1_END: 58,
  SHIFT2_END: 83,
  SHIFT3_END: 108,
  SHIFT4_END: 133,    // 2:13 in match time (timer: 77)
  END_GAME_END: 163,  // 2:43 in match time (timer: 0)
  TOTAL_DURATION: 163 // Full match: 20 + 3 + 10 + 25*4 + 30 = 163 seconds
};

const HUB_STATUS = {
  BOTH_ACTIVE: ['auto', 'transition_shift', 'transition', 'endgame'],
  ALTERNATING: ['shift1', 'shift2', 'shift3', 'shift4']
};

const CONFIDENCE = {
  DECAY_CONSTANT: 0.1,           // Controls confidence curve
  MAX_CONFIDENCE: 1.0,           // Cap at 1.0
  LOW_CONFIDENCE_THRESHOLD: 0.3   // Below this, use historical averaging
};

const DATA_FILTERING = {
  MIN_SHOOTING_TIME: SCOUTER_DELAY.END - SCOUTER_DELAY.START,  // 1.00 seconds - ensures no negative times after delay adjustment and filters out accidental times from scouters
  SHOOTING_TIME_MERGE_THRESHOLD: 1.5,  // seconds
  MIN_SCORE_INCREMENT: 1,
  MAX_SCORE_INCREMENT: 4
};

const SCOUTER_DELAY = {
  START: 1.0,  // seconds - scouter reaction to robot starting
  END: 2.0     // seconds - scouter reaction to robot ending
};

const SCOREBOARD = {
  START: 1.5,   // seconds - delay for first ball scored (changes based on shooting position)
  END: 2.2,     // seconds - delay for last ball scored
  RATE: 0.05    // additional delay per second of shooting
};

```

---

## File Location

The function will be created at: `src/components/FuelCalculator.js`
