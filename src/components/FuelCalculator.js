import firebase from "../firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc 
} from "firebase/firestore";

// FRC 2026 Match Timing Constants (in seconds from start of match)
const MATCH_TIMING = {
  AUTO_END: 20,           // AUTO ends at 20 seconds
  TRANSITION_END: 30,    // TRANSITION ends at 30 seconds
  SHIFT1_END: 55,        // SHIFT 1 ends at 55 seconds
  SHIFT2_END: 80,        // SHIFT 2 ends at 80 seconds
  SHIFT3_END: 105,       // SHIFT 3 ends at 105 seconds
  SHIFT4_END: 130,       // SHIFT 4 ends at 130 seconds
  END_GAME_END: 150,     // END GAME ends at 150 seconds (full match)
  TOTAL_DURATION: 150
};

// Delay calculation constant
const DELAY_BASE = 3;
const DELAY_RATE = 0.2;

// Score increment threshold - ignore increments of 5 (likely fouls or other point sources)
const IGNORE_SCORE_INCREMENTS = [5];

// Minimum gap between shooting times to be considered separate (1 second)
const MIN_SHOOTING_GAP = 1;

/**
 * Calculates the scoreboard delay based on shooting time
 * @param {number} shootingTime - Time spent shooting in seconds
 * @returns {number} - Delay in seconds
 */
function calculateDelay(shootingTime) {
  return DELAY_BASE + (DELAY_RATE * shootingTime);
}

/**
 * Determines HUB active periods for each alliance based on AUTO results
 * @param {Object} videoScoreData - Video score data document
 * @returns {Object} - { red: [periods], blue: [periods] }
 */
function determineHubActivePeriods(videoScoreData) {
  const redAutoFuel = videoScoreData.redScoreTimeline
    ?.filter(t => t.time >= MATCH_TIMING.TOTAL_DURATION - MATCH_TIMING.AUTO_END)
    ?.reduce((sum, t) => sum + t.score, 0) || 0;
  
  const blueAutoFuel = videoScoreData.blueScoreTimeline
    ?.filter(t => t.time >= MATCH_TIMING.TOTAL_DURATION - MATCH_TIMING.AUTO_END)
    ?.reduce((sum, t) => sum + t.score, 0) || 0;

  // Both HUBS active during AUTO, TRANSITION, and END GAME
  const redActivePeriods = [];
  const blueActivePeriods = [];

  // AUTO: Both active (0-20)
  redActivePeriods.push({ start: 0, end: MATCH_TIMING.AUTO_END });
  blueActivePeriods.push({ start: 0, end: MATCH_TIMING.AUTO_END });

  // TRANSITION: Both active (20-30)
  redActivePeriods.push({ start: MATCH_TIMING.AUTO_END, end: MATCH_TIMING.TRANSITION_END });
  blueActivePeriods.push({ start: MATCH_TIMING.AUTO_END, end: MATCH_TIMING.TRANSITION_END });

  // END GAME: Both active (130-150)
  redActivePeriods.push({ start: MATCH_TIMING.SHIFT4_END, end: MATCH_TIMING.TOTAL_DURATION });
  blueActivePeriods.push({ start: MATCH_TIMING.SHIFT4_END, end: MATCH_TIMING.TOTAL_DURATION });

  // ALLIANCE SHIFTS: Alternate based on AUTO results
  if (redAutoFuel !== blueAutoFuel) {
    // Determine which alliance won AUTO
    const redWon = redAutoFuel > blueAutoFuel;
    
    // SHIFT 1 (30-55): Winner inactive, Loser active
    if (redWon) {
      blueActivePeriods.push({ start: MATCH_TIMING.TRANSITION_END, end: MATCH_TIMING.SHIFT1_END });
    } else {
      redActivePeriods.push({ start: MATCH_TIMING.TRANSITION_END, end: MATCH_TIMING.SHIFT1_END });
    }

    // SHIFT 2 (55-80): Alternate
    if (redWon) {
      redActivePeriods.push({ start: MATCH_TIMING.SHIFT1_END, end: MATCH_TIMING.SHIFT2_END });
    } else {
      blueActivePeriods.push({ start: MATCH_TIMING.SHIFT1_END, end: MATCH_TIMING.SHIFT2_END });
    }

    // SHIFT 3 (80-105): Alternate
    if (redWon) {
      blueActivePeriods.push({ start: MATCH_TIMING.SHIFT2_END, end: MATCH_TIMING.SHIFT3_END });
    } else {
      redActivePeriods.push({ start: MATCH_TIMING.SHIFT2_END, end: MATCH_TIMING.SHIFT3_END });
    }

    // SHIFT 4 (105-130): Alternate
    if (redWon) {
      redActivePeriods.push({ start: MATCH_TIMING.SHIFT3_END, end: MATCH_TIMING.SHIFT4_END });
    } else {
      blueActivePeriods.push({ start: MATCH_TIMING.SHIFT3_END, end: MATCH_TIMING.SHIFT4_END });
    }
  } else {
    // Tie: Use score increments during shifts to determine (random default if can't determine)
    // Default: Red active for odd shifts, Blue for even (or vice versa)
    // For simplicity, default to Red active first
    redActivePeriods.push({ start: MATCH_TIMING.TRANSITION_END, end: MATCH_TIMING.SHIFT1_END });
    blueActivePeriods.push({ start: MATCH_TIMING.SHIFT1_END, end: MATCH_TIMING.SHIFT2_END });
    redActivePeriods.push({ start: MATCH_TIMING.SHIFT2_END, end: MATCH_TIMING.SHIFT3_END });
    blueActivePeriods.push({ start: MATCH_TIMING.SHIFT3_END, end: MATCH_TIMING.SHIFT4_END });
  }

  return { red: redActivePeriods, blue: blueActivePeriods };
}

