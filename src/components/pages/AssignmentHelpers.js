import { doc, setDoc } from "firebase/firestore";
import firebase from "../../firebase";
import { generateVerificationCode, DEFAULT_SCOUTERS } from "./AssignmentConstants";

// Export functions for external use (Match Scout integration)
export const getAssignmentForScouter = (scouterName, matchNumber) => {
  // First check localStorage
  const savedAssignments = localStorage.getItem("matchAssignments");
  if (!savedAssignments) return null;

  const allAssignments = JSON.parse(savedAssignments);

  // Check for per-scouter assignments (new format)
  if (allAssignments[scouterName]) {
    const scouterAssignments = allAssignments[scouterName];
    const assignment = scouterAssignments.find(
      (a) => a.match === parseInt(matchNumber)
    );
    if (assignment) {
      return {
        matchNumber: assignment.match,
        team: assignment.team,
        alliance: assignment.alliance,
        position: assignment.position,
        verificationCode: assignment.verificationCode,
        completed: assignment.completed,
      };
    }
  }

  // Check for match-based assignments (legacy format)
  const key = `match${matchNumber}`;
  const matchAssignments = allAssignments[key];

  if (!matchAssignments) return null;

  // Find which slot this scouter is assigned to
  for (const [slot, name] of Object.entries(matchAssignments)) {
    if (name && name.toLowerCase() === scouterName.toLowerCase()) {
      const isRed = slot.startsWith("red");
      const position = isRed
        ? parseInt(slot.replace("red", ""))
        : parseInt(slot.replace("blue", ""));

      // Get team number
      const savedMatches = localStorage.getItem("eventMatches");
      let team = "";
      if (savedMatches) {
        const matches = JSON.parse(savedMatches);
        const match = matches.find((m) => m.matchNumber === parseInt(matchNumber));
        if (match) {
          team = isRed ? match.red[position - 1] : match.blue[position - 1];
        }
      }

      const verificationCode = generateVerificationCode(
        scouterName,
        parseInt(matchNumber),
        isRed ? "Red" : "Blue"
      );

      return {
        matchNumber: parseInt(matchNumber),
        team: team,
        alliance: isRed ? "Red" : "Blue",
        position: position,
        verificationCode: verificationCode,
      };
    }
  }

  return null;
};

export const getAllAssignments = () => {
  const savedAssignments = localStorage.getItem("matchAssignments");
  return savedAssignments ? JSON.parse(savedAssignments) : {};
};

export const markAssignmentComplete = async (scouterName, matchNumber) => {
  const savedAssignments = localStorage.getItem("matchAssignments");
  if (!savedAssignments) return;

  const allAssignments = JSON.parse(savedAssignments);

  if (allAssignments[scouterName]) {
    const assignments = allAssignments[scouterName];
    const idx = assignments.findIndex((a) => a.match === parseInt(matchNumber));
    if (idx !== -1) {
      assignments[idx].completed = true;
      allAssignments[scouterName] = assignments;

      // Save to localStorage
      localStorage.setItem("matchAssignments", JSON.stringify(allAssignments));

      // Dispatch event for React to detect the change
      window.dispatchEvent(new Event("assignmentsUpdated"));

      // Save to Firestore
      try {
        await setDoc(doc(firebase, "assignments", scouterName), {
          assignments: assignments,
        });
      } catch (err) {
        console.log("Failed to update Firestore:", err.message);
      }
    }
  }
};

export const getScouterList = () => {
  const savedScouters = localStorage.getItem("scouterPool");

  const pool = savedScouters
    ? JSON.parse(savedScouters)
    : DEFAULT_SCOUTERS;

  // Filter to only include official scouter names
  return pool.filter(name => DEFAULT_SCOUTERS.includes(name)).sort();
};

export const getShifts = () => {
  const savedShifts = localStorage.getItem("shifts");
  return savedShifts ? JSON.parse(savedShifts) : [];
};

