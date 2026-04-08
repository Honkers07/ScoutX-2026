import { collection, onSnapshot, doc, setDoc, getDocs, query, where } from "firebase/firestore";
import firebase from "../firebase";
import { calculateFuelScored } from "./FuelCalculator";

// Debounce map to prevent multiple calculations for the same match
const pendingCalculations = new Map();

/**
 * Get weight based on data quality color range
 * Matches the pattern in TeamMatches.js
 */
const getQualityWeight = (quality) => {
  if (!quality || quality < 0.5) return 0.25;  // Red: 25%
  if (quality < 0.75) return 0.50;             // Yellow: 50%
  return 1.0;                                   // Green: 100%
};

/**
 * Get all unique scouterTeam values from timerScoutData for a match
 */
async function getUniqueScouterTeams(matchNumber) {
  const qy = query(
    collection(firebase, "timerScoutData"),
    where("match", "==", String(matchNumber))
  );
  const snap = await getDocs(qy);
  
  const scouterTeams = new Set();
  snap.forEach((doc) => {
    const data = doc.data();
    if (data.scouterTeam) {
      scouterTeams.add(String(data.scouterTeam));
    }
  });
  
  return Array.from(scouterTeams);
}

/**
 * Aggregate results from multiple scouter teams using weighted averaging
 */
function aggregateScouterResults(resultsByTeam) {
  // resultsByTeam is an array where each entry has {team, quality, metrics...}
  // Group by team number
  const teamGroups = new Map();
  
  for (const result of resultsByTeam) {
    const teamNum = result.team ?? result.teamNumber;
    if (!teamNum) continue;
    
    if (!teamGroups.has(teamNum)) {
      teamGroups.set(teamNum, []);
    }
    teamGroups.get(teamNum).push(result);
  }
  
  const aggregated = [];
  
  for (const [teamNumber, entries] of teamGroups) {
    if (entries.length === 1) {
      // Only one scouter - no need to average
      const entry = entries[0];
      aggregated.push({
        teamNumber,
        team: teamNumber,
        alliance: entry.alliance ?? "",
        autoFuel: entry.autoFuel ?? 0,
        teleFuel: entry.teleFuel ?? 0,
        totalFuel: entry.totalFuel ?? 0,
        ballsPerSec: entry.ballsPerSec ?? entry.ballsPerSecond ?? 0,
        ballsPerSecond: entry.ballsPerSecond ?? entry.ballsPerSec ?? 0,
        shootingTime: entry.shootingTime ?? 0,
        confidence: entry.confidence ?? 0,
        accuracy: entry.accuracy ?? 0,
        quality: entry.quality ?? 0,
        autoClimb: entry.autoClimb ?? 0,
        teleClimb: entry.teleClimb ?? 0,
        quickFeedback: entry.quickFeedback ?? [],
        defenseMetric: entry.defenseMetric ?? -1,
        scouterCount: 1,
      });
      continue;
    }
    
    // Multiple scouters - calculate weighted averages
    let totalWeight = 0;
    const weightedSums = {};
    const trueWeights = {};
    const falseWeights = {};
    
    // Initialize accumulators based on first entry's keys
    const firstEntry = entries[0];
    const metricKeys = Object.keys(firstEntry).filter(k => 
      k !== 'team' && k !== 'teamNumber' && k !== 'alliance' && k !== 'method' && k !== 'scouterCount'
    );
    
    for (const key of metricKeys) {
      if (typeof firstEntry[key] === 'number') {
        weightedSums[key] = 0;
      } else if (typeof firstEntry[key] === 'boolean') {
        trueWeights[key] = 0;
        falseWeights[key] = 0;
      }
    }
    
    // Accumulate weighted values
    for (const entry of entries) {
      const quality = entry.quality ?? 0;
      const weight = getQualityWeight(quality);
      totalWeight += weight;
      
      for (const key of metricKeys) {
        if (typeof entry[key] === 'number') {
          weightedSums[key] = (weightedSums[key] ?? 0) + (entry[key] * weight);
        } else if (typeof entry[key] === 'boolean') {
          if (entry[key]) {
            trueWeights[key] = (trueWeights[key] ?? 0) + weight;
          } else {
            falseWeights[key] = (falseWeights[key] ?? 0) + weight;
          }
        }
      }
    }
    
    // Calculate final aggregated metrics
    const aggregatedEntry = {
      teamNumber,
      team: teamNumber,
      scouterCount: entries.length,
    };
    
    for (const key of metricKeys) {
      if (typeof firstEntry[key] === 'number') {
        aggregatedEntry[key] = totalWeight > 0 
          ? weightedSums[key] / totalWeight 
          : 0;
      } else if (typeof firstEntry[key] === 'boolean') {
        // If tied, assume positive (to not underestimate)
        const tw = trueWeights[key] ?? 0;
        const fw = falseWeights[key] ?? 0;
        aggregatedEntry[key] = tw >= fw;
      } else {
        // String or other types - keep first value
        aggregatedEntry[key] = firstEntry[key];
      }
    }
    
    aggregated.push(aggregatedEntry);
  }
  
  return aggregated;
}

