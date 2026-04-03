// Admin password for accessing admin features
export const ADMIN_PASSWORD = "972!";

// Number of scouters per match (3 red + 3 blue)
export const SCOUTERS_PER_MATCH = 6;

// Default scouter pool (used when no team is selected or as fallback)
export const DEFAULT_SCOUTER_POOL = [
  "Sophia", "Catie", "Aiden Y", "Aarav", "Eileen", "Ethan H", "Adrian", "Andrew", "Nova", "Ammar",
  "David", "Brian", "Anthony", "Ty", "Cyrus", "Nolan", "Dylan", "Aditya", "Alexander", "Ethan M",
  "Logan M", "Timofei", "Saara", "Shaurya", "Elana", "Charlie", "Avyank", "Wesley", "Dylan X", "Eric Y"
];

// Firestore collection names
export const COLLECTIONS = {
  MATCHES: "matches",
  SCOUTERS: "scouters",
  SHIFT_ASSIGNMENTS: "shiftAssignments",
  ASSIGNMENTS: "assignments",
  TEAMS: "teams",
};

// Local storage keys - base keys (team-specific versions will be created)
export const STORAGE_KEYS = {
  MATCHES: "eventMatches",
  EVENT_CODE: "eventCode",
  SHIFTS: "shifts",
  ASSIGNMENTS: "matchAssignments",
  SCOUTER_POOL: "scouterPool",
};

// Blue Alliance API configuration
export const TBA_API_BASE_URL = "https://www.thebluealliance.com/api/v3";

// Default shift size (number of scouters per shift)
export const DEFAULT_SHIFT_SIZE = 6;

/**
 * Get team-specific localStorage key
 */
export function getTeamStorageKey(baseKey, teamNumber) {
  return `${baseKey}_team${teamNumber}`;
}

/**
 * Get all base storage keys for reference
 */
export function getBaseStorageKeys() {
  return { ...STORAGE_KEYS };
}
