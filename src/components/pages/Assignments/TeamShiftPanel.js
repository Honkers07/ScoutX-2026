import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  TextField,
  Button,
  Alert,
  Typography,
  Paper,
  Stack,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import EventIcon from "@mui/icons-material/Event";
import ShiftPanel from "./ShiftPanel";
import ScouterList from "./ScouterList";
import ScouterSelectionModal from "./ScouterSelectionModal";
import {
  getScouterList,
  getShifts,
  getMatches,
  getEventCode,
  getAllAssignments,
  generateShifts,
  regenerateAssignmentsFromShifts,
  updateShiftScouter,
  importMatchesFromTBA,
  saveShiftsBoth,
  saveAssignmentsBoth,
  saveMatchesBoth,
  saveScouterPool,
  initializeDefaultScouterPool,
  removeScouterFromPool,
  addScouterToPool,
  subscribeToShifts,
  subscribeToAssignments,
  subscribeToMatches,
  cleanupAllListeners,
  loadShiftsFromFirestore,
  loadAssignmentsFromFirestore,
  saveScouterPoolToFirestore,
  loadScouterPoolFromFirestore,
  subscribeToGlobalScouterPool,
} from "./AssignmentHelpers";
import { doc, onSnapshot, collection } from "firebase/firestore";
import { useAuth } from "../../AuthContext";
import firebase from "../../../firebase";

