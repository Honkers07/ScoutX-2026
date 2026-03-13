import React, { useState } from "react";
import { Paper, Stack, Typography, TextField, Box, Button, FormControlLabel, Checkbox, ToggleButton, ToggleButtonGroup } from "@mui/material";

export default function MSPostmatch({ data, handleStageChange }) {
  const [climbLevel, setClimbLevel] = useState("No climb");

  const handleClimbChange = (event, newLevel) => {
    if (newLevel !== null) {
      setClimbLevel(newLevel);
    }
  };

  return (
    <Paper sx={{ p: 3, width: "100%", maxWidth: 600 }}>
      <Stack spacing={2}>
        <Typography variant="h6" color="primary">
          Post-Match Information
        </Typography>

        <TextField
          label="Defense Rating"
          placeholder="1-5 scale"
          type="number"
          fullWidth
          inputProps={{ min: 1, max: 5 }}
        />

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Climb Level
          </Typography>
          <ToggleButtonGroup
            value={climbLevel}
            exclusive
            onChange={handleClimbChange}
            fullWidth
          >
            <ToggleButton value="No climb" sx={{ py: 1.5 }}>No climb</ToggleButton>
            <ToggleButton value="L1" sx={{ py: 1.5 }}>L1</ToggleButton>
            <ToggleButton value="L2" sx={{ py: 1.5 }}>L2</ToggleButton>
            <ToggleButton value="L3" sx={{ py: 1.5 }}>L3</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <TextField
          label="Comments"
          multiline
          rows={3}
          placeholder="Any notes about the robot..."
          fullWidth
        />

        <Typography variant="subtitle2" sx={{ mt: 2 }}>
          Robot Issues
        </Typography>

        <FormControlLabel control={<Checkbox />} label="Intake Broken" />
        <FormControlLabel control={<Checkbox />} label="Outtake Broken" />
        <FormControlLabel control={<Checkbox />} label="Elevator Broken" />
        <FormControlLabel control={<Checkbox />} label="Disabled" />
        <FormControlLabel control={<Checkbox />} label="Browned Out" />

        <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
          <Button 
            variant="outlined" 
            onClick={() => handleStageChange(2)}
            fullWidth
          >
            Previous
          </Button>
          <Button 
            variant="contained" 
            color="success"
            onClick={() => handleStageChange(4)}
            fullWidth
          >
            Submit
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
