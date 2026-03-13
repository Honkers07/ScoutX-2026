import React from "react";
import { Paper, Stack, Typography, Box, TextField, Button, MenuItem } from "@mui/material";

export default function MSTeleop({ data, handleStageChange }) {
  const climbOptions = ["No Climb", "L1", "L2", "L3", "L4"];

  return (
    <Paper sx={{ p: 3, width: "100%", maxWidth: 600 }}>
      <Stack spacing={2}>
        <Typography variant="h6" color="primary">
          Teleoperated Period
        </Typography>

        <TextField
          select
          label="End Game Climb"
          defaultValue="No Climb"
          fullWidth
        >
          {climbOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>

        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            label="Teleop Points"
            type="number"
            fullWidth
            defaultValue={0}
          />
        </Box>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button 
            variant="outlined" 
            onClick={() => handleStageChange(1)}
            fullWidth
          >
            Previous
          </Button>
          <Button 
            variant="contained" 
            onClick={() => handleStageChange(3)}
            fullWidth
          >
            Next
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
