import React, { useState, useMemo } from "react";
import {
  Button,
  ButtonGroup,
  Box,
  Typography,
  Divider,
  useMediaQuery,
  Drawer,
  Fab,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import DataTable from "./DataTable";
import TeamMatches from "./TeamMatches";
import TeamShiftPanel from "../Assignments/TeamShiftPanel";

const DataVisualizationDisplay = () => {
  const [selectedOption, setSelectedOption] = useState(
    "Match Data Visualization"
  );
  const [shiftPanelOpen, setShiftPanelOpen] = useState(false);

  const handleSelection = (option) => {
    setSelectedOption(option);
  };

  // Use `useMediaQuery` to determine if the screen is small
  const isSmallScreen = useMediaQuery("(max-width: 960px)");

  // Memoize components to prevent rerender on toggle
  const dataTable = useMemo(() => <DataTable />, []);
  const teamMatches = useMemo(() => <TeamMatches />, []);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 4,
        position: "relative",
      }}
    >
      {/* Shift Panel Drawer */}
      <Drawer
        anchor="right"
        open={shiftPanelOpen}
        onClose={() => setShiftPanelOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 400, md: 500 },
            bgcolor: "background.paper",
          },
        }}
      >
        <TeamShiftPanel
          showTeamSelector={true}
          compact={true}
        />
      </Drawer>

      {/* Floating Action Button to open shift panel */}
      <Fab
        color="primary"
        aria-label="shift settings"
        onClick={() => setShiftPanelOpen(true)}
        sx={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 1000,
        }}
      >
        <SettingsIcon />
      </Fab>
      <Typography variant="h4">Team Data</Typography>
      <Divider sx={{ width: "50%", backgroundColor: "grey.800", marginY: 4 }} />
      <ButtonGroup
        variant="outlined"
        color="primary"
        aria-label="option selector"
        sx={{ width: isSmallScreen ? "100%" : "50%" }}
      >
        <Button
          onClick={() => handleSelection("Match Data Visualization")}
          variant={
            selectedOption === "Match Data Visualization"
              ? "contained"
              : "outlined"
          }
          sx={{ flex: 1 }}
        >
          Match Data Visualization
        </Button>
        <Button
          onClick={() => handleSelection("Team Data Visualization")}
          variant={
            selectedOption === "Team Data Visualization"
              ? "contained"
              : "outlined"
          }
          sx={{ flex: 1 }}
        >
          Team Data Visualization
        </Button>
      </ButtonGroup>

      <Box mt={4} mb={7} sx={{ width: "100%" }}>
        <Box
          sx={{
            display:
              selectedOption === "Match Data Visualization" ? "block" : "none",
          }}
        >
          {dataTable}
        </Box>
        <Box
          sx={{
            display:
              selectedOption === "Team Data Visualization" ? "block" : "none",
          }}
        >
          {teamMatches}
        </Box>
      </Box>
    </Box>
  );
};

export default DataVisualizationDisplay;
