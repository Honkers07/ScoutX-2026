import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";
import firebase from "../firebase";
import { calculateFuelScored } from "./FuelCalculator";

// Debounce map to prevent multiple calculations for the same match
const pendingCalculations = new Map();

/**
 * Updates matchData document for a given match number.
 * Uses calculateFuelScored to calculate metrics and saves to matchData collection.
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
      `[updateMatchData] Calculating fuel metrics for match ${matchNumber}...`
    );

    // Calculate fuel metrics using calculateFuelScored
    const results = await calculateFuelScored(matchNumber);

    if (results && results.length > 0) {
      console.log(
        `[updateMatchData] Calculation complete for match ${matchNumber}, got ${results.length} team results`
      );

      // Transform to matchData format
      const matchDataDoc = {
        matchNumber: Number(matchNumber),
        teams: results.map((r) => ({
          teamNumber: r.team ?? r.teamNumber ?? 0,
          alliance: r.alliance ?? "",
          autoFuel: r.autoFuel ?? 0,
          teleFuel: r.teleFuel ?? 0,
          totalFuel: r.totalFuel ?? 0,
          ballsPerSecond: r.ballsPerSec ?? r.ballsPerSecond ?? 0,
          shootingTime: r.shootingTime ?? 0,
          confidence: r.confidence ?? 0,
        })),
        lastUpdated: Date.now(),
        calculationMethod: results[0]?.method ?? "unknown",
      };

      // Submit to matchData collection
      await setDoc(
        doc(firebase, "matchData", String(matchNumber)),
        matchDataDoc,
        { merge: true }
      );

      console.log(
        `[updateMatchData] Successfully saved matchData for match ${matchNumber}`
      );
      return true;
    } else {
      console.log(
        `[updateMatchData] No results for match ${matchNumber} - may need more data (timerScoutData, videoScoreData, or fuelScoutData)`
      );
      return false;
    }
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
