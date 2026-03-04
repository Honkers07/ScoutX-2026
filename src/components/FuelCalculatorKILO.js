// FuelCalculator.js - Calculates fuel scored for FRC 2026 Reefscape matches
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import firebase from '../firebase';

// ============================================================================
// CONSTANTS
// ============================================================================

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
  MIN_SHOOTING_TIME: 1.0,  // SCOUTER_DELAY.END - SCOUTER_DELAY.START = 1.0 seconds
  SHOOTING_TIME_MERGE_THRESHOLD: 1.5,  // seconds
  MIN_SCORE_INCREMENT: 1,
  MAX_SCORE_INCREMENT: 4
};

const SCOUTER_DELAY = {
  START: 1.0,  // seconds - scouter reaction to robot starting
  END: 2.0     // seconds - scouter reaction to robot ending
};

const SCOREBOARD = {
  START: 1.5,   // seconds - delay for first ball scored
  END: 2.2,     // seconds - delay for last ball scored
  RATE: 0.05    // additional delay per second of shooting
};

const HISTORICAL_AVERAGING = {
  LOW_CONFIDENCE_THRESHOLD: 0.3,
  DECAY_RATE: 0.8,
  MIN_HISTORICAL_MATCHES: 1
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Filters short shooting times and merges close times
 * @param {Array<{startShootTime: number, endShootTime: number, duration: number}>} shootingTimes
 * @param {number} minShootingTime - minimum duration to keep
 * @param {number} mergeThreshold - seconds between times to merge
 * @returns {Array<{start: number, end: number, duration: number}>}
 */
function cleanAndMergeShootingTimes(shootingTimes, minShootingTime = DATA_FILTERING.MIN_SHOOTING_TIME, mergeThreshold = DATA_FILTERING.SHOOTING_TIME_MERGE_THRESHOLD) {
  if (!shootingTimes || shootingTimes.length === 0) return [];
  
  // Step 1: Filter out short shooting times (accidental clicks)
  const filtered = shootingTimes.filter(time => time.duration >= minShootingTime);
  
  if (filtered.length === 0) return [];
  
  // Step 2: Sort by start time
  const sorted = [...filtered].sort((a, b) => a.startShootTime - b.startShootTime);
  
  const merged = [{
    start: sorted[0].startShootTime,
    end: sorted[0].endShootTime,
    duration: sorted[0].endShootTime - sorted[0].startShootTime
  }];
  
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    
    // If current starts within mergeThreshold seconds of last ending, merge them
    if (current.startShootTime - last.end <= mergeThreshold) {
      // Extend the last entry to include current
      last.end = current.endShootTime;
      last.duration = last.end - last.start;
    } else {
      merged.push({
        start: current.startShootTime,
        end: current.endShootTime,
        duration: current.endShootTime - current.startShootTime
      });
    }
  }
  
  return merged;
}

/**
 * Adjusts original shooting times for scouter reaction delay
 * @param {Array} mergedTimes - Merged shooting times
 * @returns {Array} - Adjusted "real" shooting times
 */
function adjustForScouterDelay(mergedTimes) {
  if (!mergedTimes || mergedTimes.length === 0) return [];
  
  return mergedTimes.map(time => {
    const adjustedStart = Math.max(0, time.start - SCOUTER_DELAY.START);
    const adjustedEnd = Math.max(0, time.end - SCOUTER_DELAY.END);
    return {
      start: adjustedStart,
      end: adjustedEnd,
      duration: Math.max(0, adjustedEnd - adjustedStart)
    };
  });
}

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

/**
 * Filters score timeline to only include fuel-related increments (< 5)
 * @param {Array<{timestamp: number, score: number}>} scoreTimeline
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
        time: current.timestamp,
        score: current.score,
        increment: increment
      });
    }
  }
  
  return filtered;
}

/**
 * Combines multiple robots' shooting times into exclusive and multiple segments
 * @param {Array} robotTimes - Array of arrays, each containing scouter-adjusted shooting times for one robot
 * @returns {Array} - Combined array of {start, end, type, robots, originalStart, originalEnd} segments
 */
