import { STORAGE_KEYS, COLLECTIONS, DEFAULT_SHIFT_SIZE, getTeamStorageKey, DEFAULT_SCOUTER_POOL } from "./AssignmentConstants";
import firebase from "../../../firebase";
import { doc, setDoc, getDoc, collection, getDocs, query, where, onSnapshot, writeBatch } from "firebase/firestore";

/**
 * Save global scouter pool to Firestore for cross-page synchronization
 */
export async function saveScouterPoolToFirestore(scouters) {
  try {
    await setDoc(doc(firebase, COLLECTIONS.SCOUTERS, "globalPool"), {
      scouters: scouters,
      updatedAt: Date.now(),
    }, { merge: true });
    console.log("Global scouter pool saved to Firestore:", scouters.length, "scouters");
    return { success: true };
  } catch (error) {
    console.error("Error saving scouter pool to Firestore:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Load global scouter pool from Firestore
 */
export async function loadScouterPoolFromFirestore() {
  try {
    const docSnap = await getDoc(doc(firebase, COLLECTIONS.SCOUTERS, "globalPool"));
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log("Loaded global scouter pool from Firestore:", data.scouters?.length || 0, "scouters");
      return data.scouters || [];
    }
    return null;
  } catch (error) {
    console.error("Error loading scouter pool from Firestore:", error);
    return null;
  }
}

/**
 * Subscribe to global scouter pool changes in Firestore
 */
export function subscribeToGlobalScouterPool(callback) {
  return onSnapshot(doc(firebase, COLLECTIONS.SCOUTERS, "globalPool"), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback(data.scouters || []);
    }
  });
}

/**
 * Get scouter list for a team from localStorage, with default pool fallback
 */
export function getScouterList(teamNumber = null) {
  const key = teamNumber ? getTeamStorageKey(STORAGE_KEYS.SCOUTER_POOL, teamNumber) : STORAGE_KEYS.SCOUTER_POOL;
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Error parsing scouter pool:", e);
    }
  }
  // Return default scouter pool as fallback
  return [...DEFAULT_SCOUTER_POOL];
}

/**
 * Initialize default scouter pool in localStorage if not exists
 */
export function initializeDefaultScouterPool(teamNumber = null) {
  const key = teamNumber ? getTeamStorageKey(STORAGE_KEYS.SCOUTER_POOL, teamNumber) : STORAGE_KEYS.SCOUTER_POOL;
  const saved = localStorage.getItem(key);
  if (!saved) {
    localStorage.setItem(key, JSON.stringify(DEFAULT_SCOUTER_POOL));
  }
}

/**
 * Remove a scouter from the scouter pool (localStorage)
 */
export function removeScouterFromPool(scouterName, teamNumber = null) {
  const key = teamNumber ? getTeamStorageKey(STORAGE_KEYS.SCOUTER_POOL, teamNumber) : STORAGE_KEYS.SCOUTER_POOL;
  const saved = localStorage.getItem(key);
  let scouters = [];
  
  if (saved) {
    try {
      scouters = JSON.parse(saved);
    } catch (e) {
      scouters = [...DEFAULT_SCOUTER_POOL];
    }
  } else {
    scouters = [...DEFAULT_SCOUTER_POOL];
  }
  
  // Remove the scouter
  const updatedScouters = scouters.filter(s => s.toLowerCase() !== scouterName.toLowerCase());
  localStorage.setItem(key, JSON.stringify(updatedScouters));
  return updatedScouters;
}

/**
 * Add a scouter to the scouter pool (localStorage)
 */
export function addScouterToPool(scouterName, teamNumber = null) {
  const key = teamNumber ? getTeamStorageKey(STORAGE_KEYS.SCOUTER_POOL, teamNumber) : STORAGE_KEYS.SCOUTER_POOL;
  const saved = localStorage.getItem(key);
  let scouters = [];
  
  if (saved) {
    try {
      scouters = JSON.parse(saved);
    } catch (e) {
      scouters = [...DEFAULT_SCOUTER_POOL];
    }
  } else {
    scouters = [...DEFAULT_SCOUTER_POOL];
  }
  
  // Add the scouter if not already present
  if (!scouters.some(s => s.toLowerCase() === scouterName.toLowerCase())) {
    scouters.push(scouterName);
    scouters.sort(); // Keep alphabetically sorted
  }
  localStorage.setItem(key, JSON.stringify(scouters));
  return scouters;
}

