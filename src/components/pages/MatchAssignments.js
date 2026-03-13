import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  Chip,
  IconButton,
  Divider,
  Stack,
  Alert,
  Card, 
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import {
  collection,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import firebase from "../../firebase";

// Import from split files
import {
  DEFAULT_SCOUTERS,
  SLOT_POSITIONS,
  ALLIANCE_COLORS,
  generateVerificationCode,
} from "./AssignmentConstants";

import { PasswordModal, SelectionModal, AddScouterModal } from "./AssignmentModals";

export default function MatchAssignments() {
  // Password protection - check localStorage for persisted auth state
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("isAdminAuthenticated") === "true";
  });
  const [passwordModalOpen, setPasswordModalOpen] = useState(() => {
    return localStorage.getItem("isAdminAuthenticated") !== "true";
  });
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  // Event and schedule
  const [eventCode, setEventCode] = useState("");
  const [matches, setMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Scouter pool
  const [scouterPool, setScouterPool] = useState(DEFAULT_SCOUTERS);
  const [newscouterName, setNewscouterName] = useState("");
  const [addScouterModalOpen, setAddScouterModalOpen] = useState(false);

  // Assignments
  // eslint-disable-next-line no-unused-vars
  const [assignments, setAssignments] = useState({});
  // shiftMode is used via setShiftMode for planned shift editing UI
  // eslint-disable-next-line no-unused-vars
  const [shiftMode, setShiftMode] = useState(false);
  const [shifts, setShifts] = useState([]);

  // Selection modal
  const [selectionModalOpen, setSelectionModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Drag state
  const [draggedScouter, setDraggedScouter] = useState(null);

  // Load data from localStorage and Firestore on mount
  useEffect(() => {
    const loadData = async () => {
      // Load from localStorage
      const savedAssignments = localStorage.getItem("matchAssignments");
      if (savedAssignments) {
        setAssignments(JSON.parse(savedAssignments));
      }

      const savedScouters = localStorage.getItem("scouterPool");
      if (savedScouters) {
        const parsed = JSON.parse(savedScouters);
        // Use saved scouters if available, otherwise use default
        setScouterPool(parsed.length > 0 ? parsed : DEFAULT_SCOUTERS);
      } else {
        setScouterPool(DEFAULT_SCOUTERS);
      }

      const savedEventCode = localStorage.getItem("eventCode");
      if (savedEventCode) {
        setEventCode(savedEventCode);
      }

      const savedMatches = localStorage.getItem("eventMatches");
      if (savedMatches) {
        setMatches(JSON.parse(savedMatches));
      }

      const savedShifts = localStorage.getItem("shifts");
      if (savedShifts) {
        const parsedShifts = JSON.parse(savedShifts);
        setShifts(parsedShifts);
        // If shifts exist, enable shift mode
        if (parsedShifts.length > 0) {
          setShiftMode(true);
        }
      }

      // Try to load from Firestore
      try {
        const assignmentsRef = collection(firebase, "assignments");
        const snapshot = await getDocs(assignmentsRef);
        const firestoreAssignments = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Handle new format: { assignments: [...] } or legacy format: array directly
          if (data.assignments && Array.isArray(data.assignments)) {
            firestoreAssignments[doc.id] = data.assignments;
          } else if (Array.isArray(data)) {
            // Legacy format - array directly
            firestoreAssignments[doc.id] = data;
          } else {
            // Already in correct format (array)
            firestoreAssignments[doc.id] = data;
          }
        });
        if (Object.keys(firestoreAssignments).length > 0) {
          setAssignments(firestoreAssignments);
          localStorage.setItem("matchAssignments", JSON.stringify(firestoreAssignments));
        }
      } catch (err) {
        console.log("Using localStorage assignments:", err.message);
      }
    };

    loadData();
  }, []);

  // Save assignments to localStorage and Firestore
  const saveAssignments = async (newAssignments) => {
    localStorage.setItem("matchAssignments", JSON.stringify(newAssignments));

    try {
      // Only save scouter-based assignments (not match-key entries)
      for (const [key, value] of Object.entries(newAssignments)) {
        // Skip match-key entries (they start with "match")
        if (key.startsWith("match")) continue;
        
        // Only save if value is an array of assignments
        if (Array.isArray(value)) {
          await setDoc(doc(firebase, "assignments", key), { assignments: value });
        }
      }
    } catch (err) {
      console.log("Failed to save to Firestore:", err.message);
    }
  };

  // Save shifts to localStorage
  useEffect(() => {
    if (shifts.length > 0) {
      localStorage.setItem("shifts", JSON.stringify(shifts));
    }
  }, [shifts]);

  // Listen for shift changes from ScouterAssignments
  useEffect(() => {
    const handleShiftChanges = () => {
      regenerateAssignmentsFromShifts();
    };
    
    window.addEventListener('shiftChangesSaved', handleShiftChanges);
    return () => window.removeEventListener('shiftChangesSaved', handleShiftChanges);
  }, [shifts, matches]);

  // Save scouter pool to localStorage
  useEffect(() => {
    localStorage.setItem("scouterPool", JSON.stringify(scouterPool));
  }, [scouterPool]);

  // Save event code to localStorage
  useEffect(() => {
    if (eventCode) {
      localStorage.setItem("eventCode", eventCode);
    }
  }, [eventCode]);

  // Ensure auth state stays in sync with localStorage
  useEffect(() => {
    const storedAuth = localStorage.getItem("isAdminAuthenticated") === "true";
    if (isAuthenticated !== storedAuth) {
      setIsAuthenticated(storedAuth);
      setPasswordModalOpen(!storedAuth);
    }
  }, [isAuthenticated]);

  // Password validation
  const handlePasswordSubmit = () => {
    const adminPassword = process.env.REACT_APP_ADMIN_PASSWORD || "scoutx2026";
    if (passwordInput === adminPassword) {
      setIsAuthenticated(true);
      setPasswordModalOpen(false);
      setPasswordError(false);
      // Persist authentication state
      localStorage.setItem("isAdminAuthenticated", "true");
    } else {
      setPasswordError(true);
    }
  };

  // Import matches from The Blue Alliance API
  const handleImportMatches = async () => {
    if (!eventCode.trim()) {
      setError("Please enter an event code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const tbaApiKey = process.env.REACT_APP_TBA_API_KEY;
      if (!tbaApiKey || tbaApiKey === "YOUR_TBA_AUTH_KEY_HERE") {
        setError("TBA API Key not configured. Please add REACT_APP_TBA_API_KEY to .env file.");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `https://www.thebluealliance.com/api/v3/event/${eventCode}/matches/simple`,
        { headers: { "X-TBA-Auth-Key": tbaApiKey } }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch matches: ${response.status}`);
      }

      const data = await response.json();

      // Filter for qualification matches and sort by match number
      const qualMatches = data
        .filter((match) => match.comp_level === "qm")
        .sort((a, b) => a.match_number - b.match_number)
        .map((match) => ({
          matchNumber: match.match_number,
          red: [
            parseInt(match.alliances.red.team_keys[0].replace("frc", "")),
            parseInt(match.alliances.red.team_keys[1].replace("frc", "")),
            parseInt(match.alliances.red.team_keys[2].replace("frc", "")),
          ],
          blue: [
            parseInt(match.alliances.blue.team_keys[0].replace("frc", "")),
            parseInt(match.alliances.blue.team_keys[1].replace("frc", "")),
            parseInt(match.alliances.blue.team_keys[2].replace("frc", "")),
          ],
        }));

      setMatches(qualMatches);
      setCurrentMatchIndex(0);
      localStorage.setItem("eventMatches", JSON.stringify(qualMatches));

      // Clear assignments when new event is imported
      setAssignments({});
      setShifts([]);
    } catch (err) {
      setError(err.message || "Failed to import matches");
    } finally {
      setLoading(false);
    }
  };

  // Get assigned scouter for a slot
  const getAssignedScouter = (matchNumber, slot) => {
    const key = `match${matchNumber}`;
    return assignments[key]?.[slot] || null;
  };

  // Get all assigned scouters in a match
  const getAssignedScoutersInMatch = (matchNumber) => {
    const key = `match${matchNumber}`;
    const matchAssignments = assignments[key] || {};
    return Object.values(matchAssignments).filter(Boolean);
  };

  // Check if scouter is already assigned in the current match
  const isScouterAssignedInMatch = (scouterName, matchNumber) => {
    const assignedScouters = getAssignedScoutersInMatch(matchNumber);
    return assignedScouters.includes(scouterName);
  };

  // Assign scouter to slot
  const handleAssignScouter = (matchNumber, slot, scouterName) => {
    const key = `match${matchNumber}`;
    const newAssignments = {
      ...assignments,
      [key]: {
        ...(assignments[key] || {}),
        [slot]: scouterName,
      },
    };
    setAssignments(newAssignments);
    saveAssignments(newAssignments);
    setSelectionModalOpen(false);
  };

  // Open selection modal for a slot
  const handleSlotClick = (matchNumber, slot) => {
    setSelectedSlot({ matchNumber, slot });
    setSelectionModalOpen(true);
  };

  // Handle drag start
  const handleDragStart = (scouter) => {
    setDraggedScouter(scouter);
  };

  // Handle drop on slot
  const handleDrop = (matchNumber, slot) => {
    if (draggedScouter) {
      const assignedInMatch = getAssignedScoutersInMatch(matchNumber);
      if (!assignedInMatch.includes(draggedScouter)) {
        handleAssignScouter(matchNumber, slot, draggedScouter);
      }
      setDraggedScouter(null);
    }
  };

  // Allow drop
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Add new scouter
  const handleAddScouter = () => {
    if (newscouterName.trim() && !scouterPool.includes(newscouterName.trim())) {
      const updatedPool = [...scouterPool, newscouterName.trim()];
      setScouterPool(updatedPool);
      localStorage.setItem("scouterPool", JSON.stringify(updatedPool));
      setNewscouterName("");
      setAddScouterModalOpen(false);
    }
  };

  // Remove scouter
  const handleRemoveScouter = (name) => {
    const updatedPool = scouterPool.filter((s) => s !== name);
    setScouterPool(updatedPool);
    localStorage.setItem("scouterPool", JSON.stringify(updatedPool));
  };

  // Auto-generate shifts
  const handleAutoGenerateShifts = () => {
    console.log("handleAutoGenerateShifts called", { matches: matches.length, scouterPool: scouterPool.length });
    if (matches.length === 0 || scouterPool.length < 6) {
      setError("Need at least 6 scouters and matches imported");
      return;
    }

    const shiftSize = 6; // 6 positions per match
    
    // Calculate number of shifts needed to cover all scouts (ceiling)
    const numShifts = Math.ceil(scouterPool.length / shiftSize);

    if (numShifts < 1) {
      setError("Need at least 6 scouters for a shift");
      return;
    }

    const sortedMatches = [...matches].sort((a, b) => a.matchNumber - b.matchNumber);
    const totalMatches = sortedMatches.length;

    const matchesPerShift = Math.floor(totalMatches / numShifts);
    const extraMatches = totalMatches % numShifts;

    // Fisher-Yates shuffle for better randomization
    const shuffledScouters = [...scouterPool];
    for (let i = shuffledScouters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledScouters[i], shuffledScouters[j]] = [shuffledScouters[j], shuffledScouters[i]];
    }
    const newShifts = [];
    let scouterIndex = 0;

    for (let shiftNum = 0; shiftNum < numShifts; shiftNum++) {
      const startIndex = shiftNum * matchesPerShift;
      const endIndex =
        shiftNum === numShifts - 1
          ? startIndex + matchesPerShift + extraMatches
          : startIndex + matchesPerShift;

      const shiftStartMatch = sortedMatches[startIndex].matchNumber;
      const shiftEndMatch = sortedMatches[endIndex - 1].matchNumber;

      const shiftScouters = [];
      // Assign scouts to positions, wrapping around if needed
      for (let i = 0; i < shiftSize; i++) {
        if (scouterIndex < shuffledScouters.length) {
          shiftScouters.push({
            name: shuffledScouters[scouterIndex],
            position: i + 1,
          });
          scouterIndex++;
        }
      }

      newShifts.push({
        id: shiftNum + 1,
        scouterNames: shiftScouters.map((s) => s.name),
        startMatch: shiftStartMatch,
        endMatch: shiftEndMatch,
        scouterPositions: shiftScouters,
      });
    }

    setShifts(newShifts);
    console.log("Shifts generated:", newShifts.length, "shifts with", scouterIndex, "scouters assigned");

    // Generate per-scouter assignments
    const newAssignments = {};

    newShifts.forEach((shift) => {
      shift.scouterPositions.forEach((scouter) => {
        const scouterName = scouter.name;
        const position = scouter.position;
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

    setAssignments(newAssignments);
    saveAssignments(newAssignments);
    setShiftMode(true);
    
    // Show success message
    const totalAssignments = Object.keys(newAssignments).filter(k => !k.startsWith("match")).length;
    setSuccess(`Generated ${newShifts.length} shifts with ${totalAssignments} scouter assignments!`);
    setError("");
    
    // Clear success message after 5 seconds
    setTimeout(() => setSuccess(""), 5000);
  };

  // Regenerate assignments from shifts (called when shifts are edited)
  const regenerateAssignmentsFromShifts = () => {
    if (shifts.length === 0 || matches.length === 0) return;

    const sortedMatches = [...matches].sort((a, b) => a.matchNumber - b.matchNumber);
    const newAssignments = {};

    shifts.forEach((shift) => {
      shift.scouterPositions.forEach((scouter) => {
        const scouterName = scouter.name;
        const position = scouter.position;
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

    setAssignments(newAssignments);
    saveAssignments(newAssignments);
  };

  // Update a scouter in a shift
  const handleUpdateShiftScouter = (shiftIndex, positionIndex, newName) => {
    // Validate that the new name is in the scouter pool
    if (!scouterPool.includes(newName)) return;

    const newShifts = JSON.parse(JSON.stringify(shifts));
    newShifts[shiftIndex].scouterPositions[positionIndex].name = newName;
    newShifts[shiftIndex].scouterNames = newShifts[shiftIndex].scouterPositions.map(s => s.name);
    setShifts(newShifts);
    
    // Auto-regenerate assignments
    localStorage.setItem("shifts", JSON.stringify(newShifts));
    regenerateAssignmentsFromShifts();
  };

  // Legacy: Per-match auto-generate
  const handleAutoGenerateLegacy = () => {
    if (matches.length === 0 || scouterPool.length < 6) {
      setError("Need at least 6 scouters and matches imported");
      return;
    }

    const newAssignments = {};
    const poolCopy = [...scouterPool];
    let poolIndex = 0;

    matches.forEach((match) => {
      const key = `match${match.matchNumber}`;
      newAssignments[key] = {};

      for (let i = 0; i < 6; i++) {
        const slot = SLOT_POSITIONS[i];
        newAssignments[key][slot] = poolCopy[poolIndex % poolCopy.length];
        poolIndex++;
      }
    });

    setAssignments(newAssignments);
    saveAssignments(newAssignments);
    setShiftMode(false);
    setShifts([]);
  };

  // Navigate matches
  const goToPreviousMatch = () => {
    if (currentMatchIndex > 0) {
      setCurrentMatchIndex(currentMatchIndex - 1);
    }
  };

  const goToNextMatch = () => {
    if (currentMatchIndex < matches.length - 1) {
      setCurrentMatchIndex(currentMatchIndex + 1);
    }
  };

  const currentMatch = matches[currentMatchIndex];

  // Not authenticated - show password modal only
  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#1a1a1a",
        }}
      >
        <PasswordModal
          open={passwordModalOpen && !isAuthenticated}
          passwordInput={passwordInput}
          passwordError={passwordError}
          onPasswordChange={(e) => setPasswordInput(e.target.value)}
          onPasswordSubmit={handlePasswordSubmit}
          onKeyPress={(e) => e.key === "Enter" && handlePasswordSubmit()}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: "auto", pb: 10 }}>
      <Typography variant="h4" color="white" gutterBottom>
        Match Assignments
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Event + Schedule Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Event + Schedule Controls
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" gap={1}>
          <TextField
            label="Event Code (e.g., 2024casj)"
            value={eventCode}
            onChange={(e) => setEventCode(e.target.value)}
            size="small"
            sx={{ width: 250 }}
          />
          <Button variant="contained" onClick={handleImportMatches} disabled={loading}>
            {loading ? "Importing..." : "Import Matches"}
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleAutoGenerateShifts}
            disabled={matches.length === 0}
          >
            Auto Generate (Shift-Based)
          </Button>
          <Button
            variant="outlined"
            onClick={handleAutoGenerateLegacy}
            disabled={matches.length === 0}
          >
            Auto Generate (Per-Match)
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={() => {
              if (window.confirm("Clear all assignments and shifts? This cannot be undone.")) {
                setAssignments({});
                setShifts([]);
                localStorage.removeItem("matchAssignments");
                localStorage.removeItem("shifts");
                setSuccess("All assignments cleared!");
                setError("");
                setTimeout(() => setSuccess(""), 3000);
              }
            }}
          >
            Clear All
          </Button>
        </Stack>
        {matches.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Imported {matches.length} matches
          </Typography>
        )}
        {shifts.length > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <strong>Shift Coverage:</strong> {shifts.length} shifts | Matches {shifts[0]?.startMatch || 1}-{shifts[shifts.length-1]?.endMatch || 70} | {shifts.reduce((acc, s) => acc + (s.endMatch - s.startMatch + 1), 0)} total matches
          </Alert>
        )}
      </Paper>

      <Grid container spacing={3}>
        {/* Scouter Pool */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="h6">Scouter Pool</Typography>
              <IconButton size="small" onClick={() => setAddScouterModalOpen(true)}>
                <AddIcon />
              </IconButton>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ maxHeight: 400, overflow: "auto", display: "flex", flexWrap: "wrap", gap: 1 }}>
              {scouterPool.map((scouter) => (
                <Chip
                  key={scouter}
                  label={scouter}
                  draggable
                  onDragStart={() => handleDragStart(scouter)}
                  onDelete={() => handleRemoveScouter(scouter)}
                  sx={{ m: 0.25, cursor: "grab" }}
                  icon={<DragIndicatorIcon />}
                />
              ))}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              Drag scouters to assign them to match slots
            </Typography>
          </Paper>
        </Grid>

        {/* Shift Groups Panel - Only show when shifts exist */}
        {shifts.length > 0 && (
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, height: "100%", maxHeight: 600, overflow: "auto" }}>
              <Typography variant="h6" gutterBottom>
                Shift Groups
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {shifts.map((shift, shiftIndex) => (
                <Box key={shift.id} sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                    Shift {shift.id} (Matches {shift.startMatch}-{shift.endMatch})
                  </Typography>
                  <Stack spacing={1}>
                    {shift.scouterPositions.map((scouter, posIndex) => (
                      <FormControl key={posIndex} fullWidth size="small">
                        <InputLabel>Position {scouter.position}</InputLabel>
                        <Select
                          value={scouter.name}
                          label={`Position ${scouter.position}`}
                          onChange={(e) => handleUpdateShiftScouter(shiftIndex, posIndex, e.target.value)}
                        >
                          {scouterPool.map((s) => (
                            <MenuItem key={s} value={s}>{s}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ))}
                  </Stack>
                </Box>
              ))}
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                fullWidth
                onClick={regenerateAssignmentsFromShifts}
                sx={{ mt: 2 }}
              >
                Save Changes
              </Button>
            </Paper>
          </Grid>
        )}

        {/* Match Assignment Board */}
        <Grid item xs={12} md={9}>
          <Paper sx={{ p: 3 }}>
            {/* Match Navigation */}
            {matches.length > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                <IconButton onClick={goToPreviousMatch} disabled={currentMatchIndex === 0}>
                  <NavigateBeforeIcon />
                </IconButton>
                <Typography variant="h6">
                  Match {currentMatch?.matchNumber || "-"} of {matches.length}
                </Typography>
                <IconButton onClick={goToNextMatch} disabled={currentMatchIndex === matches.length - 1}>
                  <NavigateNextIcon />
                </IconButton>
              </Box>
            )}

            {currentMatch ? (
              <>
                {/* Match Info */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" color="text.secondary">
                    Match {currentMatch.matchNumber}
                  </Typography>
                </Box>

                {/* Red Alliance */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ color: "#e53935", fontWeight: "bold", mb: 1 }}>
                    RED ALLIANCE
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    {[0, 1, 2].map((idx) => {
                      const slot = `red${idx + 1}`;
                      const team = currentMatch.red[idx];
                      const assignedScouter = getAssignedScouter(currentMatch.matchNumber, slot);
                      return (
                        <Card
                          key={slot}
                          sx={{
                            flex: 1,
                            backgroundColor: ALLIANCE_COLORS[slot],
                            color: "white",
                            cursor: "pointer",
                            transition: "transform 0.2s",
                            "&:hover": { transform: "scale(1.02)" },
                          }}
                          onClick={() => handleSlotClick(currentMatch.matchNumber, slot)}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(currentMatch.matchNumber, slot)}
                        >
                          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                            <Typography variant="h6">{team || "-"}</Typography>
                            <Typography variant="body2">{assignedScouter || "[Empty]"}</Typography>
                            <Typography variant="caption">Position {idx + 1}</Typography>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                </Box>

                {/* Blue Alliance */}
                <Box>
                  <Typography variant="subtitle2" sx={{ color: "#1e88e5", fontWeight: "bold", mb: 1 }}>
                    BLUE ALLIANCE
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    {[0, 1, 2].map((idx) => {
                      const slot = `blue${idx + 1}`;
                      const team = currentMatch.blue[idx];
                      const assignedScouter = getAssignedScouter(currentMatch.matchNumber, slot);
                      return (
                        <Card
                          key={slot}
                          sx={{
                            flex: 1,
                            backgroundColor: ALLIANCE_COLORS[slot],
                            color: "white",
                            cursor: "pointer",
                            transition: "transform 0.2s",
                            "&:hover": { transform: "scale(1.02)" },
                          }}
                          onClick={() => handleSlotClick(currentMatch.matchNumber, slot)}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(currentMatch.matchNumber, slot)}
                        >
                          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                            <Typography variant="h6">{team || "-"}</Typography>
                            <Typography variant="body2">{assignedScouter || "[Empty]"}</Typography>
                            <Typography variant="caption">Position {idx + 1}</Typography>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                </Box>
              </>
            ) : (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Typography variant="h6" color="text.secondary">
                  No matches loaded
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Enter an event code and click "Import Matches" to get started
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Modals */}
      <PasswordModal
        open={passwordModalOpen && !isAuthenticated}
        passwordInput={passwordInput}
        passwordError={passwordError}
        onPasswordChange={(e) => setPasswordInput(e.target.value)}
        onPasswordSubmit={handlePasswordSubmit}
        onKeyPress={(e) => e.key === "Enter" && handlePasswordSubmit()}
      />
      <SelectionModal
        open={selectionModalOpen}
        selectedSlot={selectedSlot}
        scouterPool={scouterPool}
        onClose={() => setSelectionModalOpen(false)}
        onAssign={handleAssignScouter}
        onClear={() => handleAssignScouter(selectedSlot?.matchNumber, selectedSlot?.slot, null)}
        isScouterAssignedInMatch={isScouterAssignedInMatch}
      />
      <AddScouterModal
        open={addScouterModalOpen}
        newscouterName={newscouterName}
        onNameChange={(e) => setNewscouterName(e.target.value)}
        onAdd={handleAddScouter}
        onClose={() => setAddScouterModalOpen(false)}
        onKeyPress={(e) => e.key === "Enter" && handleAddScouter()}
      />
    </Box>
  );
}
