import React from "react";
import { Paper, Stack, Typography, Box, TextField, FormControlLabel, Checkbox, Button } from "@mui/material";

export default function MSAuto({ data, handleStageChange }) {
  return (
    <Paper sx={{ p: 3, width: "100%", maxWidth: 600 }}>
      <Stack spacing={2}>
        <Typography variant="h6" color="primary">
          Autonomous Period
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          Auto scoring and mobility tracking
        </Typography>

        <FormControlLabel
          control={<Checkbox defaultChecked />}
          label="Left Starting Zone"
        />

        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            label="Auto Points Scored"
            type="number"
            fullWidth
            defaultValue={0}
          />
        </Box>

        <Button 
          variant="contained" 
          onClick={() => handleStageChange(2)}
          fullWidth
        >
          Next
        </Button>
      </Stack>
    </Paper>
  );
}
