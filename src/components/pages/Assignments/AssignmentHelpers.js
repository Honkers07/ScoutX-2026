import { DEFAULT_SCOUTERS, STORAGE_KEYS, COLLECTIONS, DEFAULT_SHIFT_SIZE } from "./AssignmentConstants";
import firebase from "../../../firebase";
import { doc, setDoc, getDoc, collection, getDocs, query, where } from "firebase/firestore";

/**
 * Get the default scouter pool
 */
export function getDefaultScouterList() {
  return DEFAULT_SCOUTERS;
}

/**
 * Get scouter list from localStorage or default
 */
export function getScouterList() {
  const saved = localStorage.getItem(STORAGE_KEYS.SCOUTER_POOL);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Error parsing scouter pool:", e);
    }
  }
  return DEFAULT_SCOUTERS;
}

/**
 * Save scouter pool to localStorage
 */
export function saveScouterPool(scouters) {
  localStorage.setItem(STORAGE_KEYS.SCOUTER_POOL, JSON.stringify(scouters));
}

/**
 * Get all shifts from localStorage
 */
export function getShifts() {
  const saved = localStorage.getItem(STORAGE_KEYS.SHIFTS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Error parsing shifts:", e);
    }
  }
  return [];
}

/**
 * Save shifts to localStorage
 */
export function saveShifts(shifts) {
  localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
}

/**
 * Get all assignments from localStorage
 */
export function getAllAssignments() {
  const saved = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Error parsing assignments:", e);
    }
  }
  return {};
}

/**
 * Save assignments to localStorage
 */
export function saveAssignments(assignments) {
  localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(assignments));
}

/**
 * Get matches from localStorage
 */
export function getMatches() {
  const saved = localStorage.getItem(STORAGE_KEYS.MATCHES);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Error parsing matches:", e);
    }
  }
  return [];
}

/**
 * Save matches to localStorage
 */
export function saveMatches(matches) {
  localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(matches));
}

/**
 * Get event code from localStorage
 */
export function getEventCode() {
  return localStorage.getItem(STORAGE_KEYS.EVENT_CODE) || "";
}

/**
 * Save event code to localStorage
 */
export function saveEventCode(eventCode) {
  localStorage.setItem(STORAGE_KEYS.EVENT_CODE, eventCode);
}

/**
 * Generate shifts based on scouter pool and match count
 */
export function generateShifts(scouters, matchCount) {
  const shiftSize = Math.min(DEFAULT_SHIFT_SIZE, scouters.length);
  const numberOfShifts = Math.floor(scouters.length / shiftSize);
  
  if (numberOfShifts === 0) {
    return [];
  }

  const matchesPerShift = Math.floor(matchCount / numberOfShifts);
  const extraMatches = matchCount % numberOfShifts;

  const shifts = [];
  let currentMatch = 1;

  for (let i = 0; i < numberOfShifts; i++) {
    const shiftMatchCount = matchesPerShift + (i < extraMatches ? 1 : 0);
    const endMatch = currentMatch + shiftMatchCount - 1;

    // Distribute scouters evenly across the shift
    const startScouterIndex = i * shiftSize;
    const shiftScouters = scouters.slice(startScouterIndex, startScouterIndex + shiftSize);

    const scouterPositions = shiftScouters.map((name, index) => {
      const position = index + 1;
      const isRed = position <= 3;
      return {
        name,
        position,
        alliance: isRed ? "Red" : "Blue",
        slot: isRed ? `red${position}` : `blue${position}`,
      };
    });

    shifts.push({
      id: i + 1,
      startMatch: currentMatch,
      endMatch: endMatch,
      matchCount: shiftMatchCount,
      scouterPositions,
      scouterNames: shiftScouters,
    });

    currentMatch = endMatch + 1;
  }

  return shifts;
}

/**
 * Regenerate assignments from shifts
 */
