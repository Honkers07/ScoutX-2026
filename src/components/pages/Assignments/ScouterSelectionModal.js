import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  FormControlLabel,
  Box,
  Typography,
  Chip,
  TextField,
  InputAdornment,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SelectAllIcon from "@mui/icons-material/SelectAll";


export default function ScouterSelectionModal({
  open,
  onClose,
  availableScouters,
  selectedScouters,
  onConfirm,
  matchCount = 0,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [localSelected, setLocalSelected] = useState([]);


  // Initialize local selected state when modal opens
  useEffect(() => {
    if (open) {
      setLocalSelected([...selectedScouters]);
    }
  }, [open, selectedScouters]);


  // Filter scouters based on search term
  const filteredScouters = availableScouters.filter((name) =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );


  // Handle toggling a single scouter
  const handleToggleScouter = (name) => {
    setLocalSelected((prev) => {
      if (prev.includes(name)) {
        return prev.filter((s) => s !== name);
      } else {
        return [...prev, name];
      }
    });
  };


  // Handle selecting all filtered scouters
  const handleSelectAll = () => {
    setLocalSelected((prev) => {
      const newSelected = [...prev];
      filteredScouters.forEach((name) => {
        if (!newSelected.includes(name)) {
          newSelected.push(name);
        }
      });
      return newSelected;
    });
  };


  // Handle deselecting all filtered scouters
  const handleDeselectAll = () => {
    setLocalSelected((prev) => prev.filter((s) => !filteredScouters.includes(s)));
  };


  // Handle confirm
  const handleConfirm = () => {
    onConfirm(localSelected);
    onClose();
  };


  // Calculate shift info
  const calculateShiftInfo = () => {
    const count = localSelected.length;
    if (count === 0) return "No shifts";
    const shifts = Math.max(1, Math.floor(count / 6));
    if (matchCount === 0) return `${shifts} shifts × 6 scouters per shift`;
    const matchesPerShift = Math.floor(matchCount / shifts);
    if (shifts === 0 || count < 6) return `1 shift (all ${count} scouters)`;
    return `${shifts} shifts × 6 scouters ≈ ${matchesPerShift} matches per shift`;
  };


  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          Select Scouters for Shifts
        </Box>
      </DialogTitle>
      <DialogContent>
        {/* Search and selection controls */}
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search scouters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />


          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<SelectAllIcon />}
              onClick={handleSelectAll}
            >
              Select All ({filteredScouters.length})
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={handleDeselectAll}
            >
              Clear
            </Button>
          </Box>


          <Divider sx={{ mb: 2 }} />


          {/* Current selection summary */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Selected: {localSelected.length} scouters
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {calculateShiftInfo()}
            </Typography>
          </Box>


          {/* Scouter list with checkboxes */}
          <Box sx={{ maxHeight: 300, overflow: "auto" }}>
            {filteredScouters.map((scouter) => (
              <FormControlLabel
                key={scouter}
                control={
                  <Checkbox
                    checked={localSelected.includes(scouter)}
                    onChange={() => handleToggleScouter(scouter)}
                  />
                }
                label={scouter}
                sx={{
                  width: "100%",
                  mr: 0,
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                  borderRadius: 1,
                }}
              />
            ))}
          </Box>


          {filteredScouters.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
              No scouters match your search
            </Typography>
          )}
        </Box>


        {/* Selected scouters chips */}
        {localSelected.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
              Selected Scouters:
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {localSelected.map((name) => (
                <Chip
                  key={name}
                  label={name}
                  size="small"
                  onDelete={() => handleToggleScouter(name)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="primary"
          disabled={localSelected.length === 0}
        >
          Confirm Selection ({localSelected.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
}

