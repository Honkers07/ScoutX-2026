// FuelCalculatorTuner.js - Auto-tuning for FuelCalculator constants
import {
  setConstants,
  getConstants,
  calculateFuelScored,
} from "./FuelCalculator";

/**
 * Tunes the FuelCalculator constants to best match the actual fuel scored
 * Only tunes: SCOUTER_DELAY (START, END) and SCOREBOARD (START, END, RATE)
 * @param {number} matchNumber - The match number
 * @param {number} targetRedFuel - Actual red alliance total fuel scored
 * @param {number} targetBlueFuel - Actual blue alliance total fuel scored
 * @returns {object} - Best constants found and the error
 */
export async function tuneFuelCalculator(
  matchNumber,
  targetRedFuel,
  targetBlueFuel
) {
  const m = Number(matchNumber);

  console.log("========================================");
  console.log("FUEL CALCULATOR TUNER");
  console.log("========================================");
  console.log(`Match Number: ${m}`);
  console.log(`Target Red Fuel: ${targetRedFuel}`);
  console.log(`Target Blue Fuel: ${targetBlueFuel}`);
  console.log(
    "Tuning: SCOUTER_DELAY (START, END) and SCOREBOARD (START, END, RATE)"
  );

  // Get original constants to restore later
  const originalConstants = getConstants();
  console.log("Original constants:");
  console.log(
    `  SCOUTER_DELAY: START=${originalConstants.SCOUTER_DELAY.START}, END=${originalConstants.SCOUTER_DELAY.END}`
  );
  console.log(
    `  SCOREBOARD: START=${originalConstants.SCOREBOARD.START}, END=${originalConstants.SCOREBOARD.END}, RATE=${originalConstants.SCOREBOARD.RATE}`
  );
  console.log("----------------------------------------");

  // First, test if calculation works at all with default constants
  console.log("Testing default calculation...");
  const defaultResult = await calculateFuelScored(m);
  console.log("Default result:", defaultResult);

  if (!defaultResult || defaultResult.length === 0) {
    console.log(
      "ERROR: Default calculation returns empty! Cannot tune without valid baseline."
    );
    return {
      error: "Default calculation returns empty. Check if match data exists.",
      bestConstants: null,
      result: null,
    };
  }

  // Calculate default totals
  let defaultRed = 0,
    defaultBlue = 0;
  for (const r of defaultResult) {
    if (r.alliance === "red") defaultRed += r.autoFuel + r.teleFuel;
    else if (r.alliance === "blue") defaultBlue += r.autoFuel + r.teleFuel;
  }
  console.log(`Default totals - Red: ${defaultRed}, Blue: ${defaultBlue}`);
  console.log("----------------------------------------");

  // Generate all combinations of constants (only SCOUTER_DELAY and SCOREBOARD)
  const combinations = generateCombinations();
  console.log(`Total combinations to test: ${combinations.length}`);
  console.log("========================================");
  console.log("STARTING TUNING...");
  console.log("========================================");

  let bestError = Infinity;
  let bestConstants = null;
  let bestResult = null;
  let tested = 0;
  let skipped = 0;

  const startTime = Date.now();

  for (let i = 0; i < combinations.length; i++) {
    const constants = combinations[i];

    // Progress update every 50 iterations
    if (i % 50 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const progress = ((i / combinations.length) * 100).toFixed(1);
      console.log(
        `[Progress: ${progress}% | ${i}/${
          combinations.length
        } | ${elapsed}s] Best error: ${bestError.toFixed(2)}`
      );
    }

    // Apply constants - only SCOUTER_DELAY and SCOREBOARD
    setConstants({
      SCOUTER_DELAY: {
        START: constants.SCOUTER_DELAY_START,
        END: constants.SCOUTER_DELAY_END,
      },
      SCOREBOARD: {
        START: constants.SCOREBOARD_START,
        END: constants.SCOREBOARD_END,
        RATE: constants.SCOREBOARD_RATE,
      },
    });

    // Verify constants were set
    const currentConstants = getConstants();

    try {
      // Run calculation with these constants
      const result = await calculateFuelScored(m);

      if (!result || result.length === 0) {
        skipped++;
        continue;
      }

      tested++;

      // Calculate totals by alliance
      let redFuel = 0;
      let blueFuel = 0;

      for (const r of result) {
        if (r.alliance === "red") {
          redFuel += r.autoFuel + r.teleFuel;
        } else if (r.alliance === "blue") {
          blueFuel += r.autoFuel + r.teleFuel;
        }
      }

      const redError = Math.abs(redFuel - targetRedFuel);
      const blueError = Math.abs(blueFuel - targetBlueFuel);
      const totalError = redError + blueError;

      if (totalError < bestError) {
        bestError = totalError;
        bestConstants = { ...constants };
        bestResult = {
          redFuel,
          blueFuel,
          targetRedFuel,
          targetBlueFuel,
          redError,
          blueError,
          totalError,
          teams: result,
        };

        console.log("----------------------------------------");
        console.log(`🎉 NEW BEST! Error: ${totalError.toFixed(2)}`);
        console.log(
          `   Red: ${redFuel} (target: ${targetRedFuel}, diff: ${redError})`
        );
        console.log(
          `   Blue: ${blueFuel} (target: ${targetBlueFuel}, diff: ${blueError})`
        );
        console.log(
          `   SCOUTER_DELAY: START=${constants.SCOUTER_DELAY_START}, END=${constants.SCOUTER_DELAY_END}`
        );
        console.log(
          `   SCOREBOARD: START=${constants.SCOREBOARD_START}, END=${constants.SCOREBOARD_END}, RATE=${constants.SCOREBOARD_RATE}`
        );
        console.log("----------------------------------------");
      }
    } catch (e) {
      skipped++;
      console.warn("Error:", e.message);
    }
  }

  // Restore original constants
  setConstants(originalConstants);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("========================================");
  console.log("TUNING COMPLETE");
  console.log("========================================");
  console.log(`Total time: ${totalTime}s`);
  console.log(`Combinations tested: ${tested}`);
  console.log(`Combinations skipped: ${skipped}`);
  console.log(`Best error: ${bestError.toFixed(2)}`);

  if (bestError === Infinity) {
    console.log("WARNING: No valid results found! Check if match data exists.");
    return {
      error: "No valid results found",
      bestConstants: null,
      result: null,
    };
  }

  console.log("----------------------------------------");
  console.log("BEST CONSTANTS FOUND:");
  console.log(
    `  SCOUTER_DELAY: START=${bestConstants.SCOUTER_DELAY_START}, END=${bestConstants.SCOUTER_DELAY_END}`
  );
  console.log(
    `  SCOREBOARD: START=${bestConstants.SCOREBOARD_START}, END=${bestConstants.SCOREBOARD_END}, RATE=${bestConstants.SCOREBOARD_RATE}`
  );
  console.log("----------------------------------------");
  console.log("RESULT DETAILS:");
  if (bestResult) {
    console.log(
      `   Red calculated: ${bestResult.redFuel} (target: ${bestResult.targetRedFuel})`
    );
    console.log(
      `   Blue calculated: ${bestResult.blueFuel} (target: ${bestResult.targetBlueFuel})`
    );
    console.log(`   Total error: ${bestResult.totalError.toFixed(2)}`);
  }
  console.log("========================================");

  return {
    bestConstants,
    error: bestError,
    result: bestResult,
    totalCombinations: combinations.length,
    tested,
    skipped,
    timeSeconds: totalTime,
  };
}

