import React, { useState } from "react";
import {
  Box,
  Paper,
  TextField,
  InputAdornment,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

export default function ScouterList({
  scouters,
  selectedScouter,
  onSelectScouter,
  onRemoveScouter,
  showRemoveButton = false,
  title = "Find Your Assignments",
  onAddScouter,
  scouterTeamMap = {},
}) {
  const [searchName, setSearchName] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newScouterName, setNewScouterName] = useState("");
  const [expandedTeams, setExpandedTeams] = useState({});

  // Filter scouters based on search
  const filteredScouters = scouters.filter((name) =>
    name.toLowerCase().includes(searchName.toLowerCase())
  );

  // Group scouters by team number, then alphabetically within each team
  const groupedScouters = filteredScouters.reduce((acc, name) => {
    const teamNumber = scouterTeamMap[name] || "Unknown";
    if (!acc[teamNumber]) {
      acc[teamNumber] = [];
    }
    acc[teamNumber].push(name);
    return acc;
  }, {});

  // Sort teams numerically and alphabetically
  const sortedTeams = Object.keys(groupedScouters).sort((a, b) => {
    // Handle "Unknown" team - put at end
    if (a === "Unknown") return 1;
    if (b === "Unknown") return -1;
    // Sort by team number first
    const teamA = parseInt(a) || 0;
    const teamB = parseInt(b) || 0;
    if (teamA !== teamB) return teamA - teamB;
    return a.localeCompare(b);
  });

  // Sort scouters alphabetically within each team
  sortedTeams.forEach((team) => {
    groupedScouters[team].sort((a, b) => a.localeCompare(b));
  });

  // Toggle team expansion
  const toggleTeam = (team) => {
    setExpandedTeams((prev) => ({
      ...prev,
      [team]: !prev[team],
    }));
  };

  // Expand all teams
  const expandAll = () => {
    const allExpanded = {};
    sortedTeams.forEach((team) => {
      allExpanded[team] = true;
    });
    setExpandedTeams(allExpanded);
  };

  // Collapse all teams
  const collapseAll = () => {
    setExpandedTeams({});
  };

  // Handle adding a new scouter
  const handleAddScouter = () => {
    if (newScouterName.trim() && onAddScouter) {
      onAddScouter(newScouterName.trim());
      setNewScouterName("");
      setShowAddDialog(false);
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
          {title}
        </Typography>
        {showRemoveButton && onAddScouter && (
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowAddDialog(true)}
          >
            Add
          </Button>
        )}
      </Box>

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

      {/* Expand/Collapse All Buttons */}
      {sortedTeams.length > 1 && (
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <Button size="small" onClick={expandAll}>
            Expand All
          </Button>
          <Button size="small" onClick={collapseAll}>
            Collapse All
          </Button>
        </Box>
      )}

      {/* Grouped List with Teams */}
      <Box sx={{ maxHeight: 500, overflow: "auto" }}>
        {sortedTeams.map((team) => {
          const isExpanded = expandedTeams[team] !== false; // Default to expanded
          const teamLabel = team === "Unknown" ? "No Team Assigned" : `Team ${team}`;

          return (
            <Box key={team} sx={{ mb: 1 }}>
              {/* Team Header - Clickable to expand/collapse */}
              <Box
                onClick={() => toggleTeam(team)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  p: 1,
                  cursor: "pointer",
                  borderRadius: 1,
                  backgroundColor: "action.selected",
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                }}
              >
                {isExpanded ? (
                  <ExpandLessIcon sx={{ mr: 1 }} />
                ) : (
                  <ExpandMoreIcon sx={{ mr: 1 }} />
                )}
                <Typography variant="body2" fontWeight="bold">
                  {teamLabel} ({groupedScouters[team].length})
                </Typography>
              </Box>

              {/* Scouters in this team */}
              <Collapse in={isExpanded}>
                <Box sx={{ pl: 3 }}>
                  {groupedScouters[team].map((name) => (
                    <Box
                      key={name}
                      onClick={() => onSelectScouter(name)}
                      sx={{
                        p: 1,
                        cursor: "pointer",
                        borderRadius: 1,
                        backgroundColor:
                          selectedScouter === name ? "primary.main" : "transparent",
                        color: selectedScouter === name ? "white" : "text.primary",
                        "&:hover": {
                          backgroundColor:
                            selectedScouter === name
                              ? "primary.dark"
                              : "action.hover",
                        },
                        transition: "background-color 0.2s",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>{name}</span>
                      {showRemoveButton && onRemoveScouter && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveScouter(name);
                          }}
                          sx={{
                            color: "error.main",
                            "&:hover": { backgroundColor: "error.light" },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </Box>

      {/* Add Scouter Dialog */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)}>
        <DialogTitle>Add New Scouter</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Scouter Name"
            value={newScouterName}
            onChange={(e) => setNewScouterName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleAddScouter();
              }
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAddScouter} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