/**
 * Crops a time range to only include active HUB periods
 * @param {number} start - Start time
 * @param {number} end - End time
 * @param {Array} activePeriods - Array of {start, end} periods
 * @returns {Array} - Array of cropped periods
 */
function cropToActivePeriods(start, end, activePeriods) {
  const cropped = [];
  
  for (const period of activePeriods) {
    if (period.start >= end || period.end <= start) continue;
    
    const croppedStart = Math.max(start, period.start);
    const croppedEnd = Math.min(end, period.end);
    
    if (croppedEnd > croppedStart) {
      cropped.push({ start: croppedStart, end: croppedEnd });
    }
  }
  
  return cropped;
}

/**
 * Merges shooting times that are within MIN_SHOOTING_GAP seconds of each other
 * @param {Array} shootingTimes - Array of {startShootTime, endShootTime, duration}
 * @returns {Array} - Array of merged shooting times
 */
function mergeCloseShootingTimes(shootingTimes) {
  if (!shootingTimes || shootingTimes.length === 0) return [];
  
  // Sort by start time
  const sorted = [...shootingTimes].sort((a, b) => a.startShootTime - b.startShootTime);
  
  const merged = [];
  let current = { ...sorted[0] };
  
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    // Check if the gap between current end and next start is less than MIN_SHOOTING_GAP
    const gap = next.startShootTime - current.endShootTime;
    
    if (gap <= MIN_SHOOTING_GAP) {
      // Merge: extend current to include next
      current.endShootTime = next.endShootTime;
      current.duration = current.endShootTime - current.startShootTime;
    } else {
      // Push current and start new
      merged.push(current);
      current = { ...next };
    }
  }
  
  // Don't forget the last one
  merged.push(current);
  
  return merged;
}

/**
 * Finds time ranges where only one robot was shooting
 * @param {Array} shootingTimes - Array of {startShootTime, endShootTime} for a robot
 * @param {Array} otherShootingTimes - Array of shooting times for other robots on same alliance
 * @returns {Array} - Array of exclusive periods {start, end, duration}
 */
