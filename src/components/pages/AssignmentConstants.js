// Default scouter pool - Extended to cover all 70 matches with proper shift distribution
// With 6 positions per match and 12 matches per shift, we need 35+ scouters
// Using 42 scouters allows for 7 shifts of 6 scouters each covering all matches
export const DEFAULT_SCOUTERS = [
  // First 10
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
  // Second 10
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
  // Third 10
  "Logan M",
  "Timofei",
  "Saara",
  "Shaurya",
  "Elana",
  "Charlie",
  "Avyank",
  "Wesley",
  "Dylan X",
  "Eric Y",
  // Additional scouters for full coverage (12 more = 42 total)
  "Jordan",
  "Morgan",
  "Casey",
  "Riley",
  "Quinn",
  "Avery",
  "Parker",
  "Hayden",
  "Jamie",
  "Taylor",
  "Skyler",
  "Reese",
];

// Slot positions
export const SLOT_POSITIONS = ["red1", "red2", "red3", "blue1", "blue2", "blue3"];

// Alliance colors
export const ALLIANCE_COLORS = {
  red1: "#e53935",
  red2: "#d32f2f",
  red3: "#c62828",
  blue1: "#1e88e5",
  blue2: "#1976d2",
  blue3: "#1565c0",
};

// Generate verification code from scouter name and match number
export const generateVerificationCode = (scouterName, matchNumber, alliance) => {
  if (!scouterName || !matchNumber) return "";
  const initials = scouterName.substring(0, 2).toUpperCase();
  const matchSuffix = matchNumber.toString().padStart(2, "0");
  const allianceChar = alliance?.toLowerCase() === "red" ? "R" : "B";
  return `${initials}${matchSuffix}${allianceChar}`;
};
