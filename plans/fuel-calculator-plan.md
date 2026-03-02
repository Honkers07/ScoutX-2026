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
 * @param {Array} matchDataTeams - Teams array from matchData collection: [{teamNumber, ballsPerSecond, confidence}, ...]
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
    // Assuming match numbers increase over time
    const recencyFactor = Math.pow(decayRate, match.matchNumber);
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
- The matchData collection structure: `{ matchNumber, teams: [{ teamNumber, ballsPerSecond, confidence }] }`

### Constants

```javascript
const HISTORICAL_AVERAGING = {
  LOW_CONFIDENCE_THRESHOLD: 0.3,  // Only blend below this
  DECAY_RATE: 0.8,                 // Recent matches weight more
  MIN_HISTORICAL_MATCHES: 1        // Minimum matches needed for averaging
};
```

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

## Data Filtering Rules

### 1. Merge Shooting Times Within 1 Second

**Problem**: Scouters may accidentally count a single burst as multiple small bursts, which artificially inflates the robot's ball/s metric.

**Solution**: Merge shooting times that are within 1 second of each other.

```javascript
/**
 * Merges shooting times that are within mergeThreshold seconds of each other
 * @param {Array<{startShootTime: number, endShootTime: number, duration: number}>} shootingTimes
 * @param {number} mergeThreshold - seconds (default: 1)
 * @returns {Array<{startShootTime: number, endShootTime: number, duration: number}>}
 */
function mergeShootingTimes(shootingTimes, mergeThreshold = 1) {
  if (!shootingTimes || shootingTimes.length === 0) return [];
  
  // Sort by start time
  const sorted = [...shootingTimes].sort((a, b) => a.startShootTime - b.startShootTime);
  
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
    const increment = current.score - previous.score;
    
    // Only include increments < 5 (i.e., 1, 2, 3, 4)
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

We SUBTRACT these delays to get "real" shooting times:

```javascript
const SCOUTER_DELAY = {
  START: 0.75,  // seconds - scouter is late noticing start
  END: 2.0     // seconds - scouter is late noticing end
};

/**
 * Adjusts original shooting times for scouter reaction delay
 * @param {Array} shootingTimes - Merged shooting times
 * @returns {Array} - Adjusted "real" shooting times
 */
function adjustForScouterDelay(shootingTimes) {
  return shootingTimes.map(time => ({
    start: time.startShootTime - SCOUTER_DELAY.START,
    end: time.endShootTime - SCOUTER_DELAY.END,
    duration: (time.endShootTime - SCOUTER_DELAY.END) - (time.startShootTime - SCOUTER_DELAY.START)
  }));
}
```

**Example:**
- Raw (scouter reports): 30-32s
- After adjustment: 30-0.75=29.25s, 32-2=30s → 29.25-30s

### Step 2: Scoreboard Offset

The scoreboard has its own delay from when scoring happens to when it appears:
- **Scoreboard delay**: 2.2s (longest to ensure we don't miss any balls)
- **Rate**: 0.05 (reduced from 0.2 - each ball adds small delay)

We ADD this offset to match score timeline:

```javascript
const SCOREBOARD = {
  DELAY: 2.2,    // seconds - delay from robot scoring to scoreboard update
  RATE: 0.05     // additional delay per second of shooting
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
      start: time.start + SCOREBOARD.DELAY,
      end: time.end + SCOREBOARD.DELAY + (duration * SCOREBOARD.RATE),
      originalStart: time.start,
      originalEnd: time.end,
      duration: duration
    };
  });
}
```

**Example:**
- After scouter adjustment: 29.25-30s (duration=0.75s)
- After scoreboard offset: start=29.25+2.2=31.45s, end=30+2.2+0.05×0.75=32.575s

### Important: Three Separate Time Arrays

We maintain THREE separate time arrays for different purposes:

1. **Original/Merged Shooting Times**
   - Raw data from mergeShootingTimes()
   - BEFORE any adjustments

2. **Scouter-Adjusted Times** (for confidence calculation)
   - After subtracting scouter delays
   - Used to find exclusive periods
   - Used to calculate exclusive shooting time
   - Cropped to active HUB periods

3. **Scoreboard-Offset Times** (for score attribution)
   - After adding scoreboard offset
   - Used to match score increments to robots
   - Overlaps resolved (giving priority to earlier shooter)

**Why separate?**
- Overlap resolution artificially adds time to earlier robots - can't use for confidence
- Each serves a different purpose in the algorithm

```javascript
// Algorithm flow:
// 1. mergeShootingTimes() → original times
// 2. adjustForScouterDelay() → scouter-adjusted times  
// 3. Crop to active HUB periods → for confidence/exclusivity
// 4. createScoreboardOffset() → scoreboard-offset times (NEW array)
// 5. resolveOverlaps() → for score matching
```

## Delay Offset and Overlap Resolution

### The Problem

When using delay to account for scoreboard lag, adjacent shooting times can cause score increments to be double-counted between robots:

**Example:**
- Robot 1: shoots 20-22s, delay = 2 + 0.2×2 = 2.4s
  - Expected score window: 22.4s to 24.4s
- Robot 2: shoots 23-24s, delay = 2 + 0.2×1 = 2.2s
  - Expected score window: 25.2s to 26.2s
- Score increments at 22, 23, 24, 25s could be attributed to BOTH robots!

### The Solution: Offset Shooting Times with Overlap Resolution

Using the scoreboard-offset times, resolve overlaps by prioritizing the robot that started first.

```javascript
/**
 * Resolves overlaps between scoreboard-offset shooting times
 * Robot that starts first gets priority - adjust later robots' start times
 * @param {Array} offsetTimes - Array of scoreboard-offset shooting times
 * @returns {Array} - Offset times with resolved overlaps
 */