export function regenerateAssignmentsFromShifts() {
  const shifts = getShifts();
  const matches = getMatches();

  if (shifts.length === 0 || matches.length === 0) {
    console.warn("No shifts or matches to generate assignments from");
    return;
  }

  const assignments = {};

  // Initialize assignments for each scouter
  shifts.forEach((shift) => {
    shift.scouterPositions.forEach((scouter) => {
      if (!assignments[scouter.name]) {
        assignments[scouter.name] = [];
      }
    });
  });

  // Assign matches to scouters based on their shift
  matches.forEach((match) => {
    const matchNum = match.matchNumber;
    
    // Find which shift this match belongs to
    const shift = shifts.find((s) => matchNum >= s.startMatch && matchNum <= s.endMatch);
    
    if (!shift) return;

    // Assign each scouter position to this match
    shift.scouterPositions.forEach((scouter) => {
      // For red alliance: positions 1,2,3 map to indices 0,1,2
      // For blue alliance: positions 4,5,6 map to indices 0,1,2
      const teamIndex = scouter.alliance === "Red" 
        ? scouter.position - 1 
        : scouter.position - 4;
      
      const teamNumber = scouter.alliance === "Red" 
        ? match.redTeams?.[teamIndex] 
        : match.blueTeams?.[teamIndex];

      assignments[scouter.name].push({
        match: matchNum,
        team: teamNumber,
        alliance: scouter.alliance,
        position: scouter.position,
        completed: false,
        verificationCode: generateVerificationCode(scouter.name, matchNum, scouter.alliance),
      });
    });
  });

  // Sort assignments by match number for each scouter
  Object.keys(assignments).forEach((scouter) => {
    assignments[scouter].sort((a, b) => a.match - b.match);
  });

  saveAssignments(assignments);
  
  // Dispatch event for UI update
  window.dispatchEvent(new Event("assignmentsUpdated"));
}

/**
 * Generate verification code for a scouter's assignment
 * Format: [initials][match suffix][alliance char]
 * Example: Alex + Match 12 + Red → AX12R
 */
export function generateVerificationCode(name, matchNumber, alliance) {
  const initials = name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
  const matchSuffix = matchNumber.toString().slice(-2);
  const allianceChar = alliance.charAt(0).toUpperCase();
  return `${initials}${matchSuffix}${allianceChar}`;
}

/**
 * Get the next pending assignment for a scouter
 */
export function getNextAssignment(name) {
  const assignments = getAllAssignments();
  const scouterAssignments = assignments[name];
  
  if (!scouterAssignments || scouterAssignments.length === 0) {
    return null;
  }

  // Find first incomplete assignment
  const next = scouterAssignments.find((a) => !a.completed);
  return next || null;
}

/**
 * Get assignment for a specific match
 */
export function getAssignmentForScouter(name, matchNumber) {
  const assignments = getAllAssignments();
  const scouterAssignments = assignments[name];
  
  if (!scouterAssignments) {
    return null;
  }

  return scouterAssignments.find((a) => a.match === matchNumber);
}

/**
 * Mark an assignment as completed
 */
export function markAssignmentComplete(name, matchNumber) {
  const assignments = getAllAssignments();
  
  if (!assignments[name]) {
    return;
  }

  const assignmentIndex = assignments[name].findIndex((a) => a.match === matchNumber);
  
  if (assignmentIndex !== -1) {
    assignments[name][assignmentIndex].completed = true;
    saveAssignments(assignments);
    
    // Dispatch event for UI update
    window.dispatchEvent(new Event("assignmentsUpdated"));
  }
}

/**
 * Update a scouter in a shift
 */
