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
  IconButton,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { DEFAULT_SCOUTER_POOL } from "./AssignmentConstants";


export default function ShiftPanel({
  shifts,
  onUpdateShiftScouter,
  onSaveChanges,
  editingEnabled,
  onToggleEdit,
  onDeleteShift,
  onAddShift,
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
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={onAddShift}
            sx={{ mr: 1 }}
          >
            Add Shift
          </Button>
          <Chip
            label={editingEnabled ? "Edit Mode" : "View Only"}
            color={editingEnabled ? "success" : "default"}
            size="small"
            onClick={onToggleEdit}
            sx={{ cursor: "pointer" }}
          />
        </Stack>
      </Box>
      <Divider sx={{ mb: 2 }} />


      {shifts.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No shifts generated yet. h and generate shifts to see
          shift groups.
        </Typography>
      ) : (
        shifts.map((shift, shiftIndex) => (
          <Box key={shift.id} sx={{ mb: 3, p: 2, borderRadius: 1, bgcolor: shiftIndex % 2 === 0 ? 'rgba(21, 101, 192, 0.04)' : 'transparent' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Box>
                <Typography
                  variant="subtitle2"
                  color="primary"
                  sx={{ fontWeight: "bold" }}
                >
                  {shift.name}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block" }}
                >
                  Matches {shift.startMatch}-{shift.endMatch} • {shift.endMatch - shift.startMatch + 1} matches per scouter
                </Typography>
              </Box>
              <IconButton
                size="small"
                color="error"
                onClick={() => onDeleteShift && onDeleteShift(shiftIndex)}
                sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {shift.scouterPositions &&
                shift.scouterPositions.map((scouter, posIndex) => (
                  <FormControl key={posIndex} fullWidth size="small">
                    <InputLabel>{scouter.alliance} Position {scouter.position}</InputLabel>
                    <Select
                      value={scouter.name}
                      label={`${scouter.alliance} Position ${scouter.position}`}
                      onChange={(e) =>
                        handleScouterChange(shiftIndex, posIndex, e.target.value)
                      }
                      disabled={!editingEnabled}
                    >
                      {DEFAULT_SCOUTER_POOL.map((s) => (
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