function findExclusiveAndMultipleShootingTimes(robotTimes) {
  if (!robotTimes || robotTimes.length === 0) return [];
  
  // Flatten all shooting times with robot identifier
  const allTimes = [];
  robotTimes.forEach((times, robotIndex) => {
    if (times) {
      times.forEach(time => {
        allTimes.push({
          start: time.start,
          end: time.end,
          duration: time.duration,
          robotIndex: robotIndex,
          originalStart: time.start,
          originalEnd: time.end
        });
      });
    }
  });
  
  // Sort by start time
  allTimes.sort((a, b) => a.start - b.start);
  
  if (allTimes.length === 0) return [];
  
  // Build segments
  const segments = [];
  let currentSegment = {
    start: allTimes[0].start,
    end: allTimes[0].end,
    robots: [allTimes[0].robotIndex],
    originalStart: allTimes[0].originalStart,
    originalEnd: allTimes[0].originalEnd
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
        robots: [time.robotIndex],
        originalStart: time.start,
        originalEnd: time.end
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
    robots: seg.robots,
    originalStart: seg.originalStart,
    originalEnd: seg.originalEnd
  }));
}

/**
 * Creates offsetted shooting times for scoreboard matching
 * @param {Array} segments - Combined exclusive/multiple segments
 * @returns {Array} - Offset times for score matching
 */
function createScoreboardOffset(segments) {
  if (!segments || segments.length === 0) return [];
  
  return segments.map(seg => {
    const duration = seg.duration;
    return {
      start: seg.start + SCOREBOARD.START,
      end: seg.end + SCOREBOARD.END + (duration * SCOREBOARD.RATE),
      originalStart: seg.originalStart,
      originalEnd: seg.originalEnd,
      duration: duration,
      type: seg.type,
      robots: seg.robots
    };
  });
}

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

/**
 * Calculates confidence using exponential decay
 * @param {number} exclusiveTime - Total seconds shooting alone
 * @returns {number} - Confidence level (0-1)
 */
function calculateConfidence(exclusiveTime) {
  if (exclusiveTime <= 0) return 0;
  const confidence = 1 - Math.exp(-CONFIDENCE.DECAY_CONSTANT * exclusiveTime);
  return Math.min(confidence, CONFIDENCE.MAX_CONFIDENCE);
}

/**
 * Estimates ball/s using matchData collection when confidence is low
 * @param {number} currentBps - Ball per second from current match
 * @param {number} currentConfidence - Confidence from current match (0-1)
 * @param {Array} matchDataTeams - Teams array from matchData collection
 * @param {number} teamNumber - Team number to look up
 * @param {number} decayRate - How much to weight recent matches (0-1)
 * @returns {number} - Estimated ball/s
 */
function estimateBallPerSecond(currentBps, currentConfidence, matchDataTeams, teamNumber, decayRate = HISTORICAL_AVERAGING.DECAY_RATE) {
  // If high confidence, trust current calculation
  if (currentConfidence >= CONFIDENCE.LOW_CONFIDENCE_THRESHOLD) {
    return currentBps;
  }
  
  // Get historical data for this team from matchData
  const historicalData = matchDataTeams ? matchDataTeams.filter(t => t.teamNumber === teamNumber) : [];
  
  // If no historical data, use current calculation
  if (historicalData.length === 0) {
    return currentBps;
  }
  
  // Calculate weighted historical average
  let weightedSum = currentBps * currentConfidence;
  let weightSum = currentConfidence;
  
  for (const match of historicalData) {
    // More recent matches get higher weight
    const recencyFactor = Math.pow(decayRate, match.matchesAgo || 1);
    const weight = (match.confidence || 0) * recencyFactor;
    
    weightedSum += (match.ballsPerSecond || 0) * weight;
    weightSum += weight;
  }
  
  return weightSum > 0 ? weightedSum / weightSum : currentBps;
}

/**
 * Determines HUB active periods based on AUTO results
 * @param {number} blueAutoFuel - Blue alliance auto fuel scored
 * @param {number} redAutoFuel - Red alliance auto fuel scored
 * @returns {Object} - { blue: [{start, end}], red: [{start, end}] }
 */
