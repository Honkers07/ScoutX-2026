import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Divider,
  Card,
  CardContent,
  Stack,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import SaveIcon from "@mui/icons-material/Save";
import {
  getAllAssignments,
  getScouterList,
  getShifts,
  regenerateAssignmentsFromShifts,
  updateShiftScouter,
} from "./AssignmentHelpers";
import { DEFAULT_SCOUTERS } from "./AssignmentConstants";

export default function ScouterAssignments() {
  const [searchName, setSearchName] = useState("");
  const [selectedScouter, setSelectedScouter] = useState(null);
  const [scouterList, setScouterList] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [shifts, setShifts] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(1);
  const [shiftEditingEnabled, setShiftEditingEnabled] = useState(false);

  // Load data on mount
  useEffect(() => {
    const loadData = () => {
      const scouters = getScouterList();
      setScouterList(scouters);

      const allAssignments = getAllAssignments();
      setAssignments(allAssignments);

      const allShifts = getShifts();
      setShifts(allShifts);
      
      // Enable shift editing if shifts exist
      if (allShifts.length > 0) {
        setShiftEditingEnabled(true);
      }
    };

    loadData();

    // Listen for storage changes
    const handleStorageChange = () => {
      loadData();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("assignmentsUpdated", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("assignmentsUpdated", handleStorageChange);
    };
  }, []);

  // Get assignments for selected scouter
  useEffect(() => {
    if (selectedScouter) {
      const scouterAssignments = assignments[selectedScouter] || [];
      setScouterAssignmentsList(scouterAssignments);
    }
  }, [selectedScouter, assignments]);

  const [scouterAssignmentsList, setScouterAssignmentsList] = useState([]);

  // Filter scouters based on search
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

  // Handle scouter selection
  const handleSelectScouter = (name) => {
    setSelectedScouter(name);
  };

  // Get scouter's shift info
  const getScouterShift = (scouterName) => {
    for (const shift of shifts) {
      if (shift.scouterNames && shift.scouterNames.includes(scouterName)) {
        return shift;
      }
    }
    return null;
  };

  // Get completion stats
  const getCompletionStats = () => {
    if (!scouterAssignmentsList || scouterAssignmentsList.length === 0) {
      return { completed: 0, total: 0 };
    }
    const completed = scouterAssignmentsList.filter((a) => a.completed).length;
    return { completed, total: scouterAssignmentsList.length };
  };

  // Get total match coverage from shifts
  const getShiftCoverage = () => {
    if (shifts.length === 0) return { totalShifts: 0, totalMatches: 0, minMatch: 0, maxMatch: 0 };
    
    const matchRanges = shifts.map(s => ({ start: s.startMatch, end: s.endMatch }));
    const minMatch = Math.min(...matchRanges.map(r => r.start));
    const maxMatch = Math.max(...matchRanges.map(r => r.end));
    const totalMatches = maxMatch - minMatch + 1;
    
    return {
      totalShifts: shifts.length,
      totalMatches,
      minMatch,
      maxMatch
    };
  };

  // Handle shift scouter update
  const handleUpdateShiftScouter = (shiftIndex, positionIndex, newName) => {
    // Validate that the new name is in the scouter pool
    if (!DEFAULT_SCOUTERS.includes(newName)) return;

    const newShifts = JSON.parse(JSON.stringify(shifts));
    newShifts[shiftIndex].scouterPositions[positionIndex].name = newName;
    newShifts[shiftIndex].scouterNames = newShifts[shiftIndex].scouterPositions.map(s => s.name);
    setShifts(newShifts);
    
    // Save to localStorage
    localStorage.setItem("shifts", JSON.stringify(newShifts));
    
    // Trigger assignment regeneration
    if (window.regenerateAssignmentsFromShifts) {
      window.regenerateAssignmentsFromShifts();
    }
    
    // Dispatch event for UI update
    window.dispatchEvent(new Event("assignmentsUpdated"));
  };

  // Save shift changes
  const handleSaveShiftChanges = () => {
    // Trigger global regeneration
    window.dispatchEvent(new Event("shiftChangesSaved"));
    alert("Shift changes saved! Assignments have been regenerated.");
  };

  const stats = getCompletionStats();
  const coverage = getShiftCoverage();

  return (
    <Box sx={{ p: 3, maxWidth: 1600, mx: "auto", pb: 10 }}>
      <Typography variant="h4" color="white" gutterBottom>
        Scouter Assignments
      </Typography>

      {/* Shift Coverage Info */}
      {shifts.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Shift Coverage:</strong> {shifts.length} shifts covering Matches {coverage.minMatch}-{coverage.maxMatch} ({coverage.totalMatches} matches total)
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Panel - Shift Groups (Admin Editing) */}
        {shifts.length > 0 && (
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, maxHeight: 700, overflow: "auto" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography variant="h6" color="primary">
                  Shift Groups
                </Typography>
                <Chip 
                  label="Edit Mode" 
                  color={shiftEditingEnabled ? "success" : "default"} 
                  size="small"
                  onClick={() => setShiftEditingEnabled(!shiftEditingEnabled)}
                  sx={{ cursor: "pointer" }}
                />
              </Box>
              <Divider sx={{ mb: 2 }} />
              {shifts.map((shift, shiftIndex) => (
                <Box key={shift.id} sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ mb: 1, fontWeight: "bold" }}>
                    Shift {shift.id} (Matches {shift.startMatch}-{shift.endMatch})
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                    {shift.endMatch - shift.startMatch + 1} matches per scouter
                  </Typography>
                  <Stack spacing={1}>
                    {shift.scouterPositions && shift.scouterPositions.map((scouter, posIndex) => (
                      <FormControl key={posIndex} fullWidth size="small">
                        <InputLabel>Position {scouter.position}</InputLabel>
                        <Select
                          value={scouter.name}
                          label={`Position ${scouter.position}`}
                          onChange={(e) => handleUpdateShiftScouter(shiftIndex, posIndex, e.target.value)}
                          disabled={!shiftEditingEnabled}
                        >
                          {DEFAULT_SCOUTERS.map((s) => (
                            <MenuItem key={s} value={s}>{s}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ))}
                    {!shift.scouterPositions && shift.scouterNames && shift.scouterNames.map((name, posIndex) => (
                      <FormControl key={posIndex} fullWidth size="small">
                        <InputLabel>Position {posIndex + 1}</InputLabel>
                        <Select
                          value={name}
                          label={`Position ${posIndex + 1}`}
                          onChange={(e) => handleUpdateShiftScouter(shiftIndex, posIndex, e.target.value)}
                          disabled={!shiftEditingEnabled}
                        >
                          {DEFAULT_SCOUTERS.map((s) => (
                            <MenuItem key={s} value={s}>{s}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ))}
                  </Stack>
                </Box>
              ))}
              {shiftEditingEnabled && (
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  fullWidth
                  onClick={handleSaveShiftChanges}
                  sx={{ mt: 2 }}
                >
                  Save Changes
                </Button>
              )}
            </Paper>
          </Grid>
        )}

        {/* Scouter List Panel */}
        <Grid item xs={12} md={shifts.length > 0 ? 3 : 4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Find Your Assignments
            </Typography>

            {/* Search Box */}
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

            {/* Alphabetical List */}
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
                            selectedScouter === name ? "primary.main" : "transparent",
                          color:
                            selectedScouter === name ? "white" : "text.primary",
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
        <Grid item xs={12} md={shifts.length > 0 ? 6 : 8}>
          {selectedScouter ? (
            <Paper sx={{ p: 3 }}>
              {/* Scouter Header */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" gutterBottom>
                  {selectedScouter}
                </Typography>

                {/* Shift Info */}
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

                {/* Completion Stats */}
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
                        color={stats.total > 0 ? "success.main" : "text.secondary"}
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

                {/* Current Match Navigation */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    mb: 2,
                  }}
                >
                  <Chip
                    label={`Current Match: ${currentMatch}`}
                    color="primary"
                    onClick={() => setCurrentMatch(currentMatch)}
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Assignments Table */}
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
                          <TableRow
                            key={assignment.match}
                            sx={{
                              backgroundColor:
                                assignment.match === currentMatch
                                  ? "action.selected"
                                  : "transparent",
                            }}
                          >
                            <TableCell>
                              <Typography
                                variant="body2"
                                fontWeight={
                                  assignment.match === currentMatch
                                    ? "bold"
                                    : "normal"
                                }
                              >
                                {assignment.match}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {assignment.team}
                              </Typography>
                            </TableCell>
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
                            <TableCell>
                              <Typography variant="body2">
                                {assignment.position}
                              </Typography>
                            </TableCell>
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
                  No assignments found for {selectedScouter}. Please check
                  with your admin to get assigned to matches.
                </Alert>
              )}
            </Paper>
          ) : (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="h6" color="text.secondary">
                Select your name from the list to view your assignments
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Your assignments will show which matches you're responsible for
                scouting
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
