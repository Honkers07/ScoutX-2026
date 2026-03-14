import React, { useState } from "react";
import { Box, Stack, Typography, Button, useMediaQuery } from "@mui/material";
import { Constants } from "../../Constants";
import bgImage from "../../assets/backGround.png";
import calculateFuelScored from "../FuelCalculator";
import updateMatchData from "../UpdateMatchData";
import tuneFuelCalculator from "../FuelCalculatorTuner";

export default function Home() {
  const isSmallScreen = useMediaQuery("(max-width: 960px)");
  const isIPadScreen = useMediaQuery("(max-width: 1180px)");
  const isIPadPro = useMediaQuery("(max-width: 1366px)");
  const isVerySmallScreen = useMediaQuery("(max-width: 600px)");
  const isExtraSmallHeight = useMediaQuery("(max-height: 500px)");
  const isNarrowScreen = useMediaQuery("(max-width: 800px)");
  const isVeryNarrowScreen = useMediaQuery("(max-width: 400px)");

  const handleCalculateFuel = async () => {
    try {
      // Call calculateFuelScored with a sample match number (e.g., 1)
      const result = await calculateFuelScored(43);
      console.log("Fuel Calculation Result:", result);
    } catch (error) {
      console.error("Error calculating fuel:", error);
    }
  };

  // Determine if we're in a phone-like scenario (small width AND small height)
  const isPhoneLayout =
    isVerySmallScreen || (isSmallScreen && isExtraSmallHeight);

  // Force two rows on small vertical displays OR narrow screens
  const isTwoRowLayout = isVerySmallScreen || isNarrowScreen;

  // Force three rows on very narrow screens
  const isThreeRowLayout = isVeryNarrowScreen;

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        minHeight: "100vh",
        minWidth: "100vw",
        boxSizing: "border-box",
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#1a1a1a",
        pt: isPhoneLayout ? 6 : 12,
        pl: isPhoneLayout ? 8 : 20,
      }}
    >
      {/* Title */}
      <Typography
        variant={isPhoneLayout ? "h3" : isSmallScreen ? "h3" : "h1"}
        gutterBottom
        sx={{
          textAlign: "left",
          color: "white",
          fontFamily: '"Noto Sans", sans-serif',
          mb: isPhoneLayout ? 2 : 3,
        }}
      >
        Scout
        <Box
          component="span"
          sx={{
            backgroundImage: "linear-gradient(to right, #FFA500, #FF4500)",
            backgroundClip: "text",
            color: "transparent",
            WebkitBackgroundClip: "text",
            display: "inline-block",
            verticalAlign: "top",
            pl: 1,
          }}
        >
          X
        </Box>
      </Typography>
      <Typography
        variant={isPhoneLayout ? "h6" : isSmallScreen ? "h5" : "h3"}
        sx={{
          textAlign: "left",
          color: "white",
          fontFamily: '"Noto Sans", sans-serif',
          mb: 1,
        }}
      >
        Collection. Visualization. Analysis.
      </Typography>
      <Typography
        variant={isPhoneLayout ? "body1" : isSmallScreen ? "h6" : "h5"}
        sx={{
          textAlign: "left",
          color: "grey",
          fontFamily: '"Noto Sans", sans-serif',
          mb: isPhoneLayout ? 4 : 5,
        }}
      >
        Developed by Iron Claw 972
      </Typography>

      {/* Main navigation buttons - Single row for normal displays */}
      {!isTwoRowLayout && !isThreeRowLayout && (
        <Stack
          direction="row"
          spacing={2}
          flexWrap="wrap"
          sx={{ width: "100%" }}
        >
          {renderScoutButton(
            "/timer",
            "Shoot Scout",
            isPhoneLayout,
            isSmallScreen
          )}
          {renderScoutButton(
            "/fuelscout",
            "Fuel Scout",
            isPhoneLayout,
            isSmallScreen
          )}
          {renderScoutButton(
            "/videoscout",
            "Video Scout",
            isPhoneLayout,
            isSmallScreen
          )}
          {renderScoutButton(
            "/DataVisualizationDisplay",
            "Data Analytics",
            isPhoneLayout,
            isSmallScreen
          )}
          {renderScoutButton(
            "/assignments",
            "Assignments",
            isPhoneLayout,
            isSmallScreen
          )}
          {renderScoutButton(
            "/credits",
            "Credits",
            isPhoneLayout,
            isSmallScreen
          )}
          {renderScoutButton(
            "/flappybird",
            "FLAPPY BIRD",
            isPhoneLayout,
            isSmallScreen
          )}
        </Stack>
      )}

      {/* Two rows for small vertical displays or narrow screens */}
      {isTwoRowLayout && !isThreeRowLayout && (
        <Stack direction="column" spacing={2} sx={{ width: "100%" }}>
          {/* First row */}
          <Stack
            direction="row"
            spacing={1.5}
            flexWrap="wrap"
            sx={{ width: "100%" }}
          >
            {renderScoutButton(
              "/fuelscout",
              "Fuel Scout",
              isPhoneLayout,
              isSmallScreen
            )}
            {renderScoutButton(
              "/timer",
              "Shoot Times",
              isPhoneLayout,
              isSmallScreen
            )}
            {renderScoutButton(
              "/videoscout",
              "Video Scout",
              isPhoneLayout,
              isSmallScreen
            )}
            {renderScoutButton(
              "/DataVisualizationDisplay",
              "Data",
              isPhoneLayout,
              isSmallScreen
            )}
          </Stack>

          {/* Second row */}
          <Stack
            direction="row"
            spacing={1.5}
            flexWrap="wrap"
            sx={{ width: "100%" }}
          >
            {renderScoutButton(
              "/assignments",
              "Assignments",
              isPhoneLayout,
              isSmallScreen
            )}
            {renderScoutButton(
              "/credits",
              "Credits",
              isPhoneLayout,
              isSmallScreen
            )}
            {renderScoutButton(
              "/flappybird",
              "FLAPPY BIRD",
              isPhoneLayout,
              isSmallScreen
            )}
          </Stack>
        </Stack>
      )}

      {/* Three rows for very narrow screens */}
      {isThreeRowLayout && (
        <Stack direction="column" spacing={2} sx={{ width: "100%" }}>
          {/* First row - 3 buttons */}
          <Stack
            direction="row"
            spacing={1.5}
            flexWrap="wrap"
            sx={{ width: "100%" }}
          >
            {renderScoutButton(
              "/fuelscout",
              "Fuel",
              isPhoneLayout,
              isSmallScreen
            )}
            {renderScoutButton("/timer", "Shoot", isPhoneLayout, isSmallScreen)}
            {renderScoutButton(
              "/videoscout",
              "Video",
              isPhoneLayout,
              isSmallScreen
            )}
          </Stack>

          {/* Second row - 2 buttons */}
          <Stack
            direction="row"
            spacing={1.5}
            flexWrap="wrap"
            sx={{ width: "100%" }}
          >
            {renderScoutButton(
              "/DataVisualizationDisplay",
              "Data",
              isPhoneLayout,
              isSmallScreen
            )}
            {renderScoutButton(
              "/assignments",
              "Assign",
              isPhoneLayout,
              isSmallScreen
            )}
          </Stack>

          {/* Third row - 2 buttons */}
          <Stack
            direction="row"
            spacing={1.5}
            flexWrap="wrap"
            sx={{ width: "100%" }}
          >
            {renderScoutButton(
              "/credits",
              "Credits",
              isPhoneLayout,
              isSmallScreen
            )}
          </Stack>
        </Stack>
      )}
    </Box>
  );
}

/* Renders an MUI Button instead of Grid */
function renderScoutButton(path, label, isPhoneLayout, isSmallScreen) {
  return (
    <Button
      variant="contained"
      sx={{
        backgroundColor: "#FF9800",
        color: "white",
        borderRadius: isSmallScreen ? "4px" : "8px",
        px: isSmallScreen ? 1.5 : 4,
        py: isSmallScreen ? 1 : 2,
        fontSize: isSmallScreen ? "0.55rem" : "1.1rem",
        fontWeight: "bold",
        textTransform: "none",
        minWidth: isSmallScreen ? "70px" : "auto",
        "&:hover": { backgroundColor: "#e65100" },
      }}
      onClick={() => {
        window.location.pathname = path;
      }}
    >
      {label}
    </Button>
  );
}