function determineHubActivePeriods(blueAutoFuel, redAutoFuel) {
  // Both HUBs active during: AUTO, TRANSITION SHIFT, END GAME
  const bothActivePeriods = [
    { start: 0, end: MATCH_TIMING.AUTO_END },                          // AUTO: 0-20
    { start: MATCH_TIMING.AUTO_END, end: MATCH_TIMING.TRANSITION_SHIFT_END }, // TRANSITION SHIFT: 20-23
    { start: MATCH_TIMING.TRANSITION_END, end: MATCH_TIMING.SHIFT1_END },     // TRANSITION: 23-33
    { start: MATCH_TIMING.SHIFT4_END, end: MATCH_TIMING.END_GAME_END }  // END GAME: 133-163
  ];

  // Determine which alliance won AUTO
  let blueWonAuto = blueAutoFuel > redAutoFuel;
  let redWonAuto = redAutoFuel > blueAutoFuel;
  let autoTie = blueAutoFuel === redAutoFuel;

  // If tie, cannot determine - use default alternating pattern
  // If blue won: blue's HUB inactive for SHIFT 1, then alternates
  // If red won: red's HUB inactive for SHIFT 1, then alternates

  const bluePeriods = [...bothActivePeriods];
  const redPeriods = [...bothActivePeriods];

  if (!autoTie) {
    // SHIFT 1: 33-58 (0:33 - 0:58)
    // SHIFT 2: 58-83 (0:58 - 1:23)
    // SHIFT 3: 83-108 (1:23 - 1:48)
    // SHIFT 4: 108-133 (1:48 - 2:13)
    
    if (blueWonAuto) {
      // Blue's HUB inactive for SHIFT 1, then alternates
      redPeriods.push({ start: MATCH_TIMING.TRANSITION_END, end: MATCH_TIMING.SHIFT1_END }); // SHIFT 1 - Red active
      bluePeriods.push({ start: MATCH_TIMING.SHIFT1_END, end: MATCH_TIMING.SHIFT2_END });    // SHIFT 2 - Blue active
      redPeriods.push({ start: MATCH_TIMING.SHIFT2_END, end: MATCH_TIMING.SHIFT3_END });     // SHIFT 3 - Red active
      bluePeriods.push({ start: MATCH_TIMING.SHIFT3_END, end: MATCH_TIMING.SHIFT4_END });    // SHIFT 4 - Blue active
    } else {
      // Red's HUB inactive for SHIFT 1, then alternates
      bluePeriods.push({ start: MATCH_TIMING.TRANSITION_END, end: MATCH_TIMING.SHIFT1_END });  // SHIFT 1 - Blue active
      redPeriods.push({ start: MATCH_TIMING.SHIFT1_END, end: MATCH_TIMING.SHIFT2_END });       // SHIFT 2 - Red active
      bluePeriods.push({ start: MATCH_TIMING.SHIFT2_END, end: MATCH_TIMING.SHIFT3_END });       // SHIFT 3 - Blue active
      redPeriods.push({ start: MATCH_TIMING.SHIFT3_END, end: MATCH_TIMING.SHIFT4_END });        // SHIFT 4 - Red active
    }
  } else {
    // Auto tie - default alternating pattern (blue wins tiebreaker for default)
    // Default: blue active SHIFT 1, then alternate
    redPeriods.push({ start: MATCH_TIMING.TRANSITION_END, end: MATCH_TIMING.SHIFT1_END });    // SHIFT 1 - Red active
    bluePeriods.push({ start: MATCH_TIMING.SHIFT1_END, end: MATCH_TIMING.SHIFT2_END });      // SHIFT 2 - Blue active
    redPeriods.push({ start: MATCH_TIMING.SHIFT2_END, end: MATCH_TIMING.SHIFT3_END });        // SHIFT 3 - Red active
    bluePeriods.push({ start: MATCH_TIMING.SHIFT3_END, end: MATCH_TIMING.SHIFT4_END });      // SHIFT 4 - Blue active
  }

  return { blue: bluePeriods, red: redPeriods };
}

// ============================================================================
// FIRESTORE QUERY FUNCTIONS
// ============================================================================

/**
 * Gets video score data for a match
 * @param {number} matchNumber 
 * @returns {Promise<Object|null>}
 */
async function getVideoScoreData(matchNumber) {
  try {
    const videoRef = collection(firebase, 'videoScoreData');
    const q = query(videoRef, where('matchNumber', '==', String(matchNumber)));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error getting videoScoreData:', error);
    return null;
  }
}

/**
 * Gets timer scout data for a match
 * @param {number} matchNumber 
 * @returns {Promise<Array>}
 */
async function getTimerScoutData(matchNumber) {
  try {
    const timerRef = collection(firebase, 'timerScoutData');
    const q = query(timerRef, where('match', '==', String(matchNumber)));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return [];
    }
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting timerScoutData:', error);
    return [];
  }
}