function findExclusivePeriods(shootingTimes, otherShootingTimes) {
  const exclusive = [];
  
  for (const time of shootingTimes) {
    let isExclusive = true;
    
    for (const other of otherShootingTimes) {
      // Check if time ranges overlap
      if (time.startShootTime < other.endShootTime && time.endShootTime > other.startShootTime) {
        isExclusive = false;
        break;
      }
    }
    
    if (isExclusive) {
      exclusive.push({
        start: time.startShootTime,
        end: time.endShootTime,
        duration: time.duration
      });
    }
  }
  
  return exclusive;
}

/**
 * Gets fuel scored during a time range from score timeline
 * @param {Array} timeline - Score timeline array
 * @param {number} start - Start time (seconds from match end, like timer)
 * @param {number} end - End time
 * @returns {number} - Fuel scored during the period
 */
function getFuelDuringPeriod(timeline, start, end) {
  if (!timeline) return 0;
  
  // Timer counts down, so lower time = later in match
  // Convert to match time (0 = start, 150 = end)
  const matchStart = MATCH_TIMING.TOTAL_DURATION - end;
  const matchEnd = MATCH_TIMING.TOTAL_DURATION - start;
  
  return timeline
    .filter(t => {
      // Skip score increments of 5 (likely fouls or other point sources)
      if (IGNORE_SCORE_INCREMENTS.includes(t.score)) return false;
      
      const tMatchTime = MATCH_TIMING.TOTAL_DURATION - t.time;
      return tMatchTime >= matchStart && tMatchTime < matchEnd;
    })
    .reduce((sum, t) => sum + t.score, 0);
}

/**
 * Calculates fuel scored using Video Method (requires all 6 teams)
 * @param {Object} videoScoreData - Video score data document
 * @param {Array} timerScoutData - Array of timer scout documents
 * @returns {Array} - Array of {team, match, autoFuel, teleFuel}
 */
