// Default scouter pool for FRC scouting
export const DEFAULT_SCOUTERS = [
  "Sophia",
  "Catie",
  "Aiden Y",
  "Aarav",
  "Eileen",
  "Ethan H",
  "Adrian",
  "Andrew",
  "Nova",
  "Ammar",
  "David",
  "Brian",
  "Anthony",
  "Ty",
  "Cyrus",
  "Nolan",
  "Dylan",
  "Aditya",
  "Alexander",
  "Ethan M",
  "Logan M",
  "Timofei",
  "Saara",
  "Shaurya",
  "Elana",
  "Charlie",
  "Avyank",
  "Dylan X",
  "Eric Y",
];

// Admin password for accessing admin features
export const ADMIN_PASSWORD = "972!";

// Number of scouters per match (3 red + 3 blue)
export const SCOUTERS_PER_MATCH = 6;

// Firestore collection names
export const COLLECTIONS = {
  MATCHES: "matches",
  SCOUTERS: "scouters",
  SHIFT_ASSIGNMENTS: "shiftAssignments",
  ASSIGNMENTS: "assignments",
};

// Local storage keys
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