// Regenerate assignments from shifts (called when shifts are edited)
export const regenerateAssignmentsFromShifts = () => {
  const savedShifts = localStorage.getItem("shifts");
  const savedMatches = localStorage.getItem("eventMatches");
  
  if (!savedShifts || !savedMatches) return;
  
  const shifts = JSON.parse(savedShifts);
  const matches = JSON.parse(savedMatches);
  
  if (shifts.length === 0 || matches.length === 0) return;

  const sortedMatches = [...matches].sort((a, b) => a.matchNumber - b.matchNumber);
  const newAssignments = {};

  shifts.forEach((shift) => {
    const scouterPositions = shift.scouterPositions || shift.scouterNames?.map((name, i) => ({ name, position: i + 1 })) || [];
    
    scouterPositions.forEach((scouter) => {
      const scouterName = scouter.name;
      const position = scouter.position || scouter.position;
      const slotIndex = position - 1;
      const isRed = slotIndex < 3;
      const slotTeamIndex = slotIndex % 3;
      const slot = isRed ? `red${slotTeamIndex + 1}` : `blue${slotTeamIndex + 1}`;
      const alliance = isRed ? "Red" : "Blue";

      const scouterAssignments = [];

      const shiftMatches = sortedMatches.filter(
        (m) => m.matchNumber >= shift.startMatch && m.matchNumber <= shift.endMatch
      );

      shiftMatches.forEach((match) => {
        const matchNum = match.matchNumber;
        const team = isRed ? match.red[slotTeamIndex] : match.blue[slotTeamIndex];
        const verificationCode = generateVerificationCode(scouterName, matchNum, alliance);

        scouterAssignments.push({
          match: matchNum,
          team: team,
          alliance: alliance,
          position: position,
          slot: slot,
          verificationCode: verificationCode,
          completed: false,
        });

        const matchKey = `match${matchNum}`;
        if (!newAssignments[matchKey]) {
          newAssignments[matchKey] = {};
        }
        newAssignments[matchKey][slot] = scouterName;
      });

      newAssignments[scouterName] = scouterAssignments;
    });
  });

  localStorage.setItem("matchAssignments", JSON.stringify(newAssignments));
  
  // Dispatch event for UI update
  window.dispatchEvent(new Event("assignmentsUpdated"));
};

// Listen for shift changes saved events
if (typeof window !== 'undefined') {
  window.regenerateAssignmentsFromShifts = regenerateAssignmentsFromShifts;
  
  window.addEventListener('shiftChangesSaved', () => {
    regenerateAssignmentsFromShifts();
  });
}

// Get the next incomplete assignment for a scouter
export const getNextAssignment = (scouterName) => {
  const savedAssignments = localStorage.getItem("matchAssignments");
  if (!savedAssignments) return null;

  const allAssignments = JSON.parse(savedAssignments);

  // Check for per-scouter assignments (new format)
  if (allAssignments[scouterName]) {
    const scouterAssignments = allAssignments[scouterName];
    // Find first incomplete assignment, sorted by match number
    const sortedAssignments = scouterAssignments
      .filter((a) => !a.completed)
      .sort((a, b) => a.match - b.match);

    if (sortedAssignments.length > 0) {
      return sortedAssignments[0];
    }
  }

  // Check for match-based assignments (legacy format)
  // This requires iterating through all matches to find next
  const savedMatches = localStorage.getItem("eventMatches");
  if (!savedMatches) return null;

  const matches = JSON.parse(savedMatches);

  // Find first match where this scouter is assigned but not completed
  for (const match of matches) {
    const key = `match${match.matchNumber}`;
    const matchAssignments = allAssignments[key];

    if (!matchAssignments) continue;

    for (const [slot, name] of Object.entries(matchAssignments)) {
      if (name && name.toLowerCase() === scouterName.toLowerCase()) {
        // Check if already completed in per-scouter format
        if (allAssignments[scouterName]) {
          const existing = allAssignments[scouterName].find(
            (a) => a.match === match.matchNumber
          );
          if (existing && existing.completed) continue;
        }

        const isRed = slot.startsWith("red");
        const position = isRed
          ? parseInt(slot.replace("red", ""))
          : parseInt(slot.replace("blue", ""));

        const team = isRed ? match.red[position - 1] : match.blue[position - 1];

        return {
          match: match.matchNumber,
          team: team,
          alliance: isRed ? "Red" : "Blue",
          position: position,
          slot: slot,
          verificationCode: generateVerificationCode(
            scouterName,
            match.matchNumber,
            isRed ? "Red" : "Blue"
          ),
          completed: false,
        };
      }
    }
  }

  return null;
};