/**
 * Generates all combinations of SCOUTER_DELAY and SCOREBOARD constants
 */
function generateCombinations() {
  const combinations = [];

  // SCOUTER_DELAY values
  const SCOUTER_DELAY_START_values = [0, 0.25, 0.5, 0.75, 1.0];
  const SCOUTER_DELAY_END_values = [0, 0.25, 0.5, 0.75, 1.0];

  // SCOREBOARD values
  const SCOREBOARD_START_values = [0, 0.5, 1.0, 1.5, 2.0];
  const SCOREBOARD_END_values = [0, 1, 2, 3, 4, 5];
  const SCOREBOARD_RATE_values = [0, 0.02, 0.05, 0.1];

  for (const SCOUTER_DELAY_START of SCOUTER_DELAY_START_values) {
    for (const SCOUTER_DELAY_END of SCOUTER_DELAY_END_values) {
      for (const SCOREBOARD_START of SCOREBOARD_START_values) {
        for (const SCOREBOARD_END of SCOREBOARD_END_values) {
          for (const SCOREBOARD_RATE of SCOREBOARD_RATE_values) {
            // Skip if scoreStart >= scoreEnd (doesn't make sense)
            if (SCOREBOARD_START >= SCOREBOARD_END) continue;

            combinations.push({
              SCOUTER_DELAY_START,
              SCOUTER_DELAY_END,
              SCOREBOARD_START,
              SCOREBOARD_END,
              SCOREBOARD_RATE,
            });
          }
        }
      }
    }
  }

  return combinations;
}

export default tuneFuelCalculator;
