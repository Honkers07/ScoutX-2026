import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  TextField,
  Button,
  Alert,
  Typography,
  Paper,
  Card,
  CardContent,
  Stack,
  CircularProgress,
} from "@mui/material";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import EventIcon from "@mui/icons-material/Event";
import ShiftPanel from "./ShiftPanel";
import ScouterList from "./ScouterList";
import {
  getScouterList,
  getShifts,
  getMatches,
  getEventCode,
  generateShifts,
  regenerateAssignmentsFromShifts,
  updateShiftScouter,
  importMatchesFromTBA,
  saveShifts,
} from "./AssignmentHelpers";
import { ADMIN_PASSWORD } from "./AssignmentConstants";

export default function AdminAssignmentsTab() {
  const [eventCode, setEventCode] = useState(getEventCode());
  const [tbaApiKey, setTbaApiKey] = useState("");
  const [matches, setMatches] = useState([]);
  const [scouterList, setScouterList] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingEnabled, setEditingEnabled] = useState(false);

  // Load initial data
  useEffect(() => {
    const loadData = () => {
      const loadedMatches = getMatches();
      setMatches(loadedMatches);

      const loadedScouters = getScouterList();
      setScouterList(loadedScouters);

      const loadedShifts = getShifts();
      setShifts(loadedShifts);
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
      setSuccess(`Successfully imported ${importedMatches.length} matches`);
    } catch (err) {
      setError(`Failed to import matches: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle auto-generate shifts
  const handleGenerateShifts = () => {
    if (matches.length === 0) {
      setError("Please import matches first");
      return;
    }

    if (scouterList.length === 0) {
      setError("No scouters available");
      return;
    }

    setError("");
    const generatedShifts = generateShifts(scouterList, matches.length);
    setShifts(generatedShifts);
    saveShifts(generatedShifts);
    regenerateAssignmentsFromShifts();
    setSuccess(`Generated ${generatedShifts.length} shifts`);
  };

  // Handle shift scouter update
  const handleUpdateShiftScouter = (shiftIndex, positionIndex, newName) => {
    updateShiftScouter(shiftIndex, positionIndex, newName);
    // Reload shifts after update
    const updatedShifts = getShifts();
    setShifts(updatedShifts);
  };

  // Handle save changes
  const handleSaveChanges = () => {
    regenerateAssignmentsFromShifts();
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
    <Box sx={{ p: 3 }}>
      {/* Event & Schedule Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
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
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="TBA API Key"
              type="password"
              value={tbaApiKey}
              onChange={(e) => setTbaApiKey(e.target.value)}
              placeholder="Your TBA auth key"
              helperText="Get from your TBA account"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CloudDownloadIcon />}
              onClick={handleImportMatches}
              disabled={loading}
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
            onClick={handleGenerateShifts}
            disabled={matches.length === 0}
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
          <Grid item xs={12} md={3}>
            <ShiftPanel
              shifts={shifts}
              onUpdateShiftScouter={handleUpdateShiftScouter}
              onSaveChanges={handleSaveChanges}
              editingEnabled={editingEnabled}
              onToggleEdit={() => setEditingEnabled(!editingEnabled)}
            />
          </Grid>
        )}

        {/* Scouter List */}
        <Grid item xs={12} md={shifts.length > 0 ? 3 : 4}>
          <ScouterList
            scouters={scouterList}
            selectedScouter={null}
            onSelectScouter={() => {}}
          />
        </Grid>

        {/* Match Assignment Panel */}
        <Grid item xs={12} md={shifts.length > 0 ? 6 : 8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Match Assignment Overview
            </Typography>

            {matches.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No matches imported yet. Enter an event code and click "Import
                Matches" to get started.
              </Typography>
            ) : (
              <Stack spacing={2}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" color="primary">
                      {matches.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Matches
                    </Typography>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <Typography variant="h4" color="primary">
                      {scouterList.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Scouters in Pool
                    </Typography>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <Typography variant="h4" color="secondary">
                      {shifts.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Shifts Generated
                    </Typography>
                  </CardContent>
                </Card>
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
