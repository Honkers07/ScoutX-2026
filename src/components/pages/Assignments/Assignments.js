import React, { useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
} from "@mui/material";
import AdminAssignmentsTab from "./AdminAssignmentsTab";
import MyAssignmentsTab from "./MyAssignmentsTab";
import { ADMIN_PASSWORD } from "./AssignmentConstants";

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`assignment-tabpanel-${index}`}
      aria-labelledby={`assignment-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

export default function Assignments() {
  const [tabValue, setTabValue] = useState(0);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setAdminUnlocked(true);
      setPasswordError("");
      setTabValue(0); // Switch to admin tab
    } else {
      setPasswordError("Incorrect password");
    }
    setPasswordInput("");
  };

  return (
    <Box sx={{ width: "100%", pb: 10 }}>
      <Typography
        variant="h4"
        color="white"
        sx={{ p: 3, pb: 0 }}
        gutterBottom
      >
        Match Assignments
      </Typography>

      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        aria-label="assignment tabs"
        sx={{
          px: 3,
          "& .MuiTab-root": { color: "white" },
          "& .Mui-selected": { color: "#ff6f00" },
          "& .MuiTabs-indicator": { backgroundColor: "#ff6f00" },
        }}
      >
        <Tab label="My Assignments" />
        <Tab label="Admin Match Assignments" />
      </Tabs>

      {passwordError && (
        <Alert severity="error" sx={{ mx: 3, mt: 2 }}>
          {passwordError}
        </Alert>
      )}

      <TabPanel value={tabValue} index={0}>
        <MyAssignmentsTab />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {adminUnlocked ? (
          <AdminAssignmentsTab />
        ) : (
          <Paper sx={{ p: 4, mx: 3, mt: 2, maxWidth: 400, textAlign: "center" }}>
            <Typography variant="h6" gutterBottom>
              Admin Access Required
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Enter the admin password to access match assignment management.
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexDirection: "column" }}>
              <TextField
                fullWidth
                type="password"
                label="Admin Password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handlePasswordSubmit();
                  }
                }}
              />
              <Button variant="contained" onClick={handlePasswordSubmit}>
                Unlock Admin
              </Button>
            </Box>
          </Paper>
        )}
      </TabPanel>
    </Box>
  );
}