/**
 * Gets fuel scout data for a match
 * @param {number} matchNumber 
 * @returns {Promise<Array>}
 */
async function getFuelScoutData(matchNumber) {
  try {
    const fuelRef = collection(firebase, 'fuelScoutData');
    const q = query(fuelRef, where('match', '==', String(matchNumber)));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return [];
    }
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting fuelScoutData:', error);
    return [];
  }
}

/**
 * Gets match data for historical averaging
 * @param {number} teamNumber 
 * @returns {Promise<Array>}
 */
async function getMatchData(teamNumber) {
  try {
    // This would query the matchData collection for historical data
    // For now, return empty array as the collection structure needs to be defined
    return [];
  } catch (error) {
    console.error('Error getting matchData:', error);
    return [];
  }
}

// ============================================================================
// VIDEO METHOD
// ============================================================================

/**
 * Process an alliance using the Video Method
 * @param {Array} timerData - Timer scout data for all teams in alliance
 * @param {Array} filteredScores - Filtered score increments
 * @param {Array} hubActivePeriods - Active HUB periods for this alliance
 * @param {number} matchNumber 
 * @returns {Array}
 */
async function processAllianceVideoMethod(timerData, filteredScores, hubActivePeriods, matchNumber) {
  const results = [];
  
  // Step 1: Get shooting times for each robot
  const robotShootingTimes = timerData.map(teamData => {
    if (!teamData.shootingTimes) return [];
    return cleanAndMergeShootingTimes(teamData.shootingTimes);
  });
  
  // Step 2: Apply scouter delay adjustment to each robot
  const adjustedTimes = robotShootingTimes.map(times => adjustForScouterDelay(times));
  
  // Step 3: Crop to active HUB periods
  const croppedTimes = adjustedTimes.map(times => cropToActiveHub(times, hubActivePeriods));
  
  // Step 4: Find exclusive and multiple segments
  const combinedSegments = findExclusiveAndMultipleShootingTimes(croppedTimes);
  
  // Step 5: Calculate exclusive time and confidence per robot
  const exclusiveTimes = {};
  const totalShootingTimes = {};
  
  timerData.forEach((teamData, index) => {
    const team = parseInt(teamData.team);
    exclusiveTimes[team] = 0;
    totalShootingTimes[team] = 0;
  });
  
  // Calculate exclusive time from combined segments
  combinedSegments.forEach(seg => {
    if (seg.type === 'exclusive' && seg.robots.length === 1) {
      const team = parseInt(timerData[seg.robots[0]]?.team);
      if (team) {
        exclusiveTimes[team] = (exclusiveTimes[team] || 0) + seg.duration;
      }
    }
    
    // Calculate total shooting time per robot
    seg.robots.forEach(robotIndex => {
      const team = parseInt(timerData[robotIndex]?.team);
      if (team) {
        totalShootingTimes[team] = (totalShootingTimes[team] || 0) + (seg.duration / seg.robots.length);
      }
    });
  });
  
  // Step 6: Create scoreboard-offset segments
  const offsetSegments = createScoreboardOffset(combinedSegments);
  
  // Step 7: Resolve overlaps
  const resolvedSegments = resolveOverlaps(offsetSegments);
  
  // Step 8: Match score increments to offset segments
  const scoresByRobot = {};
  timerData.forEach((teamData, index) => {
    const team = parseInt(teamData.team);
    scoresByRobot[team] = 0;
  });
  
  resolvedSegments.forEach(seg => {
    // Count score increments within this segment
    const segmentScores = filteredScores.filter(
      score => score.time >= seg.start && score.time <= seg.end
    );
    
    const totalSegmentScore = segmentScores.reduce((sum, s) => sum + s.increment, 0);
    
    if (seg.type === 'exclusive') {
      // Exclusive segment - all score goes to the single robot
      const team = parseInt(timerData[seg.robots[0]]?.team);
      if (team) {
        scoresByRobot[team] = (scoresByRobot[team] || 0) + totalSegmentScore;
      }
    } else if (seg.type === 'multiple') {
      // Multiple robots - distribute based on their ball/s rates
      // For now, we'll need to estimate or use a default
      // This is handled in Step 11 below
    }
  });
  
  // Step 9: Calculate ballsPerSec for each robot
  const ballsPerSecByTeam = {};
  timerData.forEach((teamData, index) => {
    const team = parseInt(teamData.team);
    const exclusiveTime = exclusiveTimes[team] || 0;
    const score = scoresByRobot[team] || 0;
    
    if (exclusiveTime > 0) {
      ballsPerSecByTeam[team] = score / exclusiveTime;
    } else {
      ballsPerSecByTeam[team] = 0;
    }
  });
  
  // Step 10: Handle multiple robot periods - distribute remaining scores
  const multipleSegments = resolvedSegments.filter(seg => seg.type === 'multiple');
  multipleSegments.forEach(seg => {
    const segmentScores = filteredScores.filter(
      score => score.time >= seg.start && score.time <= seg.end
    );
    const totalSegmentScore = segmentScores.reduce((sum, s) => sum + s.increment, 0);
    
    // Get robots in this segment
    const segmentTeams = seg.robots.map(i => parseInt(timerData[i]?.team)).filter(t => !isNaN(t));
    
    // Get ballsPerSec for each robot
    const knownTeams = segmentTeams.filter(t => ballsPerSecByTeam[t] > 0);
    
    if (knownTeams.length > 0) {
      const totalKnownBps = knownTeams.reduce((sum, t) => sum + ballsPerSecByTeam[t], 0);
      knownTeams.forEach(team => {
        const percentage = ballsPerSecByTeam[team] / totalKnownBps;
        scoresByRobot[team] = (scoresByRobot[team] || 0) + (totalSegmentScore * percentage);
      });
    } else {
      // All unknown - split evenly
      const evenSplit = totalSegmentScore / segmentTeams.length;
      segmentTeams.forEach(team => {
        scoresByRobot[team] = (scoresByRobot[team] || 0) + evenSplit;
      });
    }
  });
  
  // Step 11: Calculate final metrics for each team
  for (let i = 0; i < timerData.length; i++) {
    const teamData = timerData[i];
    const team = parseInt(teamData.team);
    const exclusiveTime = exclusiveTimes[team] || 0;
    const totalScore = scoresByRobot[team] || 0;
    const confidence = calculateConfidence(exclusiveTime);
    
    // Get match data for historical averaging
    const matchDataTeams = await getMatchData(team);
    
    // Apply historical averaging if confidence is low
    let ballsPerSec = ballsPerSecByTeam[team] || 0;
    if (confidence < CONFIDENCE.LOW_CONFIDENCE_THRESHOLD && matchDataTeams.length > 0) {
      ballsPerSec = estimateBallPerSecond(ballsPerSec, confidence, matchDataTeams, team);
    }
    
    // Calculate auto vs tele
    const croppedTimesTeam = croppedTimes[i] || [];
    const autoTimes = croppedTimesTeam.filter(t => t.end <= MATCH_TIMING.AUTO_END);
    const teleTimes = croppedTimesTeam.filter(t => t.start >= MATCH_TIMING.AUTO_END);
    
    const autoTime = autoTimes.reduce((sum, t) => sum + t.duration, 0);
    const teleTime = teleTimes.reduce((sum, t) => sum + t.duration, 0);
    
    // Calculate fuel based on ball/s and time
    const autoFuel = Math.round(ballsPerSec * autoTime);
    const teleFuel = Math.round(ballsPerSec * teleTime);
    
    // Get the alliance from timer data
    const alliance = teamData.alliance || 'Unknown';
    
    results.push({
      team: team,
      match: matchNumber,
      alliance: alliance.toLowerCase(),
      autoFuel: autoFuel,
      teleFuel: teleFuel,
      totalFuel: autoFuel + teleFuel,
      ballsPerSec: ballsPerSec,
      shootingTime: totalShootingTimes[team] || 0,
      confidence: confidence,
      method: 'video'
    });
  }
  
  return results;
}