function calculateWithVideoMethod(videoScoreData, timerScoutData) {
  const results = [];
  
  // Determine HUB active periods
  const hubPeriods = determineHubActivePeriods(videoScoreData);
  
  // Group by alliance
  const redTeams = timerScoutData.filter(t => t.alliance === 'red');
  const blueTeams = timerScoutData.filter(t => t.alliance === 'blue');
  
  // Process each team
  const processAlliance = (teams, alliance) => {
    const activePeriods = hubPeriods[alliance];
    
    for (const teamDoc of teams) {
      const team = teamDoc.team;
      const shootingTimes = teamDoc.shootingTimes || [];
      
      // Crop shooting times to active HUB periods
      const croppedTimes = [];
      for (const time of shootingTimes) {
        const cropped = cropToActivePeriods(
          time.startShootTime,
          time.endShootTime,
          activePeriods
        );
        croppedTimes.push(...cropped);
      }
      
      // Merge shooting times that are within 1 second of each other
      const mergedTimes = mergeCloseShootingTimes(
        croppedTimes.map(t => ({ startShootTime: t.start, endShootTime: t.end, duration: t.end - t.start }))
      );
      
      // Find exclusive periods
      const otherTeams = teams.filter(t => t.team !== team);
      const otherTimes = otherTeams.flatMap(t => t.shootingTimes || []);
      const exclusivePeriods = findExclusivePeriods(mergedTimes, otherTimes);
      
      // Calculate fuel/second rate from exclusive periods
      let fuelPerSecond = 0;
      if (exclusivePeriods.length > 0) {
        let totalFuel = 0;
        let totalTime = 0;
        
        for (const period of exclusivePeriods) {
          const delay = calculateDelay(period.duration);
          const fuel = getFuelDuringPeriod(
            alliance === 'red' ? videoScoreData.redScoreTimeline : videoScoreData.blueScoreTimeline,
            period.start,
            period.end + delay
          );
          totalFuel += fuel;
          totalTime += period.duration;
        }
        
        fuelPerSecond = totalTime > 0 ? totalFuel / totalTime : 0;
      }
      
      // Calculate total fuel for this team
      let autoFuel = 0;
      let teleFuel = 0;
      
      for (const time of mergedTimes) {
        const delay = calculateDelay(time.end - time.start);
        const fuel = getFuelDuringPeriod(
          alliance === 'red' ? videoScoreData.redScoreTimeline : videoScoreData.blueScoreTimeline,
          time.start,
          time.end + delay
        );
        
        // Determine if AUTO or TELEOP
        if (time.start >= MATCH_TIMING.TOTAL_DURATION - MATCH_TIMING.AUTO_END) {
          // In AUTO (last 20 seconds of countdown = first 20 seconds of match)
          autoFuel += fuel;
        } else {
          teleFuel += fuel;
        }
      }
      
      // If no exclusive periods, use proportional distribution
      if (exclusivePeriods.length === 0 && mergedTimes.length > 0) {
        // All times were overlapping with others - use average rate from alliance
        // This is a simplified approach
        const allianceTotalFuel = alliance === 'red' 
          ? videoScoreData.redTotalScore 
          : videoScoreData.blueTotalScore;
        const allianceTotalTime = teams.reduce((sum, t) => 
          sum + (t.shootingTimes || []).reduce((s, time) => s + time.duration, 0), 0
        );
        
        const teamTotalTime = mergedTimes.reduce((sum, t) => sum + (t.end - t.start), 0);
        const avgRate = allianceTotalTime > 0 ? allianceTotalFuel / allianceTotalTime : 0;
        
        autoFuel = 0; // Would need more complex distribution
        teleFuel = teamTotalTime * avgRate;
      }
      
      results.push({
        team,
        match: videoScoreData.match,
        autoFuel,
        teleFuel,
        method: 'video'
      });
    }
  };
  
  processAlliance(redTeams, 'red');
  processAlliance(blueTeams, 'blue');
  
  return results;
}

/**
 * Calculates fuel scored using Basic Method (fallback)
 * @param {Array} fuelScoutData - Array of fuel scout documents
 * @param {Array} timerScoutData - Array of timer scout documents
 * @param {number} matchNumber - Match number
 * @returns {Array} - Array of {team, match, autoFuel, teleFuel}
 */
function calculateWithBasicMethod(fuelScoutData, timerScoutData, matchNumber) {
  const results = [];
  
  // Group timer data by team
  const timerByTeam = {};
  for (const doc of timerScoutData) {
    timerByTeam[doc.team] = doc;
  }
  
  for (const fuelDoc of fuelScoutData) {
    const team = fuelDoc.team;
    const timerDoc = timerByTeam[team];
    
    if (!timerDoc || !timerDoc.shootingTimes) continue;
    
    // Calculate total fuel
    const fuelScored = fuelDoc.fuelScored || [];
    const totalFuel = fuelScored.reduce((sum, val) => sum + val, 0);
    
    // Calculate time in AUTO vs TELEOP
    let autoTime = 0;
    let teleTime = 0;
    
    for (const time of timerDoc.shootingTimes) {
      // Convert timer values to match time
      const startMatchTime = MATCH_TIMING.TOTAL_DURATION - time.startShootTime;
      const endMatchTime = MATCH_TIMING.TOTAL_DURATION - time.endShootTime;
      
      if (startMatchTime >= MATCH_TIMING.AUTO_END) {
        // Entirely in AUTO
        autoTime += time.duration;
      } else if (endMatchTime <= MATCH_TIMING.AUTO_END) {
        // Entirely in TELEOP
        teleTime += time.duration;
      } else {
        // Spans both
        const autoPortion = Math.min(MATCH_TIMING.AUTO_END, endMatchTime) - startMatchTime;
        const telePortion = time.duration - autoPortion;
        autoTime += Math.max(0, autoPortion);
        teleTime += Math.max(0, telePortion);
      }
    }
    
    const totalTime = autoTime + teleTime;
    
    // Distribute fuel proportionally
    const autoFuel = totalTime > 0 ? Math.round(totalFuel * (autoTime / totalTime)) : 0;
    const teleFuel = totalFuel - autoFuel;
    
    results.push({
      team,
      match: matchNumber,
      autoFuel,
      teleFuel,
      method: 'basic'
    });
  }
  
  return results;
}