/**
 * Updates matchData document for a given match number.
 * Uses calculateFuelScored to calculate metrics and saves to matchData collection.
 * Now handles multiple scouter teams per match with weighted averaging.
 *
 * @param {string|number} matchNumber - The match number to update data for
 * @returns {Promise<boolean>} - Returns true if successful, false otherwise
 */
export async function updateMatchData(matchNumber) {
  if (!matchNumber) {
    console.warn("[updateMatchData] No matchNumber provided");
    return false;
  }

  // Debounce: skip if already processing this match
  if (pendingCalculations.has(matchNumber)) {
    console.log(
      `[updateMatchData] Skipping - already processing match ${matchNumber}`
    );
    return false;
  }

  pendingCalculations.set(matchNumber, true);

  try {
    console.log(
      `[updateMatchData] Getting unique scouter teams for match ${matchNumber}...`
    );

    // Get all unique scouterTeam values
    const scouterTeams = await getUniqueScouterTeams(matchNumber);
    console.log(`[updateMatchData] Found ${scouterTeams.length} scouter teams:`, scouterTeams);
    
    if (scouterTeams.length === 0) {
      console.log(`[updateMatchData] No timerScoutData for match ${matchNumber}`);
      return false;
    }

    // Calculate fuel metrics for each scouter team
    const allResults = [];
    for (const scouterTeam of scouterTeams) {
      console.log(`[updateMatchData] Calculating for scouterTeam ${scouterTeam}...`);
      try {
        const results = await calculateFuelScored(matchNumber, scouterTeam);
        if (results && results.length > 0) {
          console.log(`[updateMatchData] Got ${results.length} results from scouterTeam ${scouterTeam}`);
          allResults.push(...results);
        }
      } catch (err) {
        console.error(`[updateMatchData] Error calculating for scouterTeam ${scouterTeam}:`, err);
      }
    }

    console.log(`[updateMatchData] Total results before aggregation: ${allResults.length}`);

    if (allResults.length === 0) {
      console.log(`[updateMatchData] No results for match ${matchNumber}`);
      return false;
    }

    // Aggregate results from multiple scouter teams
    const aggregatedResults = aggregateScouterResults(allResults);
    console.log(
      `[updateMatchData] Aggregation complete for match ${matchNumber}, got ${aggregatedResults.length} team results`
    );

    // Transform to matchData format
    const matchDataDoc = {
      matchNumber: Number(matchNumber),
      teams: aggregatedResults.map((r) => ({
        teamNumber: r.teamNumber ?? r.team ?? 0,
        alliance: r.alliance ?? "",
        autoFuel: r.autoFuel ?? 0,
        teleFuel: r.teleFuel ?? 0,
        totalFuel: r.totalFuel ?? 0,
        ballsPerSecond: r.ballsPerSec ?? r.ballsPerSecond ?? 0,
        shootingTime: r.shootingTime ?? 0,
        confidence: r.confidence ?? 0,
        accuracy: r.accuracy ?? 0,
        quality: r.quality ?? 0,
        autoClimb: r.autoClimb ?? 0,
        teleClimb: r.teleClimb ?? 0,
        quickFeedback: r.quickFeedback ?? [],
        defenseMetric: r.defenseMetric ?? -1,
        scouterCount: r.scouterCount ?? 1,
      })),
      lastUpdated: Date.now(),
      calculationMethod: "multi-team-weighted-average",
    };

    // Submit to matchData collection
    console.log("[updateMatchData] Saving matchData for match", matchNumber);
    try {
      await setDoc(
        doc(firebase, "matchData", String(matchNumber)),
        matchDataDoc,
        { merge: true }
      );
      console.log("[updateMatchData] Successfully saved");
    } catch (saveError) {
      console.error("[updateMatchData] Save error:", saveError);
    }

    console.log(
      `[updateMatchData] Successfully saved matchData for match ${matchNumber}`
    );
    return true;
  } catch (error) {
    console.error(
      `[updateMatchData] Error calculating fuel for match ${matchNumber}:`,
      error
    );
    return false;
  } finally {
    pendingCalculations.delete(matchNumber);
  }
}

/**
 * Sets up a Firebase listener that watches for changes to timerScoutData.
 * Calls updateMatchData whenever a new document is added to timerScoutData.
 *
 * @returns {Function} - Cleanup function to unsubscribe from the listener
 */
export function fuelListener() {
  const unsubscribe = onSnapshot(
    collection(firebase, "timerScoutData"),
    (snapshot) => {
      // Check for new docs (added since last snapshot)
      for (const change of snapshot.docChanges()) {
        if (change.type === "added") {
          const timerDoc = change.doc.data();
          const matchNumber = timerDoc.match || timerDoc.matchNumber;

          if (matchNumber) {
            console.log(
              `[fuelListener] New timerScoutData detected for match ${matchNumber}, calling updateMatchData...`
            );

            // Call updateMatchData when new timerScoutData is added
            updateMatchData(matchNumber);
          }
        }
      }
    },
    (error) => {
      console.error("[fuelListener] Error listening to timerScoutData:", error);
    }
  );

  return unsubscribe;
}

export default fuelListener;
