import React from "react";
import {
  Box,
  Paper,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Stack,
  Divider,
  Chip,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";

export default function ShiftPanel({
  shifts,
  onUpdateShiftScouter,
  onSaveChanges,
  editingEnabled,
  onToggleEdit,
  scouterList = [],
}) {
  const handleScouterChange = (shiftIndex, positionIndex, newName) => {
    if (onUpdateShiftScouter) {
      onUpdateShiftScouter(shiftIndex, positionIndex, newName);
    }
  };

  return (
    <Paper sx={{ p: 2, maxHeight: 700, overflow: "auto" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Typography variant="h6" color="primary">
          Shift Groups
        </Typography>
        <Chip
          label={editingEnabled ? "Edit Mode" : "View Only"}
          color={editingEnabled ? "success" : "default"}
          size="small"
          onClick={onToggleEdit}
          sx={{ cursor: "pointer" }}
        />
      </Box>
      <Divider sx={{ mb: 2 }} />

      {shifts.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No shifts generated yet. Import matches and generate shifts to see
          shift groups.
        </Typography>
      ) : (
        shifts.map((shift, shiftIndex) => (
          <Box key={shift.id} sx={{ mb: 3 }}>
            <Typography
              variant="subtitle2"
              color="primary"
              sx={{ mb: 1, fontWeight: "bold" }}
            >
              Shift {shift.id} (Matches {shift.startMatch}-{shift.endMatch})
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 1 }}
            >
              {shift.endMatch - shift.startMatch + 1} matches per scouter
            </Typography>
            <Stack spacing={1}>
              {shift.scouterPositions &&
                shift.scouterPositions.map((scouter, posIndex) => (
                  <FormControl key={posIndex} fullWidth size="small">
                    <InputLabel>{scouter.alliance} Position {scouter.position}</InputLabel>
                    <Select
                      value={scouter.isPlaceholder ? "" : scouter.name}
                      label={`${scouter.alliance} Position ${scouter.position}`}
                      onChange={(e) =>
                        handleScouterChange(shiftIndex, posIndex, e.target.value)
                      }
                      disabled={!editingEnabled}
                    >
                      {/* Empty option for clearing */}
                      <MenuItem value="">
                        <em>(Empty)</em>
                      </MenuItem>
                      {scouterList
                        .filter((s) => s) // Filter out empty strings
                        .map((s) => (
                          <MenuItem key={s} value={s}>
                            {s}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                ))}
            </Stack>
          </Box>
        ))
      )}

      {editingEnabled && shifts.length > 0 && (
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          fullWidth
          onClick={onSaveChanges}
          sx={{ mt: 2 }}
        >
          Save Changes
        </Button>
      )}
    </Paper>
  );
}