/**
 * Save scouter pool for a team to localStorage
 */
export function saveScouterPool(scouters, teamNumber = null) {
  const key = teamNumber ? getTeamStorageKey(STORAGE_KEYS.SCOUTER_POOL, teamNumber) : STORAGE_KEYS.SCOUTER_POOL;
  localStorage.setItem(key, JSON.stringify(scouters));
}

/**
 * Get all shifts for a team from localStorage
 */
export function getShifts(teamNumber = null) {
  const key = teamNumber ? getTeamStorageKey(STORAGE_KEYS.SHIFTS, teamNumber) : STORAGE_KEYS.SHIFTS;
  const saved = localStorage.getItem(key);
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
 * Save shifts for a team to localStorage
 */
export function saveShifts(shifts, teamNumber = null) {
  const key = teamNumber ? getTeamStorageKey(STORAGE_KEYS.SHIFTS, teamNumber) : STORAGE_KEYS.SHIFTS;
  localStorage.setItem(key, JSON.stringify(shifts));
}

/**
 * Get all assignments for a team from localStorage
 */
export function getAllAssignments(teamNumber = null) {
  const key = teamNumber ? getTeamStorageKey(STORAGE_KEYS.ASSIGNMENTS, teamNumber) : STORAGE_KEYS.ASSIGNMENTS;
  console.log("[getAllAssignments] Key:", key);
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      console.log("[getAllAssignments] Found:", Object.keys(parsed).length, "scouters");
      return parsed;
    } catch (e) {
      console.error("Error parsing assignments:", e);
    }
  } else {
    console.log("[getAllAssignments] No data in localStorage for key:", key);
  }
  return {};
}

/**
 * Save assignments for a team to localStorage
 */
export function saveAssignments(assignments, teamNumber = null) {
  const key = teamNumber ? getTeamStorageKey(STORAGE_KEYS.ASSIGNMENTS, teamNumber) : STORAGE_KEYS.ASSIGNMENTS;
  localStorage.setItem(key, JSON.stringify(assignments));
}

/**
 * Get matches for a team from localStorage
 */