export function updateShiftScouter(shiftIndex, positionIndex, newName) {
  const shifts = getShifts();
  
  if (!shifts[shiftIndex]) {
    return;
  }

  // Update the scouter at the specified position
  shifts[shiftIndex].scouterPositions[positionIndex].name = newName;
  const isRed = positionIndex < 3;
  shifts[shiftIndex].scouterPositions[positionIndex].alliance = isRed ? "Red" : "Blue";
  shifts[shiftIndex].scouterPositions[positionIndex].slot = isRed ? `red${positionIndex + 1}` : `blue${positionIndex + 1}`;
  
  // Update scouter names array
  shifts[shiftIndex].scouterNames = shifts[shiftIndex].scouterPositions.map((s) => s.name);
  
  saveShifts(shifts);
  
  // Regenerate assignments with new shift configuration
  regenerateAssignmentsFromShifts();
}

/**
 * Import matches from The Blue Alliance API
 */
export async function importMatchesFromTBA(eventCode, apiKey) {
  try {
    const response = await fetch(
      `https://www.thebluealliance.com/api/v3/event/${eventCode}/matches/simple`,
      {
        headers: {
          "X-TBA-Auth-Key": apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`TBA API error: ${response.status}`);
    }

    const matches = await response.json();

    // Filter qualification matches and extract needed data
    const qualMatches = matches
      .filter((m) => m.comp_level === "qm")
      .map((m) => ({
        matchNumber: m.match_number,
        redTeams: m.alliances.red.team_keys.map((t) => parseInt(t.replace("frc", ""))),
        blueTeams: m.alliances.blue.team_keys.map((t) => parseInt(t.replace("frc", ""))),
      }))
      .sort((a, b) => a.matchNumber - b.matchNumber);

    saveMatches(qualMatches);
    saveEventCode(eventCode);

    return qualMatches;
  } catch (error) {
    console.error("Error importing matches from TBA:", error);
    throw error;
  }
}

/**
 * Save scouter pool to Firestore
 */
export async function saveScouterPoolToFirestore(scouters) {
  try {
    const docRef = doc(firebase, COLLECTIONS.SCOUTERS, "pool");
    await setDoc(docRef, { names: scouters });
  } catch (error) {
    console.error("Error saving scouter pool to Firestore:", error);
    throw error;
  }
}

/**
 * Load scouter pool from Firestore
 */
export async function loadScouterPoolFromFirestore() {
  try {
    const docRef = doc(firebase, COLLECTIONS.SCOUTERS, "pool");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      saveScouterPool(data.names);
      return data.names;
    }
    return null;
  } catch (error) {
    console.error("Error loading scouter pool from Firestore:", error);
    return null;
  }
}

/**
 * Save shifts to Firestore
 */
export async function saveShiftsToFirestore(shifts) {
  try {
    for (const shift of shifts) {
      const docRef = doc(firebase, COLLECTIONS.SHIFT_ASSIGNMENTS, `shift${shift.id}`);
      await setDoc(docRef, {
        shiftId: shift.id,
        matchStart: shift.startMatch,
        matchEnd: shift.endMatch,
        scouterNames: shift.scouterNames,
        scouterPositions: shift.scouterPositions,
      });
    }
  } catch (error) {
    console.error("Error saving shifts to Firestore:", error);
    throw error;
  }
}

/**
 * Load shifts from Firestore
 */
export async function loadShiftsFromFirestore() {
  try {
    const querySnapshot = await getDocs(collection(firebase, COLLECTIONS.SHIFT_ASSIGNMENTS));
    const shifts = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      shifts.push({
        id: data.shiftId,
        startMatch: data.matchStart,
        endMatch: data.matchEnd,
        scouterNames: data.scouterNames,
        scouterPositions: data.scouterPositions,
        matchCount: data.matchEnd - data.matchStart + 1,
      });
    });
    
    shifts.sort((a, b) => a.id - b.id);
    saveShifts(shifts);
    return shifts;
  } catch (error) {
    console.error("Error loading shifts from Firestore:", error);
    return [];
  }
}

/**
 * Save assignments to Firestore
 */
export async function saveAssignmentsToFirestore(assignments) {
  try {
    for (const [scouterName, scouterAssignments] of Object.entries(assignments)) {
      const docRef = doc(firebase, COLLECTIONS.ASSIGNMENTS, scouterName);
      await setDoc(docRef, {
        name: scouterName,
        assignments: scouterAssignments,
      });
    }
  } catch (error) {
    console.error("Error saving assignments to Firestore:", error);
    throw error;
  }
}

