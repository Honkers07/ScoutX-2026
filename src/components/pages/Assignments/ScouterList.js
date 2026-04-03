import React from "react";
import {
  Box,
  Paper,
  TextField,
  InputAdornment,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";


export default function ScouterList({
  scouters,
  selectedScouter,
  onSelectScouter,
}) {
  const [searchName, setSearchName] = React.useState("");


  // Filter scouters based on search
  const filteredScouters = scouters.filter((name) =>
    name.toLowerCase().includes(searchName.toLowerCase())
  );


  // Group scouters alphabetically
  const groupedScouters = filteredScouters.reduce((acc, name) => {
    const firstLetter = name.charAt(0).toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(name);
    return acc;
  }, {});


  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Find Your Assignments
      </Typography>


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


      {/* Alphabetical List */}
      <Box sx={{ maxHeight: 500, overflow: "auto" }}>
        {Object.keys(groupedScouters)
          .sort()
          .map((letter) => (
            <Box key={letter} sx={{ mb: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: "bold" }}
              >
                {letter}
              </Typography>
              {groupedScouters[letter].map((name) => (
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
                  }}
                >
                  {name}
                </Box>
              ))}
            </Box>
          ))}
      </Box>
    </Paper>
  );
}