export function getMatches(teamNumber = null) {
  const key = teamNumber ? getTeamStorageKey(STORAGE_KEYS.MATCHES, teamNumber) : STORAGE_KEYS.MATCHES;
  const saved = localStorage.getItem(key);
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
 * Save matches for a team to localStorage
 */
export function saveMatches(matches, teamNumber = null) {
  const key = teamNumber ? getTeamStorageKey(STORAGE_KEYS.MATCHES, teamNumber) : STORAGE_KEYS.MATCHES;
  localStorage.setItem(key, JSON.stringify(matches));
}

/**
 * Get event code for a team from localStorage
 */
export function getEventCode(teamNumber = null) {
  const key = teamNumber ? getTeamStorageKey(STORAGE_KEYS.EVENT_CODE, teamNumber) : STORAGE_KEYS.EVENT_CODE;
  return localStorage.getItem(key) || "";
}

/**
 * Save event code for a team to localStorage
 */
export function saveEventCode(eventCode, teamNumber = null) {
  const key = teamNumber ? getTeamStorageKey(STORAGE_KEYS.EVENT_CODE, teamNumber) : STORAGE_KEYS.EVENT_CODE;
  localStorage.setItem(key, eventCode);
}

/**
 * Generate shifts based on scouter pool and match count
 * Flexible version that allows adding multiple scouters per position
 */
export function generateShifts(scouters, matchCount) {
  if (scouters.length === 0 || matchCount === 0) {
    return [];
  }
  
  // Use at least 1 scouter per position (6 positions total: 3 red + 3 blue)
  const minScoutersNeeded = 6;
  const numberOfShifts = Math.max(1, Math.floor(scouters.length / minScoutersNeeded));
  
  const matchesPerShift = Math.floor(matchCount / numberOfShifts);
  const extraMatches = matchCount % numberOfShifts;

  const shifts = [];
  let currentMatch = 1;

  for (let i = 0; i < numberOfShifts; i++) {
    const shiftMatchCount = matchesPerShift + (i < extraMatches ? 1 : 0);
    const endMatch = currentMatch + shiftMatchCount - 1;

    // Distribute scouters evenly across the shift
    // Each shift gets a portion of scouters
    const startScouterIndex = i * minScoutersNeeded;
    const endScouterIndex = Math.min(startScouterIndex + minScoutersNeeded, scouters.length);
    const shiftScouters = scouters.slice(startScouterIndex, endScouterIndex);
    
    // If we don't have enough scouters, fill remaining spots with empty/placeholder
    while (shiftScouters.length < minScoutersNeeded) {
      shiftScouters.push(""); // Empty placeholder
    }

    const scouterPositions = shiftScouters.map((name, index) => {
      const position = index + 1;
      const isRed = position <= 3;
      return {
        name: name || "(Empty)",
        position,
        alliance: isRed ? "Red" : "Blue",
        slot: isRed ? `red${position}` : `blue${position}`,
        isPlaceholder: !name,
      };
    });

    shifts.push({
      id: i + 1,
      startMatch: currentMatch,
      endMatch: endMatch,
      matchCount: shiftMatchCount,
      scouterPositions,
      scouterNames: shiftScouters.filter(n => n), // Only non-empty names
    });

    currentMatch = endMatch + 1;
  }

  return shifts;
}

/**
 * Regenerate assignments from shifts for a specific team
 */
export function regenerateAssignmentsFromShifts(teamNumber = null) {
  const shifts = getShifts(teamNumber);
  const matches = getMatches(teamNumber);

  if (shifts.length === 0 || matches.length === 0) {
    console.warn("[regenerateAssignmentsFromShifts] No shifts or matches - shifts:", shifts.length, "matches:", matches.length);
    return;
  }
  console.log("[regenerateAssignmentsFromShifts] Generating with shifts:", shifts.length, "matches:", matches.length);

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

  saveAssignments(assignments, teamNumber);
  
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
export function getNextAssignment(name, teamNumber = null) {
  const assignments = getAllAssignments(teamNumber);
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
export function getAssignmentForScouter(name, matchNumber, teamNumber = null) {
  const assignments = getAllAssignments(teamNumber);
  const scouterAssignments = assignments[name];
  
  if (!scouterAssignments) {
    return null;
  }

  return scouterAssignments.find((a) => a.match === matchNumber);
}

/**
 * Mark an assignment as completed
 */
export function markAssignmentComplete(name, matchNumber, teamNumber = null) {
  const assignments = getAllAssignments(teamNumber);
  
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
 * Update a scouter in a shift for a specific team
 */
export async function updateShiftScouter(shiftIndex, positionIndex, newName, teamNumber = null) {
  const shifts = getShifts(teamNumber);
  
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
  
  // Save to both localStorage and Firestore
  await saveShiftsBoth(shifts, teamNumber);
  
  // Regenerate assignments with new shift configuration
  regenerateAssignmentsFromShifts(teamNumber);
  
  // Save assignments to Firestore
  const assignments = getAllAssignments(teamNumber);
  await saveAssignmentsBoth(assignments, teamNumber);
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
 * Save scouter pool to Firestore for a specific team
 */
export async function saveTeamScouterPoolToFirestore(scouters, teamNumber) {
  if (!teamNumber) {
    console.error("Team number required to save scouter pool");
    return;
  }
  try {
    const docRef = doc(firebase, COLLECTIONS.TEAMS, teamNumber.toString());
    await setDoc(docRef, { scouters: scouters }, { merge: true });
  } catch (error) {
    console.error("Error saving scouter pool to Firestore:", error);
    throw error;
  }
}

/**
 * Load scouter pool from Firestore for a specific team
 */
export async function loadTeamScouterPoolFromFirestore(teamNumber) {
  if (!teamNumber) {
    console.error("Team number required to load scouter pool");
    return null;
  }
  try {
    const docRef = doc(firebase, COLLECTIONS.TEAMS, teamNumber.toString());
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const scouters = data.scouters || [];
      saveScouterPool(scouters, teamNumber);
      return scouters;
    }
    return null;
  } catch (error) {
    console.error("Error loading scouter pool from Firestore:", error);
    return null;
  }
}

/**
 * Save shifts to Firestore for a specific team
 */
export async function saveShiftsToFirestore(shifts, teamNumber = null) {
  try {
    const teamDocId = teamNumber ? `team${teamNumber}` : "default";
    for (const shift of shifts) {
      const docRef = doc(firebase, COLLECTIONS.SHIFT_ASSIGNMENTS, `${teamDocId}_shift${shift.id}`);
      await setDoc(docRef, {
        shiftId: shift.id,
        matchStart: shift.startMatch,
        matchEnd: shift.endMatch,
        scouterNames: shift.scouterNames,
        scouterPositions: shift.scouterPositions,
        teamNumber: teamNumber,
      });
    }
  } catch (error) {
    console.error("Error saving shifts to Firestore:", error);
    throw error;
  }
}

/**
 * Load shifts from Firestore for a specific team
 */
export async function loadShiftsFromFirestore(teamNumber = null) {
  try {
    const teamDocId = teamNumber ? `team${teamNumber}` : "default";
    const querySnapshot = await getDocs(
      query(collection(firebase, COLLECTIONS.SHIFT_ASSIGNMENTS), where("teamNumber", "==", teamNumber))
    );
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
    saveShifts(shifts, teamNumber);
    return shifts;
  } catch (error) {
    console.error("Error loading shifts from Firestore:", error);
    return [];
  }
}

/**
 * Save assignments to Firestore for a specific team
 */
export async function saveAssignmentsToFirestore(assignments, teamNumber = null) {
  try {
    console.log("[saveAssignmentsToFirestore] Saving for team:", teamNumber, "assignments count:", Object.keys(assignments).length);
    const teamDocId = teamNumber ? `team${teamNumber}` : "default";
    for (const [scouterName, scouterAssignments] of Object.entries(assignments)) {
      const docId = `${teamDocId}_${scouterName}`;
      console.log("[saveAssignmentsToFirestore] Saving doc:", docId, "matches:", scouterAssignments?.length);
      const docRef = doc(firebase, COLLECTIONS.ASSIGNMENTS, docId);
      await setDoc(docRef, {
        name: scouterName,
        teamNumber: teamNumber,
        assignments: scouterAssignments,
      });
    }
  } catch (error) {
    console.error("Error saving assignments to Firestore:", error);
    throw error;
  }
}

/**
 * Load all assignments from Firestore for a specific team
 */
export async function loadAssignmentsFromFirestore(teamNumber = null) {
  try {
    console.log("[loadAssignmentsFromFirestore] Loading for team:", teamNumber);
    const querySnapshot = await getDocs(
      query(collection(firebase, COLLECTIONS.ASSIGNMENTS), where("teamNumber", "==", teamNumber))
    );
    console.log("[loadAssignmentsFromFirestore] Found docs:", querySnapshot.size);
    const assignments = {};
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log("[loadAssignmentsFromFirestore] Doc:", doc.id, data.name);
      assignments[data.name] = data.assignments;
    });
    
    saveAssignments(assignments, teamNumber);
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
 * @param {string|null} teamNumber - Optional team number to filter results
 */
export async function getSubmittedMatchesFromFirestore(teamNumber = null) {
  try {
    console.log("Fetching from TimerScoutData collection..." + (teamNumber ? ` for team ${teamNumber}` : ""));
    
    let querySnapshot;
    if (teamNumber) {
      // Filter by team number using query
      const q = query(collection(firebase, "timerScoutData"), where("team", "==", teamNumber));
      querySnapshot = await getDocs(q);
    } else {
      querySnapshot = await getDocs(collection(firebase, "timerScoutData"));
    }
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
export async function syncAssignmentsWithSubmittedMatches(teamNumber = null) {
  const submittedMatches = await getSubmittedMatchesFromFirestore(teamNumber);
  const assignments = getAllAssignments(teamNumber);
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
    saveAssignments(assignments, teamNumber);
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

// Real-time listener references for cleanup
let shiftsUnsubscribe = null;
let assignmentsUnsubscribe = null;
let matchesUnsubscribe = null;

/**
 * Set up real-time listener for shifts from Firestore
 * Returns unsubscribe function
 */
export function subscribeToShifts(onUpdate, teamNumber = null) {
  try {
    const collectionRef = collection(firebase, COLLECTIONS.SHIFT_ASSIGNMENTS);
    
    // Build query - filter by team if specified
    let q = collectionRef;
    if (teamNumber) {
      q = query(collectionRef, where("teamNumber", "==", teamNumber));
    }
    
    // Unsubscribe from previous listener if exists
    if (shiftsUnsubscribe) {
      shiftsUnsubscribe();
    }
    
    shiftsUnsubscribe = onSnapshot(q, (snapshot) => {
      const shifts = [];
      snapshot.forEach((doc) => {
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
      saveShifts(shifts, teamNumber);
      onUpdate(shifts);
    }, (error) => {
      console.error("Error listening to shifts:", error);
    });
    
    return shiftsUnsubscribe;
  } catch (error) {
    console.error("Error setting up shifts listener:", error);
    return null;
  }
}

/**
 * Set up real-time listener for assignments from Firestore
 * Returns unsubscribe function
 */
export function subscribeToAssignments(onUpdate, teamNumber = null) {
  try {
    const collectionRef = collection(firebase, COLLECTIONS.ASSIGNMENTS);
    
    // Build query - filter by team if specified
    let q = collectionRef;
    if (teamNumber) {
      q = query(collectionRef, where("teamNumber", "==", teamNumber));
    }
    
    // Unsubscribe from previous listener if exists
    if (assignmentsUnsubscribe) {
      assignmentsUnsubscribe();
    }
    
    assignmentsUnsubscribe = onSnapshot(q, (snapshot) => {
      const assignments = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        assignments[data.name] = data.assignments;
      });
      
      saveAssignments(assignments, teamNumber);
      onUpdate(assignments);
    }, (error) => {
      console.error("Error listening to assignments:", error);
    });
    
    return assignmentsUnsubscribe;
  } catch (error) {
    console.error("Error setting up assignments listener:", error);
    return null;
  }
}

/**
 * Set up real-time listener for matches from Firestore
 * Returns unsubscribe function
 */
export function subscribeToMatches(onUpdate, teamNumber = null) {
  try {
    const collectionRef = collection(firebase, COLLECTIONS.MATCHES);
    
    // Build query - filter by team if specified
    let q = collectionRef;
    if (teamNumber) {
      q = query(collectionRef, where("teamNumber", "==", teamNumber));
    }
    
    // Unsubscribe from previous listener if exists
    if (matchesUnsubscribe) {
      matchesUnsubscribe();
    }
    
    matchesUnsubscribe = onSnapshot(q, (snapshot) => {
      const matches = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        matches.push({
          matchNumber: data.matchNumber,
          redTeams: data.redTeams,
          blueTeams: data.blueTeams,
        });
      });
      
      matches.sort((a, b) => a.matchNumber - b.matchNumber);
      saveMatches(matches, teamNumber);
      onUpdate(matches);
    }, (error) => {
      console.error("Error listening to matches:", error);
    });
    
    return matchesUnsubscribe;
  } catch (error) {
    console.error("Error setting up matches listener:", error);
    return null;
  }
}

/**
 * Clean up all real-time listeners
 */
export function cleanupAllListeners() {
  if (shiftsUnsubscribe) {
    shiftsUnsubscribe();
    shiftsUnsubscribe = null;
  }
  if (assignmentsUnsubscribe) {
    assignmentsUnsubscribe();
    assignmentsUnsubscribe = null;
  }
  if (matchesUnsubscribe) {
    matchesUnsubscribe();
    matchesUnsubscribe = null;
  }
}

/**
 * Save shifts to both localStorage and Firestore
 */
export async function saveShiftsBoth(shifts, teamNumber = null) {
  // Save to localStorage
  saveShifts(shifts, teamNumber);
  
  // Save to Firestore
  try {
    await saveShiftsToFirestore(shifts, teamNumber);
  } catch (error) {
    console.error("Error saving shifts to Firestore:", error);
  }
}

/**
 * Save assignments to both localStorage and Firestore
 */
export async function saveAssignmentsBoth(assignments, teamNumber = null) {
  // Save to localStorage
  saveAssignments(assignments, teamNumber);
  
  // Save to Firestore
  try {
    await saveAssignmentsToFirestore(assignments, teamNumber);
  } catch (error) {
    console.error("Error saving assignments to Firestore:", error);
  }
}

/**
 * Save matches to both localStorage and Firestore
 */
export async function saveMatchesBoth(matches, eventCode, teamNumber = null) {
  // Save to localStorage
  saveMatches(matches, teamNumber);
  saveEventCode(eventCode, teamNumber);
  
  // Save to Firestore
  try {
    const teamDocId = teamNumber ? `team${teamNumber}` : "default";
    const docRef = doc(firebase, COLLECTIONS.MATCHES, `${teamDocId}_schedule`);
    await setDoc(docRef, {
      eventCode,
      teamNumber: teamNumber,
      matches,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error saving matches to Firestore:", error);
  }
}
