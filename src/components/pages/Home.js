import React from "react";
import { Box, Stack, Typography, Button, useMediaQuery } from "@mui/material";
import { Constants } from "../../Constants";
import bgImage from "../../assets/backGround.png";
import calculateFuelScored from "../FuelCalculator";


export default function Home() {
   const isSmallScreen = useMediaQuery("(max-width: 960px)");
   const isIPadScreen = useMediaQuery("(max-width: 1180px)")
   const isIPadPro = useMediaQuery("(max-width: 1366px)")


   return (
       <Box sx={{
           position: "fixed",
           mt: -5,
           display: "flex",
           flexDirection: "column",
           overflow: "hidden",
           alignItems: "center",
           justifyContent: "center",
           minHeight: isSmallScreen ? "100%" : isIPadScreen ? "100%" : isIPadPro ? "100%" : "100%",
           minWidth: isSmallScreen ? "100%" : isIPadScreen ? "100%" : isIPadPro ? "100%" : "100%",
           boxSizing: "border-box",
           backgroundImage: `url(${bgImage})`,
           backgroundSize: "cover",
           backgroundPosition: "center",
           backgroundRepeat: "no-repeat",
       }}>
          
           {/* Title */}
           <Typography
               variant={isSmallScreen ? "h3" : "h1"}
               gutterBottom
               sx={{
                   position: "absolute",
                   top: isSmallScreen ? "10%" : isIPadScreen ? "4.5%" : isIPadPro ? "7%" : 60,
                   left: isSmallScreen ? 70 : isIPadScreen ? 60 : isIPadPro ? 100 : 200,
                   textAlign: "left",
                   display: "inline-block",
                   color: "white",
                   fontFamily: '"Noto Sans", sans-serif',
               }}
           >
               Scout
               <Box
                   component="span"
                   sx={{
                       backgroundImage: 'linear-gradient(to right, #FFA500, #FF4500)',
                       backgroundClip: 'text',
                       color: 'transparent',
                       WebkitBackgroundClip: 'text',
                       display: "inline-block",
                       verticalAlign: "top",
                       pl: 2,
                       pt: .20,
                   }}
               >
                   X
               </Box>
           </Typography>


          
           <Typography
               variant={isSmallScreen ? "h5" : "h3"}
               sx={{
                   position: "absolute",
                   top: isSmallScreen ? 90 : isIPadScreen ? 160 : isIPadPro ? 160 : 180,
                   left: isSmallScreen ? 70 : isIPadScreen ? 60 : isIPadPro ? 100 : 200,
                   textAlign: "left",
                   display: "inline-block",
                   color: "white",
                   fontFamily: '"Noto Sans", sans-serif',
               }}
           >
               Collection. Visualization. Analysis.
           </Typography>
           <Typography
               variant={isSmallScreen ? "h6" : "h5"}
               sx={{
                   position: "absolute",
                   top: isSmallScreen ? 120 : isIPadScreen ? 250 : isIPadPro ? 250 : 260,
                   left: isSmallScreen ? 70 : isIPadScreen ? 65 : isIPadPro ? 105 : 205,
                   textAlign: "left",
                   display: "inline-block",
                   color: "grey",
                   fontFamily: '"Noto Sans", sans-serif',
               }}
           >
               Developed by Iron Claw 972
           </Typography>




         
           <Stack direction="row" spacing={2} sx={{ position: "absolute",
                    top: isSmallScreen ? "42%" : isIPadPro ? 320 : isIPadPro ? 330 : 320,
                    left: isSmallScreen ? 70 : isIPadScreen ? 60 : isIPadPro ? 100 : 200,
                   mt: 4 }}>
               {renderScoutButton('/fuelscout', "Fuel Scout", isSmallScreen)}
               {renderScoutButton('/timer', "Shoot Times Scout", isSmallScreen)}
               {renderScoutButton('/videoscout', "Video Scout", isSmallScreen)}
               {renderScoutButton('/DataVisualizationDisplay', "Data Analytics", isSmallScreen)}
               {renderScoutButton('/credits', "Credits", isSmallScreen)}
               <Button
                   variant="contained"
                   sx={{
                       backgroundColor: "#1565C0",
                       color: "white",
                       borderRadius: "8px",
                       px: isSmallScreen ? 2 : isIPadScreen ? 4 : isIPadPro ? 5 : 4,
                       py: 2,
                       fontSize: isSmallScreen ? "0.7rem" : isIPadScreen ? "1.1rem" : isIPadPro ? "4.0rem" : "1.1rem",
                       fontWeight: "bold",
                       textTransform: "none",
                       "&:hover": { backgroundColor: "#0D47A1" }
                   }}
                   onClick={async () => {
                       try {
                           const matchNumber = 1;
                           const results = await calculateFuelScored(matchNumber);
                           console.log("Fuel Scored Results:", results);
                       } catch (error) {
                           console.error("Error calculating fuel:", error);
                       }
                   }}
               >
                   Calculate Fuel
               </Button>

           </Stack>
       </Box>
   );
}


/* Renders an MUI Button instead of Grid */
function renderScoutButton(path, label, isSmallScreen, isIPadScreen, isIPadPro) {
   return (
       <Button
           variant="contained"
           sx={{
               backgroundColor: "#FF9800",
               color: "white",
               borderRadius: "8px",
               px: isSmallScreen ? 2 : isIPadScreen ? 4 : isIPadPro ? 5 : 4,
               py: 2,
               fontSize: isSmallScreen ? "0.7rem" : isIPadScreen ? "1.1rem" : isIPadPro ? "4.0rem" : "1.1rem",
               fontWeight: "bold",
               textTransform: "none",
               "&:hover": { backgroundColor: "#e65100" }
           }}
           onClick={() => { window.location.pathname = path; }}
       >
           {label}
       </Button>
   );
}