function resolveOverlaps(offsetTimes) {
  if (!offsetTimes || offsetTimes.length === 0) return [];
  
  // Sort by original start time (not offset start!)
  const sorted = [...offsetTimes].sort((a, b) => a.originalStart - b.originalStart);
  
  const resolved = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = resolved[resolved.length - 1];
    
    // Check if current's offset window overlaps with last's
    if (current.start < last.end) {
      // Overlap detected! Adjust current's start to not overlap
      // Give priority to robot that started first
      current.start = last.end;
    }
    
    resolved.push(current);
  }
  
  return resolved;
}
```

**Example with overlap:**
- Robot 1: shoots 20-30s → after offset: 24-34s
- Robot 2: shoots 31-32s → after offset: 33.2-34.2s
- Overlap: 33.2-34s
- Resolution: Robot 2's start becomes 34s (Robot 1's end)

**CRITICAL**: Only resolve overlaps that were CREATED by the scoreboard offset, not overlaps that existed in the original shooting times.

## Confidence Level Metric

### Concept
A confidence level (0-1) is calculated based on the robot's **exclusive shooting time** using an exponential decay function. The rationale is:

1. **Exclusivity is what matters**: We can only confidently attribute ball/s to a robot when they are shooting alone - during overlapped periods, we can't know which robot scored
2. **Exponential scaling**: The function `1 - e^(-kt)` provides appropriate scaling - it rises quickly initially and plateaus, reflecting that additional exclusive time provides diminishing confidence gains

### Formula
```javascript
confidence = 1 - e^(-k × exclusiveTime)
```

Where:
- `exclusiveTime` = Total seconds the robot spent shooting ALONE during active HUB periods (from scouter-adjusted times)
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
    S --> T[Create scoreboard-offset times]
    T --> U[Resolve overlaps in offset times]
    U --> V[Match score increments to offset times]
    V --> W[Calculate fuel per robot]
    W --> X[Separate auto vs tele by timestamp]
    X --> Y[Return team fuel data with confidence]
    K --> Z[Calculate confidence for basic method]
    L --> Y
    Z --> Y
```

## Algorithm: Video Method (Priority)

### Preliminary: Determine HUB Status (DO FIRST)
- Compare AUTO fuel scores between alliances (from videoScoreData)
- If AUTO scores are different:
  - Winner alliance → HUB inactive for SHIFT 1, then alternates
  - Loser alliance → HUB active for SHIFT 1
- If AUTO scores are TIE:
  - Look at score increments during ALLIANCE SHIFTS (SHIFT 1-4)
  - If one alliance scores but the other doesn't during a shift (while both were shooting):
    - The scoring alliance's HUB was active
    - The non-scoring alliance's HUB was inactive
- Both HUBS active during: AUTO, TRANSITION SHIFT, END GAME