export default function TeamShiftPanel({ 
  teamNumber: initialTeamNumber = null,
  showTeamSelector = true,
  compact = false,
  onTeamChange = null,
}) {
  const { user, getAllTeams, getTeamScouters, removeScouter, addScouter } = useAuth();
  const [teamNumber, setTeamNumber] = useState(initialTeamNumber);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [eventCode, setEventCode] = useState(() => getEventCode(teamNumber));
  const [tbaApiKey, setTbaApiKey] = useState(() => localStorage.getItem("tbaApiKey") || "");
  const [matches, setMatches] = useState([]);
  const [scouterList, setScouterList] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingEnabled, setEditingEnabled] = useState(false);
  const [selectionModalOpen, setSelectionModalOpen] = useState(false);
  const [selectedScoutersForShift, setSelectedScoutersForShift] = useState([]);

  // Handle team change
  const handleTeamChange = (newTeamNumber) => {
    setTeamNumber(newTeamNumber);
    if (onTeamChange) {
      onTeamChange(newTeamNumber);
    }
  };

  // Handle opening selection modal with all scouters pre-selected
  const handleOpenSelectionModal = () => {
    // Ensure we have scouters loaded (use already loaded list from Firestore)
    if (scouterList.length > 0) {
      setSelectedScoutersForShift([...scouterList]);
      setSelectionModalOpen(true);
    } else {
      // Fallback to localStorage if no team selected
      const scouts = getScouterList(teamNumber);
      setScouterList(scouts);
      setSelectedScoutersForShift([...scouts]);
      setSelectionModalOpen(true);
    }
  };

  // Load initial data from Firestore and set up real-time listeners
  useEffect(() => {
    const loadData = async () => {
      // Initialize default scouter pool if no team selected
      if (!teamNumber) {
        initializeDefaultScouterPool(null);
      }

      if (!teamNumber) {
        // Load available teams if no team selected
        const teams = await getAllTeams();
        setAvailableTeams(teams);
        
        // Try to load global scouter pool from Firestore first (authoritative)
        try {
          const firestoreScouters = await loadScouterPoolFromFirestore();
          if (firestoreScouters && firestoreScouters.length > 0) {
            setScouterList(firestoreScouters);
            saveScouterPool(firestoreScouters, null);
            return;
          }
        } catch (error) {
          console.error("Error loading global scouter pool:", error);
        }
        
        // Fallback to local default pool
        const defaultScouters = getScouterList(null);
        setScouterList(defaultScouters);
        return;
      }

      // First load from localStorage (fast)
      const localMatches = getMatches(teamNumber);
      setMatches(localMatches);

      // Get scouter list from Firestore for this team - this is the authoritative source
      const teamScouters = await getTeamScouters(teamNumber);
      setScouterList(teamScouters);
      
      // Also save to localStorage for other components that might need it
      if (teamScouters.length > 0) {
        saveScouterPool(teamScouters, teamNumber);
      }

      const localShifts = getShifts(teamNumber);
      setShifts(localShifts);

      // Then try to load from Firestore (authoritative)
      try {
        const [firestoreShifts, firestoreAssignments] = await Promise.all([
          loadShiftsFromFirestore(teamNumber),
          loadAssignmentsFromFirestore(teamNumber),
        ]);
        
        if (firestoreShifts && firestoreShifts.length > 0) {
          setShifts(firestoreShifts);
        }
      } catch (error) {
        console.error("Error loading from Firestore:", error);
      }
    };

    loadData();

    // Set up real-time listeners for shifts and assignments
    const unsubscribeShifts = subscribeToShifts((updatedShifts) => {
      setShifts(updatedShifts);
    }, teamNumber);

    const unsubscribeAssignments = subscribeToAssignments(() => {
      // Trigger storage event for other components
      window.dispatchEvent(new Event("assignmentsUpdated"));
    });

    // Listen for storage changes (from other tabs/windows)
    const handleStorageChange = () => {
      const loadedMatches = getMatches(teamNumber);
      setMatches(loadedMatches);
      const loadedScouters = getScouterList(teamNumber);
      setScouterList(loadedScouters);
      const loadedShifts = getShifts(teamNumber);
      setShifts(loadedShifts);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("assignmentsUpdated", handleStorageChange);

    // Real-time listener for teams (for team list)
    const unsubscribeTeams = onSnapshot(collection(firebase, "teams"), (snapshot) => {
      const teams = [];
      snapshot.forEach((doc) => {
        teams.push({ id: doc.id, ...doc.data() });
      });
      setAvailableTeams(teams.sort((a, b) => a.teamNumber - b.teamNumber));
    });

    // Real-time listener for specific team's scouters - THIS IS KEY for real-time updates
    const unsubscribeTeamScouters = teamNumber ? onSnapshot(doc(firebase, "teams", teamNumber.toString()), (docSnap) => {
      if (docSnap.exists()) {
        const teamData = docSnap.data();
        const firestoreScouters = teamData.scouters || [];
        setScouterList(firestoreScouters);
        // Also sync to localStorage
        saveScouterPool(firestoreScouters, teamNumber);
      } else {
        setScouterList([]);
      }
    }) : null;

    // Real-time listener for global scouter pool (when no team selected)
    const unsubscribeGlobalScouters = !teamNumber ? subscribeToGlobalScouterPool((updatedScouters) => {
      if (updatedScouters && updatedScouters.length > 0) {
        setScouterList(updatedScouters);
        saveScouterPool(updatedScouters, null);
      }
    }) : null;

    // Listen for scouter pool updates from other components
    const handleScouterPoolUpdate = () => {
      const loadedScouters = getScouterList(null);
      setScouterList(loadedScouters);
    };
    window.addEventListener("scouterPoolUpdated", handleScouterPoolUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("assignmentsUpdated", handleStorageChange);
      window.removeEventListener("scouterPoolUpdated", handleScouterPoolUpdate);
      if (unsubscribeShifts) unsubscribeShifts();
      if (unsubscribeAssignments) unsubscribeAssignments();
      if (unsubscribeTeams) unsubscribeTeams();
      if (unsubscribeTeamScouters) unsubscribeTeamScouters();
      if (unsubscribeGlobalScouters) unsubscribeGlobalScouters();
    };
  }, [teamNumber, getAllTeams, getTeamScouters]);

  // Handle import matches from TBA
  const handleImportMatches = async () => {
    if (!eventCode) {
      setError("Please enter an event code");
      return;
    }

    if (!tbaApiKey) {
      setError("Please enter your TBA API key");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const importedMatches = await importMatchesFromTBA(eventCode, tbaApiKey);
      setMatches(importedMatches);
      
      // Save to both localStorage and Firestore
      await saveMatchesBoth(importedMatches, eventCode);
      
      setSuccess(`Successfully imported ${importedMatches.length} matches`);
    } catch (err) {
      setError(`Failed to import matches: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle auto-generate shifts
  const handleGenerateShifts = async (scoutersToUse = null) => {
    const scouts = scoutersToUse || scouterList;
    
    if (matches.length === 0) {
      setError("Please import matches first");
      return;
    }

    if (scouts.length === 0) {
      setError("No scouters available");
      return;
    }

    setError("");
    setLoading(true);
    
    try {
      const generatedShifts = generateShifts(scouts, matches.length);
      setShifts(generatedShifts);
      
      // Save to both localStorage and Firestore
      await saveShiftsBoth(generatedShifts, teamNumber);
      
      // Regenerate assignments
      regenerateAssignmentsFromShifts(teamNumber);
      
      // Also save assignments to Firestore
      const assignments = getAllAssignments(teamNumber);
      await saveAssignmentsBoth(assignments, teamNumber);
      
      setSuccess(`Generated ${generatedShifts.length} shifts with ${scouts.length} scouters`);
    } catch (error) {
      console.error("Error generating shifts:", error);
      setError("Failed to save shifts to Firebase");
    } finally {
      setLoading(false);
    }
  };

  // Handle shift scouter update
  const handleUpdateShiftScouter = async (shiftIndex, positionIndex, newName) => {
    await updateShiftScouter(shiftIndex, positionIndex, newName, teamNumber);
    // Reload shifts after update
    const updatedShifts = getShifts(teamNumber);
    setShifts(updatedShifts);
  };

  // Handle remove scouter from team
  const handleRemoveScouter = async (scouterName) => {
    if (!window.confirm(`Are you sure you want to remove "${scouterName}" from ${teamNumber ? `Team ${teamNumber}` : "the default pool"}?`)) {
      return;
    }
    
    setLoading(true);
    try {
      if (teamNumber) {
        // Remove from Firebase team
        const result = await removeScouter(scouterName, teamNumber);
        if (result.success) {
          setSuccess(`Removed ${scouterName} from the team`);
          // Reload scouter list
          const updatedScouters = await getTeamScouters(teamNumber);
          setScouterList(updatedScouters);
        } else {
          setError(result.error || "Failed to remove scouter");
        }
      } else {
        // Remove from global/default pool - now syncs to Firestore
        removeScouterFromPool(scouterName, null);
        
        // Also save to Firestore for global sync
        const updatedScouters = getScouterList(null);
        await saveScouterPoolToFirestore(updatedScouters);
        
        setSuccess(`Removed ${scouterName} from the default pool`);
        setScouterList(updatedScouters);
        
        // Notify other components
        window.dispatchEvent(new Event("scouterPoolUpdated"));
      }
    } catch (error) {
      console.error("Error removing scouter:", error);
      setError("Failed to remove scouter");
    } finally {
      setLoading(false);
    }
  };

  // Handle add scouter to team
  const handleAddScouter = async (scouterName) => {
    if (!scouterName.trim()) {
      setError("Scouter name cannot be empty");
      return;
    }
    
    setLoading(true);
    try {
      if (teamNumber) {
        // Add to Firebase team
        const result = await addScouter(scouterName.trim(), teamNumber);
        if (result.success) {
          setSuccess(`Added ${scouterName} to Team ${teamNumber}`);
          // Reload scouter list
          const updatedScouters = await getTeamScouters(teamNumber);
          setScouterList(updatedScouters);
        } else {
          setError(result.error || "Failed to add scouter");
        }
      } else {
        // Add to global/default pool - now syncs to Firestore
        addScouterToPool(scouterName.trim(), null);
        
        // Also save to Firestore for global sync
        const updatedScouters = getScouterList(null);
        await saveScouterPoolToFirestore(updatedScouters);
        
        setSuccess(`Added ${scouterName} to default pool`);
        setScouterList(updatedScouters);
        
        // Notify other components
        window.dispatchEvent(new Event("scouterPoolUpdated"));
      }
    } catch (error) {
      console.error("Error adding scouter:", error);
      setError("Failed to add scouter");
    } finally {
      setLoading(false);
    }
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    regenerateAssignmentsFromShifts(teamNumber);
    
    // Save to Firestore
    try {
      const assignments = getAllAssignments(teamNumber);
      await saveAssignmentsBoth(assignments, teamNumber);
    } catch (error) {
      console.error("Error saving to Firestore:", error);
    }
    
    setSuccess("Shift changes saved! Assignments have been regenerated.");
  };

  // Calculate coverage stats
  const getCoverageStats = () => {
    if (shifts.length === 0) {
      return { totalShifts: 0, totalMatches: 0, minMatch: 0, maxMatch: 0 };
    }

    const matchRanges = shifts.map((s) => ({ start: s.startMatch, end: s.endMatch }));
    const minMatch = Math.min(...matchRanges.map((r) => r.start));
    const maxMatch = Math.max(...matchRanges.map((r) => r.end));
    const totalMatches = maxMatch - minMatch + 1;

    return {
      totalShifts: shifts.length,
      totalMatches,
      minMatch,
      maxMatch,
    };
  };

  const coverage = getCoverageStats();

  return (
    <Box sx={{ p: compact ? 1 : 3 }}>
      {/* Team Selector */}
      {showTeamSelector && (
        <Paper sx={{ p: compact ? 2 : 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Team Selection
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Select Team</InputLabel>
                <Select
                  value={teamNumber || ""}
                  label="Select Team"
                  onChange={(e) => handleTeamChange(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <MenuItem value="">
                    <em>Select a team</em>
                  </MenuItem>
                  {availableTeams.map((team) => (
                    <MenuItem key={team.id} value={team.teamNumber}>
                      Team {team.teamNumber} ({team.scouters?.length || 0} scouters)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {teamNumber && (
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  {scouterList.length} scouters in team pool
                </Typography>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      {/* Event & Schedule Controls */}
      <Paper sx={{ p: compact ? 2 : 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          <EventIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          Event & Schedule Controls
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
            {success}
          </Alert>
        )}

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Event Code"
              value={eventCode}
              onChange={(e) => setEventCode(e.target.value)}
              placeholder="e.g., 2026tuis4"
              helperText="The Blue Alliance event key"
              size={compact ? "small" : "medium"}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="TBA API Key"
              type="password"
              value={tbaApiKey}
              onChange={(e) => {
                const value = e.target.value;
                setTbaApiKey(value);
                localStorage.setItem("tbaApiKey", value);
              }}
              placeholder="Your TBA auth key"
              helperText="Get from your TBA account"
              size={compact ? "small" : "medium"}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CloudDownloadIcon />}
              onClick={handleImportMatches}
              disabled={loading}
              size={compact ? "small" : "medium"}
            >
              Import Matches
            </Button>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AutoAwesomeIcon />}
            onClick={handleOpenSelectionModal}
            disabled={matches.length === 0}
            size={compact ? "small" : "medium"}
          >
            Auto Generate (Shift-Based)
          </Button>
        </Box>

        {/* Coverage Stats */}
        {shifts.length > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <strong>Shift Coverage:</strong> {shifts.length} shifts covering
            Matches {coverage.minMatch}-{coverage.maxMatch} ({coverage.totalMatches}{" "}
            matches total)
          </Alert>
        )}
      </Paper>

      {/* Main Content Area */}
      <Grid container spacing={3}>
        {/* Left Panel - Shift Groups */}
        {shifts.length > 0 && (
          <Grid item xs={12} md={6}>
            <ShiftPanel
              shifts={shifts}
              onUpdateShiftScouter={handleUpdateShiftScouter}
              onSaveChanges={handleSaveChanges}
              editingEnabled={editingEnabled}
              onToggleEdit={() => setEditingEnabled(!editingEnabled)}
              scouterList={scouterList}
            />
          </Grid>
        )}

        {/* Right Panel - Scouter List */}
        <Grid item xs={12} md={shifts.length > 0 ? 6 : 12}>
          <ScouterList
            scouters={scouterList}
            onRemoveScouter={handleRemoveScouter}
            onAddScouter={handleAddScouter}
            teamNumber={teamNumber}
          />
        </Grid>
      </Grid>

      {/* Scouter Selection Modal */}
      <ScouterSelectionModal
        open={selectionModalOpen}
        onClose={() => setSelectionModalOpen(false)}
        scouters={selectedScoutersForShift}
        onScoutersChange={setSelectedScoutersForShift}
        onGenerate={handleGenerateShifts}
        allScouters={scouterList}
      />
    </Box>
  );
}