/**
 * Load all assignments from Firestore
 */
export async function loadAssignmentsFromFirestore() {
  try {
    const querySnapshot = await getDocs(collection(firebase, COLLECTIONS.ASSIGNMENTS));
    const assignments = {};
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      assignments[data.name] = data.assignments;
    });
    
    saveAssignments(assignments);
    return assignments;
  } catch (error) {
    console.error("Error loading assignments from Firestore:", error);
    return {};
  }
}

/**
 * Mark assignment complete in Firestore
 */
export async function markAssignmentCompleteInFirestore(name, matchNumber) {
  try {
    const docRef = doc(firebase, COLLECTIONS.ASSIGNMENTS, name);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const assignments = data.assignments || [];
      const updatedAssignments = assignments.map((a) =>
        a.match === matchNumber ? { ...a, completed: true } : a
      );
      
      await setDoc(docRef, {
        ...data,
        assignments: updatedAssignments,
      });
    }
  } catch (error) {
    console.error("Error marking assignment complete in Firestore:", error);
  }
}

/**
 * Get all submitted match data from Firestore
 * Returns a map of "team_match" -> {name, match, team, timestamp}
 */
export async function getSubmittedMatchesFromFirestore() {
  try {
    console.log("Fetching from TimerScoutData collection...");
    const querySnapshot = await getDocs(collection(firebase, "timerScoutData"));
    console.log("TimerScoutData query result:", querySnapshot.size, "documents found");
    
    const submittedMatches = {};
    
    querySnapshot.forEach((doc) => {
      // Document ID is in format: team_match (e.g., "972_13")
      const docId = doc.id;
      const data = doc.data();
      
      console.log("Document:", docId, data);
      
      submittedMatches[docId] = {
        team: data.team,
        match: data.match,
        scouter: data.name,
        submittedAt: data.timestamp || null
      };
    });
    
    console.log("Submitted matches map:", submittedMatches);
    return submittedMatches;
  } catch (error) {
    console.error("Error fetching submitted matches:", error);
    return {};
  }
}

/**
 * Sync assignment completion status with Firebase match submissions
 * This checks if matches have actually been submitted and updates assignments
 */
export async function syncAssignmentsWithSubmittedMatches() {
  const submittedMatches = await getSubmittedMatchesFromFirestore();
  const assignments = getAllAssignments();
  let updated = false;
  
  // Check each scouter's assignments
  for (const [scouterName, scouterAssignments] of Object.entries(assignments)) {
    scouterAssignments.forEach((assignment, index) => {
      // Document ID format: team_match (e.g., "972_13")
      const docId = `${assignment.team}_${assignment.match}`;
      const submission = submittedMatches[docId];
      
      // If there's a submission for this match/team, verify the scouter name matches
      if (submission && submission.scouter) {
        // Check if the scouter name matches (case-insensitive)
        const scouterMatch = submission.scouter.toLowerCase().trim() === scouterName.toLowerCase().trim();
        if (scouterMatch && !assignment.completed) {
          assignments[scouterName][index].completed = true;
          assignments[scouterName][index].submittedAt = submission.submittedAt;
          updated = true;
        }
      }
    });
  }
  
  if (updated) {
    saveAssignments(assignments);
  }
  
  return submittedMatches;
}

/**
 * Check if a specific match has been submitted
 */
export async function checkMatchSubmitted(teamNumber, matchNumber) {
  try {
    // Document ID format: team_match (e.g., "972_13")
    const docId = `${teamNumber}_${matchNumber}`;
    const docRef = doc(firebase, "timerScoutData", docId);
    const docSnap = await getDoc(docRef);
    
    return docSnap.exists();
  } catch (error) {
    console.error("Error checking match submission:", error);
    return false;
  }
}