### Step 1: Get Shooting Times Per Robot
- Query timerScoutData for all teams in the match
- Extract shootingTimes array for each robot
- Each entry has: startShootTime, endShootTime, duration

### Step 2: Merge Shooting Times Within 1 Second
- Apply `mergeShootingTimes()` to each robot's shootingTimes array
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
- This removes score changes from fouls or other game pieces

### Step 6: Calculate Exclusive Shooting Time & Confidence
- For each robot, find time ranges where ONLY that robot was shooting (from scouter-adjusted times)
- Sum all exclusive time segments to get total exclusive shooting time
- Calculate confidence using exponential decay: `confidence = 1 - e^(-k × exclusiveTime)`

### Step 7: Create Scoreboard-Offset Times
- Apply `createScoreboardOffset()` to scouter-adjusted times
- This creates a NEW array for score matching
- Start: +2.2s, End: +2.2s + 0.05 × duration

### Step 8: Resolve Overlaps in Offset Times
- Sort all robots' offset times by original start time
- When offset windows overlap, adjust later robot's start to earlier robot's end
- **CRITICAL**: Only resolve overlaps that were CREATED by the scoreboard offset
- If the original shooting times already overlapped, keep that overlap (they were actually shooting together)
- This prevents double-counting of score increments while preserving actual shooting behavior

### Step 9: Calculate Fuel Per Second Rate
- For each exclusive period (robot is the ONLY one shooting):
  - Track: fuel scored (from score increments) and duration
  - Do NOT calculate ball/s per period
- **Final ball/s calculation (at the end):**
  - `ballsPerSecond = totalFuelScoredAcrossAllExclusivePeriods / totalExclusiveDuration`
- **Moving Average:** If confidence < 0.3 AND there are prior confidence and ball/s metrics available for this team, use the moving average formula to estimate ball/s instead. See "Moving Average Ball/S Estimation" section for details.

**Exclusive Period Calculation:**
1. Find exclusive periods from scouter-adjusted shooting times array
2. Map each exclusive period to the corresponding scoreboard-offset times array
3. Count score increments that fall within each offset period = fuel scored for that period
4. Sum all fuel scored across all exclusive periods
5. Divide by total exclusive time = final ball/s

### Step 10: Distribute Fuel for Multi-Robot Periods
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
- It's unlikely a robot will have exactly 0 ball/s (they're usually shooting during the match)

### Step 11: Separate Auto vs Tele
- **AUTO**: 0-20 seconds
- **TELEOP**: 20-163 seconds
- Sum fuel for each period separately

## Algorithm: Basic Method (Fallback)

This method is used when:
- No videoScoreData exists for the match, OR
- timerScoutData is not available for all 6 teams

**Requirement:** Need BOTH fuelScoutData AND timerScoutData for each team.

### Step 1: Calculate Average Ball/S from bursts Array
- bursts is an array of objects: `[{fuelScored: number, duration: number}, ...]`
- For each object: `ballPerSec = fuelScored / duration`
- Average all ball/s values: `avgBallPerSec = sum(ballPerSec) / count`

### Step 2: Apply Scouter Delay Adjustment
- Apply scouter delay adjustment to timerScoutData shooting times
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
   - `mergeShootingTimes(shootingTimes, mergeThreshold)` - Merge times within 1 second
   - `adjustForScouterDelay(shootingTimes)` - Apply scouter reaction delay
   - `filterFuelIncrements(scoreTimeline)` - Keep only increments < 5
   - `createScoreboardOffset(adjustedTimes)` - Create scoreboard-offset times
   - `resolveOverlaps(offsetTimes)` - Resolve overlapping offset windows
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
   - Create scoreboard-offset times
   - Resolve overlaps
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
  SHOOTING_TIME_MERGE_THRESHOLD: 1,  // seconds
  MIN_SCORE_INCREMENT: 1,
  MAX_SCORE_INCREMENT: 4
};

const SCOUTER_DELAY = {
  START: 0.75,  // seconds - scouter reaction to robot starting
  END: 2.0     // seconds - scouter reaction to robot ending
};

const SCOREBOARD = {
  DELAY: 2.2,    // seconds - scoreboard update delay
  RATE: 0.05     // additional delay per second of shooting
};
```

---

## File Location

The function will be created at: `src/components/FuelCalculator.js`