/**
 * Calculates fuelScored for all teams in a given match
 * @param {number} matchNumber - The match number to calculate fuel for
 * @returns {Promise<Array<{team: number, match: number, autoFuel: number, teleFuel: number, method: string}>>}
 */
export default async function calculateFuelScored(matchNumber) {
  try {
    console.log("Starting fuel calculation for match:", matchNumber);
    
    // Query videoScoreData - docs are named by match number (e.g., "1")
    const videoDocRef = doc(firebase, "videoScoreData", String(matchNumber));
    console.log("Getting videoScoreData doc:", matchNumber);
    const videoDoc = await getDoc(videoDocRef);
    console.log("videoScoreData exists:", videoDoc.exists());
    
    // Query timerScoutData - docs are named as "team_match" (e.g., "1768_1")
    // Get all docs first to debug
    const allTimerDocs = await getDocs(collection(firebase, "timerScoutData"));
    console.log("All timerScoutData getDocs result:", allTimerDocs);
    console.log("All timerScoutData docs:", allTimerDocs.docs.map(d => d.id));
    console.log("All timerScoutData size:", allTimerDocs.size);
    
    // Filter to only docs that end with "_matchNumber"
    console.log("matchNumber:", matchNumber, "type:", typeof matchNumber);
    console.log("Testing filter: '1768_1'.endsWith('_' + matchNumber):", '1768_1'.endsWith('_' + matchNumber));
    const timerScoutData = allTimerDocs.docs
      .filter(d => {
        const result = d.id.endsWith("_" + matchNumber);
        console.log("Doc ID:", d.id, "matches:", result);
        return result;
      })
      .map(d => ({ id: d.id, ...d.data() }));
    console.log("Filtered timerScoutData for match " + matchNumber + ":", timerScoutData);
    
    // Check if we can use Video Method (need all 6 teams)
    if (videoDoc.exists() && timerScoutData.length === 6) {
      console.log("Using Video Method");
      const videoData = { id: videoDoc.id, ...videoDoc.data() };
      console.log("videoData:", videoData);
      return calculateWithVideoMethod(videoData, timerScoutData);
    }
    
    console.log("Cannot use Video Method, checking for Basic Method");
    console.log("videoDoc exists:", videoDoc.exists());
    console.log("timerScoutData.length:", timerScoutData.length);
    
    // Fall back to Basic Method
    // Query fuelScoutData - docs are named as "team_match"
    const allFuelDocs = await getDocs(collection(firebase, "fuelScoutData"));
    console.log("All fuelScoutData getDocs result:", allFuelDocs);
    console.log("All fuelScoutData docs:", allFuelDocs.docs.map(d => d.id));
    console.log("All fuelScoutData size:", allFuelDocs.size);
    
    // Filter to only docs that end with "_matchNumber"
    const fuelScoutData = allFuelDocs.docs
      .filter(d => d.id.endsWith("_" + matchNumber))
      .map(d => ({ id: d.id, ...d.data() }));
    console.log("Filtered fuelScoutData for match " + matchNumber + ":", fuelScoutData);
    
    return calculateWithBasicMethod(fuelScoutData, timerScoutData, matchNumber);
    
  } catch (error) {
    console.error("Error calculating fuel scored:", error);
    throw error;
  }
}
