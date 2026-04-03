import React, { useState } from "react";
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import Page from "../Page";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, error } = useAuth();
  
  const [name, setName] = useState("");
  const [teamNumber, setTeamNumber] = useState("");
  const [localError, setLocalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  // Get redirect destination from location state
  const from = location.state?.from || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    if (!name.trim()) {
      setLocalError("Please enter your name");
      setIsSubmitting(false);
      return;
    }

    if (!teamNumber) {
      setLocalError("Please enter your team number");
      setIsSubmitting(false);
      return;
    }

    const result = await login(name.trim(), teamNumber);
    
    if (result.success) {
      if (result.isNewUser) {
        setSuccessMessage(`Welcome! Account created for Team ${teamNumber}`);
      }
      // Navigate after brief delay to show success message
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1000);
    } else {
      setLocalError(result.error || "Login failed");
    }
    
    setIsSubmitting(false);
  };

  return (
    <Page>
      <Container maxWidth="sm">
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "80vh",
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              width: "100%",
              maxWidth: 400,
            }}
          >
            <Typography variant="h4" component="h1" align="center" gutterBottom>
              ScoutX Login
            </Typography>
            
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
              Enter your name and team number to access the scouting app.
              <br />
              If your team is not yet registered, an account will be created for you.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {localError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {localError}
              </Alert>
            )}

            {successMessage && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {successMessage}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Scouter Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                margin="normal"
                disabled={isSubmitting}
                placeholder="Enter your name"
                autoFocus
              />

              <TextField
                fullWidth
                label="Team Number"
                type="number"
                value={teamNumber}
                onChange={(e) => setTeamNumber(e.target.value)}
                margin="normal"
                disabled={isSubmitting}
                placeholder="Enter your team number"
                inputProps={{ min: 1 }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isSubmitting || loading}
                sx={{ mt: 3, mb: 2 }}
              >
                {isSubmitting ? <CircularProgress size={24} /> : "Login / Register"}
              </Button>
            </form>

            <Typography variant="caption" color="text.secondary" align="center" display="block">
              By logging in, you agree to use this app for scouting purposes only.
            </Typography>
          </Paper>
        </Box>
      </Container>
    </Page>
  );
};

export default Login;