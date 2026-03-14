import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Card,
  CardContent,
  Stack,
  Alert,
  Button,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import RefreshIcon from "@mui/icons-material/Refresh";
import ScouterList from "./ScouterList";
import {
  getScouterList,
  getAllAssignments,
  getShifts,
  syncAssignmentsWithSubmittedMatches,
} from "./AssignmentHelpers";

export default function MyAssignmentsTab() {
  const [scouterList, setScouterList] = useState([]);
  const [selectedScouter, setSelectedScouter] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [shifts, setShifts] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(1);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  // Load and sync data on mount
  useEffect(() => {
    const loadAndSyncData = async () => {
      const scouters = getScouterList();
      setScouterList(scouters);

      const allAssignments = getAllAssignments();
      setAssignments(allAssignments);

      const allShifts = getShifts();
      setShifts(allShifts);

      // Sync with Firebase to check for submitted matches
      setSyncing(true);
      await syncAssignmentsWithSubmittedMatches();
      setSyncing(false);
      setLastSync(new Date());

      // Reload assignments after sync
      const syncedAssignments = getAllAssignments();
      setAssignments(syncedAssignments);
    };

    loadAndSyncData();

    // Listen for storage changes
    const handleStorageChange = () => {
      loadAndSyncData();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("assignmentsUpdated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("assignmentsUpdated", handleStorageChange);
    };
  }, []);

  // Handle manual refresh
  const handleRefresh = async () => {
    setSyncing(true);
    await syncAssignmentsWithSubmittedMatches();
    const updatedAssignments = getAllAssignments();
    setAssignments(updatedAssignments);
    setSyncing(false);
    setLastSync(new Date());
  };

  // Get assignments for selected scouter
  const scouterAssignments = selectedScouter
    ? assignments[selectedScouter] || []
    : [];

  // Get completion stats
  const getCompletionStats = () => {
    if (!scouterAssignments || scouterAssignments.length === 0) {
      return { completed: 0, total: 0 };
    }
    const completed = scouterAssignments.filter((a) => a.completed).length;
    return { completed, total: scouterAssignments.length };
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

  // Get shift coverage
  const getShiftCoverage = () => {
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

  const stats = getCompletionStats();
  const coverage = getShiftCoverage();
  const shift = selectedScouter ? getScouterShift(selectedScouter) : null;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with refresh button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" color="primary">
          My Assignments
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={syncing}
          size="small"
        >
          {syncing ? 'Syncing...' : 'Refresh Status'}
        </Button>
      </Box>

      {/* Last sync time */}
      {lastSync && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Last synced: {lastSync.toLocaleTimeString()}
        </Typography>
      )}

      {/* Shift Coverage Info */}
      {shifts.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Shift Coverage:</strong> {shifts.length} shifts covering
          Matches {coverage.minMatch}-{coverage.maxMatch} ({coverage.totalMatches}{" "}
          matches total)
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Panel - Scouter List */}
        <Grid item xs={12} md={4}>
          <ScouterList
            scouters={scouterList}
            selectedScouter={selectedScouter}
            onSelectScouter={setSelectedScouter}
          />
        </Grid>

        {/* Right Panel - Assignment Details */}
        <Grid item xs={12} md={8}>
          {selectedScouter ? (
            <Paper sx={{ p: 3 }}>
              {/* Scouter Header */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" gutterBottom>
                  {selectedScouter}
                </Typography>

                {/* Shift Info */}
                {shift && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Your Shift: {shift.startMatch} - {shift.endMatch} (
                    {shift.endMatch - shift.startMatch + 1} matches)
                  </Alert>
                )}

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

              <hr />

              {/* Assignments Table */}
              {scouterAssignments.length > 0 ? (
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
                      {scouterAssignments
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
                                  assignment.match === currentMatch ? "bold" : "normal"
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
                  No assignments found for {selectedScouter}. Please check with
                  your admin to get assigned to matches.
                </Alert>
              )}
            </Paper>
          ) : (
            <Paper sx={{ p: 3, textAlign: "center" }}>
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
