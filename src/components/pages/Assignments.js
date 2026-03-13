import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  Chip,
  Modal,
  Fade,
  Backdrop,
  IconButton,
  Divider,
  Stack,
  Alert,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Autocomplete,
  Tabs,
  Tab,
  AppBar,
  InputAdornment,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import firebase from "../../firebase";

// Default scouter pool
const DEFAULT_SCOUTERS = [
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
  "Wesley",
  "Dylan X",
  "Eric Y",
];

// Slot positions
const SLOT_POSITIONS = ["red1", "red2", "red3", "blue1", "blue2", "blue3"];

// Alliance colors
const ALLIANCE_COLORS = {
  red1: "#e53935",
  red2: "#d32f2f",
  red3: "#c62828",
  blue1: "#1e88e5",
  blue2: "#1976d2",
  blue3: "#1565c0",
};

// Generate verification code from scouter name and match number
const generateVerificationCode = (scouterName, matchNumber, alliance) => {
  if (!scouterName || !matchNumber) return "";
  const initials = scouterName.substring(0, 2).toUpperCase();
  const matchSuffix = matchNumber.toString().padStart(2, "0");
  const allianceChar = alliance === "Red" ? "R" : "B";
  return `${initials}${matchSuffix}${allianceChar}`;
};

export default function Assignments() {
  // Tab state
  const [tab, setTab] = useState(0);

  // Password protection for admin
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  // Event and schedule
  const [eventCode, setEventCode] = useState("");
  const [matches, setMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Scouter pool
  const [scouterPool, setScouterPool] = useState(DEFAULT_SCOUTERS);
  const [newscouterName, setNewscouterName] = useState("");
  const [addScouterModalOpen, setAddScouterModalOpen] = useState(false);

  // Assignments
  const [assignments, setAssignments] = useState({});
  const [shifts, setShifts] = useState([]);

  // Selection modal
  const [selectionModalOpen, setSelectionModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Drag state
  const [draggedScouter, setDraggedScouter] = useState(null);

  // Scouter search (for My Assignments tab)
  const [searchName, setSearchName] = useState("");
  const [selectedScouter, setSelectedScouter] = useState(null);

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
        // Filter to only include official scouter names
        const filtered = parsed.filter(name => DEFAULT_SCOUTERS.includes(name));
        setScouterPool(filtered.length > 0 ? filtered : DEFAULT_SCOUTERS);
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
        setShifts(JSON.parse(savedShifts));
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
          localStorage.setItem(
            "matchAssignments",
            JSON.stringify(firestoreAssignments)
          );
        }
      } catch (err) {
        console.log("Using localStorage assignments:", err.message);
      }
    };

    loadData();
  }, []);

  // Listen for assignment updates from other components
  useEffect(() => {
    const handleAssignmentsUpdated = () => {
      const savedAssignments = localStorage.getItem("matchAssignments");
      if (savedAssignments) {
        setAssignments(JSON.parse(savedAssignments));
      }
    };

    window.addEventListener("assignmentsUpdated", handleAssignmentsUpdated);
    return () => window.removeEventListener("assignmentsUpdated", handleAssignmentsUpdated);
  }, []);

  // Real-time Firebase sync
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(firebase, "assignments"),
      (snapshot) => {
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
          localStorage.setItem(
            "matchAssignments",
            JSON.stringify(firestoreAssignments)
          );
        }
      },
      (error) => {
        console.log("Firebase sync error:", error.message);
      }
    );

    return () => unsubscribe();
  }, []);

  // Save assignments
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

  // Save shifts
  useEffect(() => {
    if (shifts.length > 0) {
      localStorage.setItem("shifts", JSON.stringify(shifts));
    }
  }, [shifts]);

  // Save scouter pool
  useEffect(() => {
    localStorage.setItem("scouterPool", JSON.stringify(scouterPool));
  }, [scouterPool]);

  // Save event code
  useEffect(() => {
    if (eventCode) {
      localStorage.setItem("eventCode", eventCode);
    }
  }, [eventCode]);

  // Password validation
  const handlePasswordSubmit = () => {
    const adminPassword =
      process.env.REACT_APP_ADMIN_PASSWORD || "scoutx2026";
    if (passwordInput === adminPassword) {
      setIsAuthenticated(true);
      setPasswordModalOpen(false);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  // Import matches from TBA
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
        setError(
          "TBA API Key not configured. Please add REACT_APP_TBA_API_KEY to .env file."
        );
        setLoading(false);
        return;
      }

      const response = await fetch(
        `https://www.thebluealliance.com/api/v3/event/${eventCode}/matches/simple`,
        {
          headers: {
            "X-TBA-Auth-Key": tbaApiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch matches: ${response.status}`);
      }

      const data = await response.json();

      const qualMatches = data
        .filter((match) => match.comp_level === "qm")
        .sort((a, b) => a.match_number - b.match_number)
        .map((match) => ({
          matchNumber: match.match_number,
          red: [
            match.alliances.red.team_keys.map((t) =>
              parseInt(t.replace("frc", ""))
            )[0],
            match.alliances.red.team_keys.map((t) =>
              parseInt(t.replace("frc", ""))
            )[1],
            match.alliances.red.team_keys.map((t) =>
              parseInt(t.replace("frc", ""))
            )[2],
          ],
          blue: [
            match.alliances.blue.team_keys.map((t) =>
              parseInt(t.replace("frc", ""))
            )[0],
            match.alliances.blue.team_keys.map((t) =>
              parseInt(t.replace("frc", ""))
            )[1],
            match.alliances.blue.team_keys.map((t) =>
              parseInt(t.replace("frc", ""))
            )[2],
          ],
        }));

      setMatches(qualMatches);
      setCurrentMatchIndex(0);
      localStorage.setItem("eventMatches", JSON.stringify(qualMatches));
      setAssignments({});
      setShifts([]);
    } catch (err) {
      setError(err.message || "Failed to import matches");
    } finally {
      setLoading(false);
    }
  };

  // Get assigned scouter
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

  // Check if scouter assigned in match
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

  // Slot click handler
  const handleSlotClick = (matchNumber, slot) => {
    setSelectedSlot({ matchNumber, slot });
    setSelectionModalOpen(true);
  };

  // Drag handlers
  const handleDragStart = (scouterName) => {
    setDraggedScouter(scouterName);
  };

  const handleDrop = (matchNumber, slot) => {
    if (draggedScouter) {
      const assignedInMatch = getAssignedScoutersInMatch(matchNumber);
      if (!assignedInMatch.includes(draggedScouter)) {
        handleAssignScouter(matchNumber, slot, draggedScouter);
      }
      setDraggedScouter(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Add/remove scouter
  const handleAddScouter = () => {
    if (
      newscouterName.trim() &&
      !scouterPool.includes(newscouterName.trim())
    ) {
      setScouterPool([...scouterPool, newscouterName.trim()]);
      setNewscouterName("");
      setAddScouterModalOpen(false);
    }
  };

  const handleRemoveScouter = (name) => {
    setScouterPool(scouterPool.filter((s) => s !== name));
  };

  // Shift-based Auto-generate
  const handleAutoGenerateShifts = () => {
    if (matches.length === 0 || scouterPool.length < 6) {
      setError("Need at least 6 scouters and matches imported");
      return;
    }

    const shiftSize = 6;
    const numShifts = Math.floor(scouterPool.length / shiftSize);

    if (numShifts < 1) {
      setError("Need at least 6 scouters for a shift");
      return;
    }

    const totalMatches = matches.length;
    const matchesPerShift = Math.floor(totalMatches / numShifts);

    const shuffledScouters = [...scouterPool].sort(() => Math.random() - 0.5);
    const newShifts = [];
    let scouterIndex = 0;

    for (let shiftNum = 0; shiftNum < numShifts; shiftNum++) {
      const shiftStartMatch = shiftNum * matchesPerShift + 1;
      const shiftEndMatch =
        shiftNum === numShifts - 1
          ? shiftStartMatch + matchesPerShift + (totalMatches % numShifts) - 1
          : shiftStartMatch + matchesPerShift - 1;

      const shiftScouters = [];
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

    const newAssignments = {};

    newShifts.forEach((shift) => {
      shift.scouterPositions.forEach((scouter) => {
        const scouterName = scouter.name;
        const position = scouter.position;
        const slotIndex = position - 1;
        const isRed = slotIndex < 3;
        const slotTeamIndex = slotIndex % 3;
        const slot = isRed
          ? `red${slotTeamIndex + 1}`
          : `blue${slotTeamIndex + 1}`;
        const alliance = isRed ? "Red" : "Blue";

        const scouterAssignments = [];

        for (
          let matchNum = shift.startMatch;
          matchNum <= shift.endMatch;
          matchNum++
        ) {
          const match = matches.find((m) => m.matchNumber === matchNum);
          if (match) {
            const team = isRed
              ? match.red[slotTeamIndex]
              : match.blue[slotTeamIndex];
            const verificationCode = generateVerificationCode(
              scouterName,
              matchNum,
              alliance
            );

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
          }
        }

        newAssignments[scouterName] = scouterAssignments;
      });
    });

    setAssignments(newAssignments);
    saveAssignments(newAssignments);
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

  // Get scouter assignments
  const getScouterAssignments = (scouterName) => {
    const result = [];
    const matchKeys = Object.keys(assignments).filter(k => k.startsWith("match"));
    
    for (const key of matchKeys) {
      const matchNum = parseInt(key.replace("match", ""));
      const matchData = assignments[key];
      
      for (const slot of SLOT_POSITIONS) {
        if (matchData[slot] === scouterName) {
          // Find the match in matches array
          const matchInfo = matches.find(m => m.match_number === matchNum);
          const isRed = slot.startsWith("red");
          const position = parseInt(slot.replace(isRed ? "red" : "blue", ""));
          
          // Get team number
          let teamNumber = "TBD";
          if (matchInfo) {
            const teams = isRed ? matchInfo.red : matchInfo.blue;
            if (teams && teams[position - 1]) {
              teamNumber = teams[position - 1];
            }
          }
          
          result.push({
            match: matchNum,
            slot: slot,
            alliance: isRed ? "Red" : "Blue",
            position: position,
            team: teamNumber,
            verificationCode: generateVerificationCode(scouterName, matchNum, isRed ? "Red" : "Blue"),
            completed: false
          });
        }
      }
    }
    
    return result;
  };

  // Get scouter's shift
  const getScouterShift = (scouterName) => {
    for (const shift of shifts) {
      if (
        shift.scouterNames &&
        shift.scouterNames.includes(scouterName)
      ) {
        return shift;
      }
    }
    return null;
  };

  // Filter scouters for search
  const scouterList = scouterPool;
  
  const filteredScouters = scouterList.filter((name) =>
    name.toLowerCase().includes(searchName.toLowerCase())
  );

  // Group scouters alphabetically
  const groupedScouters = filteredScouters.reduce((acc, name) => {
    const firstLetter = name.charAt(0).toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(name);
    return acc;
  }, {});

  const handleSelectScouter = (name) => {
    setSelectedScouter(name);
  };

  const scouterAssignmentsList = selectedScouter
    ? getScouterAssignments(selectedScouter)
    : [];

  const getCompletionStats = () => {
    if (!scouterAssignmentsList || scouterAssignmentsList.length === 0) {
      return { completed: 0, total: 0 };
    }
    const completed = scouterAssignmentsList.filter((a) => a.completed).length;
    return { completed, total: scouterAssignmentsList.length };
  };

  const stats = getCompletionStats();

  // Password Modal - only shows for Admin tab when not authenticated
  const passwordModal = (
    <Modal
      open={passwordModalOpen && !isAuthenticated && tab === 0}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{
        backdrop: { timeout: 500 },
      }}
    >
      <Fade in={passwordModalOpen && !isAuthenticated && tab === 0}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            borderRadius: 2,
            p: 4,
            textAlign: "center",
          }}
        >
          <Typography variant="h5" gutterBottom>
            Admin Access Required
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enter password to access Match Assignments
          </Typography>
          <TextField
            fullWidth
            type="password"
            label="Password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            error={passwordError}
            helperText={passwordError ? "Incorrect password" : ""}
            onKeyPress={(e) => e.key === "Enter" && handlePasswordSubmit()}
            sx={{ mb: 2 }}
          />
          <Button variant="contained" fullWidth onClick={handlePasswordSubmit}>
            Submit
          </Button>
        </Box>
      </Fade>
    </Modal>
  );

  // Selection Modal
  const selectionModal = (
    <Modal
      open={selectionModalOpen}
      onClose={() => setSelectionModalOpen(false)}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{
        backdrop: { timeout: 500 },
      }}
    >
      <Fade in={selectionModalOpen}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            maxHeight: "80vh",
            bgcolor: "background.paper",
            borderRadius: 2,
            p: 3,
            overflow: "auto",
          }}
        >
          <Typography variant="h6" gutterBottom>
            Select Scouter for {selectedSlot?.slot}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {scouterPool.map((scouter) => {
              const isAssigned =
                selectedSlot &&
                isScouterAssignedInMatch(scouter, selectedSlot.matchNumber);
              return (
                <Chip
                  key={scouter}
                  label={scouter}
                  onClick={() => {
                    if (!isAssigned && selectedSlot) {
                      handleAssignScouter(
                        selectedSlot.matchNumber,
                        selectedSlot.slot,
                        scouter
                      );
                    }
                  }}
                  disabled={isAssigned}
                  color={isAssigned ? "default" : "primary"}
                  variant={isAssigned ? "outlined" : "filled"}
                  sx={{
                    m: 0.5,
                    cursor: isAssigned ? "not-allowed" : "pointer",
                    opacity: isAssigned ? 0.5 : 1,
                  }}
                />
              );
            })}
          </Box>
          <Button
            fullWidth
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={() => {
              if (selectedSlot) {
                handleAssignScouter(selectedSlot.matchNumber, selectedSlot.slot, null);
              }
            }}
          >
            Clear Assignment
          </Button>
        </Box>
      </Fade>
    </Modal>
  );

  // Add Scouter Modal
  const addScouterModal = (
    <Modal
      open={addScouterModalOpen}
      onClose={() => setAddScouterModalOpen(false)}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{
        backdrop: { timeout: 500 },
      }}
    >
      <Fade in={addScouterModalOpen}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 350,
            bgcolor: "background.paper",
            borderRadius: 2,
            p: 3,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Add New Scouter
          </Typography>
          <TextField
            fullWidth
            label="Scouter Name"
            value={newscouterName}
            onChange={(e) => setNewscouterName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddScouter()}
            sx={{ mb: 2 }}
          />
          <Stack direction="row" spacing={2}>
            <Button variant="contained" fullWidth onClick={handleAddScouter}>
              Add
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => setAddScouterModalOpen(false)}
            >
              Cancel
            </Button>
          </Stack>
        </Box>
      </Fade>
    </Modal>
  );

  // Render Tab Panel
  function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
      <div hidden={value !== index} {...other}>
        {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
      </div>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: "auto", pb: 10 }}>
      <Typography variant="h4" color="white" gutterBottom>
        Assignments
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Password Modal */}
      {passwordModal}

      {/* Tabs */}
      <AppBar position="static" color="default">
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Match Assignments (Admin)" />
          <Tab label="My Assignments" />
        </Tabs>
      </AppBar>

      {/* Tab 0: Match Assignments (Admin) */}
      <TabPanel value={tab} index={0}>
        {!isAuthenticated ? (
          <Box
            sx={{
              minHeight: "50vh",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Typography variant="h6" color="text.secondary">
              Admin Access Required
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => setPasswordModalOpen(true)}
            >
              Enter Admin Password
            </Button>
          </Box>
        ) : (
          <>
            {/* Event Controls */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Event + Schedule Controls
              </Typography>
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                flexWrap="wrap"
                gap={1}
              >
                <TextField
                  label="Event Code (e.g., 2024casj)"
                  value={eventCode}
                  onChange={(e) => setEventCode(e.target.value)}
                  size="small"
                  sx={{ width: 250 }}
                />
                <Button
                  variant="contained"
                  onClick={handleImportMatches}
                  disabled={loading}
                >
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
              </Stack>
              {matches.length > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Imported {matches.length} matches
                </Typography>
              )}
              {shifts.length > 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Generated {shifts.length} shifts with{" "}
                  {shifts[0]?.endMatch - shifts[0]?.startMatch + 1} matches per
                  shift
                </Alert>
              )}
            </Paper>

            <Grid container spacing={3}>
              {/* Scouter Pool */}
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, height: "100%" }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 1,
                    }}
                  >
                    <Typography variant="h6">Scouter Pool</Typography>
                    <IconButton
                      size="small"
                      onClick={() => setAddScouterModalOpen(true)}
                    >
                      <AddIcon />
                    </IconButton>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Box
                    sx={{
                      maxHeight: 400,
                      overflow: "auto",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1,
                    }}
                  >
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
                </Paper>
              </Grid>

              {/* Match Board */}
              <Grid item xs={12} md={9}>
                <Paper sx={{ p: 3 }}>
                  {matches.length > 0 && (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 3,
                      }}
                    >
                      <IconButton
                        onClick={goToPreviousMatch}
                        disabled={currentMatchIndex === 0}
                      >
                        <NavigateBeforeIcon />
                      </IconButton>
                      <Typography variant="h6">
                        Match {currentMatch?.matchNumber || "-"} of{" "}
                        {matches.length}
                      </Typography>
                      <IconButton
                        onClick={goToNextMatch}
                        disabled={currentMatchIndex === matches.length - 1}
                      >
                        <NavigateNextIcon />
                      </IconButton>
                    </Box>
                  )}

                  {currentMatch ? (
                    <>
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" color="text.secondary">
                          Match {currentMatch.matchNumber}
                        </Typography>
                      </Box>

                      {/* Red Alliance */}
                      <Box sx={{ mb: 3 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{ color: "#e53935", fontWeight: "bold", mb: 1 }}
                        >
                          RED ALLIANCE
                        </Typography>
                        <Stack direction="row" spacing={2}>
                          {[0, 1, 2].map((idx) => {
                            const slot = `red${idx + 1}`;
                            const team = currentMatch.red[idx];
                            const assignedScouter = getAssignedScouter(
                              currentMatch.matchNumber,
                              slot
                            );
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
                                onClick={() =>
                                  handleSlotClick(currentMatch.matchNumber, slot)
                                }
                                onDragOver={handleDragOver}
                                onDrop={() =>
                                  handleDrop(currentMatch.matchNumber, slot)
                                }
                              >
                                <CardContent
                                  sx={{ p: 2, "&:last-child": { pb: 2 } }}
                                >
                                  <Typography variant="h6">
                                    {team || "-"}
                                  </Typography>
                                  <Typography variant="body2">
                                    {assignedScouter || "[Empty]"}
                                  </Typography>
                                  <Typography variant="caption">
                                    Position {idx + 1}
                                  </Typography>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </Stack>
                      </Box>

                      {/* Blue Alliance */}
                      <Box>
                        <Typography
                          variant="subtitle2"
                          sx={{ color: "#1e88e5", fontWeight: "bold", mb: 1 }}
                        >
                          BLUE ALLIANCE
                        </Typography>
                        <Stack direction="row" spacing={2}>
                          {[0, 1, 2].map((idx) => {
                            const slot = `blue${idx + 1}`;
                            const team = currentMatch.blue[idx];
                            const assignedScouter = getAssignedScouter(
                              currentMatch.matchNumber,
                              slot
                            );
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
                                onClick={() =>
                                  handleSlotClick(currentMatch.matchNumber, slot)
                                }
                                onDragOver={handleDragOver}
                                onDrop={() =>
                                  handleDrop(currentMatch.matchNumber, slot)
                                }
                              >
                                <CardContent
                                  sx={{ p: 2, "&:last-child": { pb: 2 } }}
                                >
                                  <Typography variant="h6">
                                    {team || "-"}
                                  </Typography>
                                  <Typography variant="body2">
                                    {assignedScouter || "[Empty]"}
                                  </Typography>
                                  <Typography variant="caption">
                                    Position {idx + 1}
                                  </Typography>
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
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </>
        )}
      </TabPanel>

      {/* Tab 1: My Assignments */}
      <TabPanel value={tab} index={1}>
        <Grid container spacing={3}>
          {/* Left Panel - Search and List */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Find Your Assignments
              </Typography>

              <TextField
                fullWidth
                placeholder="Search for your name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />

              <Box sx={{ maxHeight: 500, overflow: "auto" }}>
                {Object.keys(groupedScouters)
                  .sort()
                  .map((letter) => (
                    <Box key={letter} sx={{ mb: 1 }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: "bold" }}
                      >
                        {letter}
                      </Typography>
                      {groupedScouters[letter].map((name) => (
                        <Box
                          key={name}
                          onClick={() => handleSelectScouter(name)}
                          sx={{
                            p: 1,
                            cursor: "pointer",
                            borderRadius: 1,
                            backgroundColor:
                              selectedScouter === name
                                ? "primary.main"
                                : "transparent",
                            color:
                              selectedScouter === name
                                ? "white"
                                : "text.primary",
                            "&:hover": {
                              backgroundColor:
                                selectedScouter === name
                                  ? "primary.dark"
                                  : "action.hover",
                            },
                            transition: "background-color 0.2s",
                          }}
                        >
                          {name}
                        </Box>
                      ))}
                    </Box>
                  ))}
              </Box>
            </Paper>
          </Grid>

          {/* Right Panel - Assignment Details */}
          <Grid item xs={12} md={8}>
            {selectedScouter ? (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom>
                  {selectedScouter}
                </Typography>

                {(() => {
                  const shift = getScouterShift(selectedScouter);
                  if (shift) {
                    return (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Your Shift: {shift.startMatch} - {shift.endMatch} (
                        {shift.endMatch - shift.startMatch + 1} matches)
                      </Alert>
                    );
                  }
                  return null;
                })()}

                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <Card sx={{ flex: 1 }}>
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Typography variant="h4" color="primary">
                        {stats.completed}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Completed
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card sx={{ flex: 1 }}>
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Typography variant="h4" color="text.secondary">
                        {stats.total}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Matches
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card sx={{ flex: 1 }}>
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Typography
                        variant="h4"
                        color={
                          stats.total > 0 ? "success.main" : "text.secondary"
                        }
                      >
                        {stats.total > 0
                          ? Math.round((stats.completed / stats.total) * 100)
                          : 0}
                        %
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Progress
                      </Typography>
                    </CardContent>
                  </Card>
                </Stack>

                <Divider sx={{ my: 2 }} />

                {scouterAssignmentsList.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Match</TableCell>
                          <TableCell>Team</TableCell>
                          <TableCell>Alliance</TableCell>
                          <TableCell>Position</TableCell>
                          <TableCell>Verification</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {scouterAssignmentsList
                          .sort((a, b) => a.match - b.match)
                          .map((assignment) => (
                            <TableRow key={assignment.match}>
                              <TableCell>{assignment.match}</TableCell>
                              <TableCell>{assignment.team}</TableCell>
                              <TableCell>
                                <Chip
                                  label={assignment.alliance}
                                  size="small"
                                  sx={{
                                    backgroundColor:
                                      assignment.alliance === "Red"
                                        ? "#e53935"
                                        : "#1e88e5",
                                    color: "white",
                                  }}
                                />
                              </TableCell>
                              <TableCell>{assignment.position}</TableCell>
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  fontFamily="monospace"
                                  fontWeight="bold"
                                >
                                  {assignment.verificationCode}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {assignment.completed ? (
                                  <Chip
                                    icon={<CheckCircleIcon />}
                                    label="Completed"
                                    color="success"
                                    size="small"
                                  />
                                ) : (
                                  <Chip
                                    icon={<RadioButtonUncheckedIcon />}
                                    label="Pending"
                                    color="default"
                                    size="small"
                                  />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info">
                    No assignments found for {selectedScouter}.
                  </Alert>
                )}
              </Paper>
            ) : (
              <Paper sx={{ p: 4, textAlign: "center" }}>
                <Typography variant="h6" color="text.secondary">
                  Select your name from the list to view your assignments
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      </TabPanel>

      {/* Modals */}
      {selectionModal}
      {addScouterModal}
    </Box>
  );
}

// Export functions for external use
export const getAssignmentForScouter = (scouterName, matchNumber) => {
  const savedAssignments = localStorage.getItem("matchAssignments");
  if (!savedAssignments) return null;

  const allAssignments = JSON.parse(savedAssignments);

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

  return null;
};

export const getNextAssignment = (scouterName) => {
  const savedAssignments = localStorage.getItem("matchAssignments");
  if (!savedAssignments) return null;

  const allAssignments = JSON.parse(savedAssignments);
  const scouterAssignments = allAssignments[scouterName];

  if (!scouterAssignments) return null;

  // Find first incomplete assignment
  const nextAssignment = scouterAssignments.find((a) => !a.completed);
  return nextAssignment || null;
};

export const markAssignmentComplete = async (scouterName, matchNumber) => {
  const savedAssignments = localStorage.getItem("matchAssignments");
  if (!savedAssignments) return;

  const allAssignments = JSON.parse(savedAssignments);

  if (allAssignments[scouterName]) {
    const assignments = allAssignments[scouterName];
    const idx = assignments.findIndex(
      (a) => a.match === parseInt(matchNumber)
    );
    if (idx !== -1) {
      assignments[idx].completed = true;
      allAssignments[scouterName] = assignments;

      localStorage.setItem(
        "matchAssignments",
        JSON.stringify(allAssignments)
      );

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

export const getAllAssignments = () => {
  const savedAssignments = localStorage.getItem("matchAssignments");
  return savedAssignments ? JSON.parse(savedAssignments) : {};
};

export const getScouterList = () => {
  const savedScouters = localStorage.getItem("scouterPool");
  return savedScouters
    ? JSON.parse(savedScouters).sort()
    : DEFAULT_SCOUTERS;
};

export const getShifts = () => {
  const savedShifts = localStorage.getItem("shifts");
  return savedShifts ? JSON.parse(savedShifts) : [];
};
