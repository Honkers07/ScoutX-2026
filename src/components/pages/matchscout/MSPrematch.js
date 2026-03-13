import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  MenuItem,
  Stack,
  Typography,
  Button,
  Paper,
  Alert,
} from "@mui/material";
import { getNextAssignment } from "../AssignmentHelpers";

export default function MSPrematch({ data }) {
  const [scouterName, setScouterName] = useState(data.data[0]?.name || "");
  const [matchNumber, setMatchNumber] = useState(data.data[0]?.match || "");
  const [teamNumber, setTeamNumber] = useState(data.data[0]?.team || "");
  const [alliance, setAlliance] = useState(data.data[0]?.alliance || "");
  const [startPosition, setStartPosition] = useState(data.data[0]?.start_position || "");
  const [verificationCode, setVerificationCode] = useState(data.data[0]?.verificationCode || "");
  const [error, setError] = useState("");

  // Update data when scouter name changes - try to autofill
  useEffect(() => {
    if (scouterName && data.isValidScouter(scouterName)) {
      // Try to autofill from assignment
      if (matchNumber) {
        const assignment = data.autoFillFromAssignment(scouterName, parseInt(matchNumber));
        if (assignment) {
          setTeamNumber(data.data[0]?.team || "");
          setAlliance(data.data[0]?.alliance || "");
          setStartPosition(data.data[0]?.start_position || "");
          setVerificationCode(data.data[0]?.verificationCode || "");
        }
      }
    }
  }, [scouterName, matchNumber]);

  const handleLoadNextAssignment = () => {
    if (!scouterName) {
      setError("Please enter your scouter name first");
      return;
    }

    const nextAssignment = getNextAssignment(scouterName);
    if (nextAssignment) {
      setMatchNumber(nextAssignment.match.toString());
      setTeamNumber(nextAssignment.team?.toString() || "");
      setAlliance(nextAssignment.alliance || "");
      setStartPosition(nextAssignment.position?.toString() || "");
      setVerificationCode(nextAssignment.verificationCode || "");
      setError("");
    } else {
      setError("No pending assignments found");
    }
  };

  const handleSave = () => {
    // Save to data object
    data.data[0].name = scouterName;
    data.data[0].match = matchNumber;
    data.data[0].team = teamNumber;
    data.data[0].alliance = alliance;
    data.data[0].start_position = startPosition;
    data.data[0].verificationCode = verificationCode;
  };

  const startPositions = [
    { value: "1", label: "Position 1" },
    { value: "2", label: "Position 2" },
    { value: "3", label: "Position 3" },
  ];

  const alliances = [
    { value: "Red", label: "Red Alliance" },
    { value: "Blue", label: "Blue Alliance" },
  ];

  return (
    <Paper sx={{ p: 3, width: "100%", maxWidth: 600 }}>
      <Stack spacing={2}>
        <Typography variant="h6" color="primary">
          Pre-Match Information
        </Typography>

        {error && (
          <Alert severity="warning" onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <TextField
          label="Scouter Name"
          value={scouterName}
          onChange={(e) => {
            setScouterName(e.target.value);
            handleSave();
          }}
          fullWidth
          required
        />

        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <TextField
            label="Match Number"
            value={matchNumber}
            onChange={(e) => {
              setMatchNumber(e.target.value);
              handleSave();
            }}
            fullWidth
            required
            type="number"
          />
          <Button
            variant="outlined"
            onClick={handleLoadNextAssignment}
            sx={{ whiteSpace: "nowrap" }}
          >
            Load Next
          </Button>
        </Box>

        <TextField
          label="Team Number"
          value={teamNumber}
          onChange={(e) => {
            setTeamNumber(e.target.value);
            handleSave();
          }}
          fullWidth
          required
          type="number"
        />

        <TextField
          select
          label="Alliance"
          value={alliance}
          onChange={(e) => {
            setAlliance(e.target.value);
            handleSave();
          }}
          fullWidth
          required
        >
          {alliances.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Start Position"
          value={startPosition}
          onChange={(e) => {
            setStartPosition(e.target.value);
            handleSave();
          }}
          fullWidth
          required
        >
          {startPositions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Verification Code"
          value={verificationCode}
          onChange={(e) => {
            setVerificationCode(e.target.value);
            handleSave();
          }}
          fullWidth
          helperText="Enter the code from your assignment"
        />
      </Stack>
    </Paper>
  );
}