// ============================================================================
// BASIC METHOD
// ============================================================================

/**
 * Process an alliance using the Basic Method
 * @param {Array} fuelData - Fuel scout data
 * @param {Array} timerData - Timer scout data
 * @param {number} matchNumber 
 * @returns {Array}
 */
async function processAllianceBasicMethod(fuelData, timerData, matchNumber) {
  const results = [];
  
  // Group fuel and timer data by team
  const teamDataMap = {};
  
  // Initialize with timer data
  timerData.forEach(teamData => {
    const team = parseInt(teamData.team);
    teamDataMap[team] = {
      team: team,
      timerData: teamData,
      fuelData: null
    };
  });
  
  // Add fuel data
  fuelData.forEach(fData => {
    const team = parseInt(fData.team);
    if (teamDataMap[team]) {
      teamDataMap[team].fuelData = fData;
    }
  });
  
  // Process each team
  for (const team in teamDataMap) {
    const data = teamDataMap[team];
    const teamNum = parseInt(team);
    
    if (!data.fuelData || !data.timerData) {
      continue; // Skip if missing either data
    }
    
    // Step 1: Calculate average ball/s from bursts
    const bursts = data.fuelData.bursts || [];
    if (bursts.length === 0) {
      continue;
    }
    
    let totalBallPerSec = 0;
    bursts.forEach(burst => {
      if (burst.duration > 0) {
        totalBallPerSec += burst.fuelScored / burst.duration;
      }
    });
    const avgBallPerSec = totalBallPerSec / bursts.length;
    
    // Step 2: Clean and apply scouter delay adjustment
    const mergedTimes = cleanAndMergeShootingTimes(data.timerData.shootingTimes || []);
    const adjustedTimes = adjustForScouterDelay(mergedTimes);
    
    // Step 3: Assume active HUB periods (alternating pattern)
    // Both active in auto/transition/endgame, alternating in shifts
    const hubActivePeriods = [
      { start: 0, end: MATCH_TIMING.AUTO_END },
      { start: MATCH_TIMING.AUTO_END, end: MATCH_TIMING.TRANSITION_SHIFT_END },
      { start: MATCH_TIMING.TRANSITION_END, end: MATCH_TIMING.SHIFT1_END },
      { start: MATCH_TIMING.SHIFT1_END, end: MATCH_TIMING.SHIFT2_END },
      { start: MATCH_TIMING.SHIFT2_END, end: MATCH_TIMING.SHIFT3_END },
      { start: MATCH_TIMING.SHIFT3_END, end: MATCH_TIMING.SHIFT4_END },
      { start: MATCH_TIMING.SHIFT4_END, end: MATCH_TIMING.END_GAME_END }
    ];
    
    const croppedTimes = cropToActiveHub(adjustedTimes, hubActivePeriods);
    
    // Step 4: Calculate auto vs tele time
    const autoTimes = croppedTimes.filter(t => t.end <= MATCH_TIMING.AUTO_END);
    const teleTimes = croppedTimes.filter(t => t.start >= MATCH_TIMING.AUTO_END);
    
    const autoTime = autoTimes.reduce((sum, t) => sum + t.duration, 0);
    const teleTime = teleTimes.reduce((sum, t) => sum + t.duration, 0);
    
    // Step 5: Calculate fuel scored
    const autoFuel = Math.round(avgBallPerSec * autoTime);
    const teleFuel = Math.round(avgBallPerSec * teleTime);
    
    // Step 6: Calculate total shooting time
    const totalShootingTime = croppedTimes.reduce((sum, t) => sum + t.duration, 0);
    
    const alliance = data.timerData.alliance || 'Unknown';
    
    results.push({
      team: teamNum,
      match: matchNumber,
      alliance: alliance.toLowerCase(),
      autoFuel: autoFuel,
      teleFuel: teleFuel,
      totalFuel: autoFuel + teleFuel,
      ballsPerSec: avgBallPerSec,
      shootingTime: totalShootingTime,
      confidence: -1, // Not calculated for Basic Method
      method: 'basic'
    });
  }
  
  return results;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Calculates fuelScored for all teams in a given match
 * @param {number} matchNumber - The match number to calculate fuel for
 * @returns {Promise<Array<{team: number, match: number, autoFuel: number, teleFuel: number, totalFuel: number, ballsPerSec: number, shootingTime: number, confidence: number, method: string}>>}
 */
async function calculateFuelScored(matchNumber) {
  // Step 1: Get videoScoreData
  const videoData = await getVideoScoreData(matchNumber);
  
  // Step 2: Get all timerScoutData
  const allTimerData = await getTimerScoutData(matchNumber);
  
  // Step 3: Determine which method to use
  // If videoScoreData exists AND timerScoutData has all 6 teams, use Video Method
  // Otherwise, use Basic Method
  
  const hasVideoData = videoData !== null;
  const hasAllTimerData = allTimerData.length >= 6;
  
  let useVideoMethod = hasVideoData && hasAllTimerData;
  
  // Check for AUTO tie - if tie, cannot determine HUB patterns, fall back to Basic
  // Need to find score at end of AUTO (timestamp >= 20)
  let blueAutoFuel = 0;
  let redAutoFuel = 0;
  
  if (useVideoMethod && videoData) {
    // Find the first score entry at or after AUTO end (20 seconds)
    const blueTimeline = videoData.blueScoreTimeline || [];
    const redTimeline = videoData.redScoreTimeline || [];
    
    const blueAtAuto = blueTimeline.find(e => e.timestamp >= MATCH_TIMING.AUTO_END);
    const redAtAuto = redTimeline.find(e => e.timestamp >= MATCH_TIMING.AUTO_END);
    
    blueAutoFuel = blueAtAuto?.score || 0;
    redAutoFuel = redAtAuto?.score || 0;
    
    if (blueAutoFuel === redAutoFuel) {
      useVideoMethod = false; // Tie - fall back to Basic Method
    }
  }
  
  // Separate teams by alliance (case-insensitive)
  const blueTimerData = allTimerData.filter(t => {
    const alliance = t.alliance;
    return alliance && alliance.toLowerCase() === 'blue';
  });
  const redTimerData = allTimerData.filter(t => {
    const alliance = t.alliance;
    return alliance && alliance.toLowerCase() === 'red';
  });
  
  console.log('calculateFuelScored: Found timer data:', allTimerData.length, 'teams');
  console.log('calculateFuelScored: Blue teams:', blueTimerData.length, 'Red teams:', redTimerData.length);
  console.log('calculateFuelScored: hasVideoData:', hasVideoData, 'hasAllTimerData:', hasAllTimerData, 'useVideoMethod:', useVideoMethod);
  
  const allResults = [];
  
  if (useVideoMethod) {
    // Video Method
    // Determine HUB active periods
    const blueFiltered = filterFuelIncrements(videoData.blueScoreTimeline || []);
    const redFiltered = filterFuelIncrements(videoData.redScoreTimeline || []);
    
    // For video method: use video score data to get auto scores
    // For basic method: query fuelScoutData
    let blueAutoFuel = 0;
    let redAutoFuel = 0;
    
    if (useVideoMethod) {
      // Get auto scores for HUB determination from video data
      const blueTimeline = videoData.blueScoreTimeline || [];
      const redTimeline = videoData.redScoreTimeline || [];
      
      const blueAtAuto = blueTimeline.find(e => e.timestamp >= MATCH_TIMING.AUTO_END);
      const redAtAuto = redTimeline.find(e => e.timestamp >= MATCH_TIMING.AUTO_END);
      
      blueAutoFuel = blueAtAuto?.score || 0;
      redAutoFuel = redAtAuto?.score || 0;
    }
    
    const hubPeriods = determineHubActivePeriods(blueAutoFuel, redAutoFuel);
    
    // Process blue alliance
    if (blueTimerData.length > 0) {
      const blueResults = await processAllianceVideoMethod(
        blueTimerData,
        blueFiltered,
        hubPeriods.blue,
        matchNumber
      );
      allResults.push(...blueResults);
    }
    
    // Process red alliance
    if (redTimerData.length > 0) {
      const redResults = await processAllianceVideoMethod(
        redTimerData,
        redFiltered,
        hubPeriods.red,
        matchNumber
      );
      allResults.push(...redResults);
    }
  } else {
    // Basic Method
    const allFuelData = await getFuelScoutData(matchNumber);
    
    const blueFuelData = allFuelData.filter(f => {
      const alliance = f.alliance;
      return alliance && alliance.toLowerCase() === 'blue';
    });
    const redFuelData = allFuelData.filter(f => {
      const alliance = f.alliance;
      return alliance && alliance.toLowerCase() === 'red';
    });
    
    // Process blue alliance
    if (blueTimerData.length > 0) {
      const blueResults = await processAllianceBasicMethod(
        blueFuelData,
        blueTimerData,
        matchNumber
      );
      allResults.push(...blueResults);
    }
    
    // Process red alliance
    if (redTimerData.length > 0) {
      const redResults = await processAllianceBasicMethod(
        redFuelData,
        redTimerData,
        matchNumber
      );
      allResults.push(...redResults);
    }
  }
  
  console.log('calculateFuelScored: Final results:', allResults.length, 'teams');
  return allResults;
}

export default calculateFuelScored;
