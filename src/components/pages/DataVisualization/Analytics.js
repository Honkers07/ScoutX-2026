import React, { useState } from "react";
import {
  Typography,
  TextField,
  Button,
  CircularProgress,
  Card,
  CardContent,
  Box,
} from "@mui/material";
import firebase from "../../../firebase";
import { collection, getDocs } from "firebase/firestore";
import { ElementPointsTele, ElementPointsAuto } from "../../MatchConstants";
import axios from "axios"; // For calling the Firebase function

const Analytics = () => {
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [team3, setTeam3] = useState("");
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userRequest, setUserRequest] = useState(null);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null); // For GPT response

  const matchScoutDataRef = collection(firebase, "matchScoutData");

  // Fetches match data for a given team
  const getTeamData = async (team) => {
    if (!team) return;
    try {
      const querySnapshot = await getDocs(matchScoutDataRef);

      const teamDocs = querySnapshot.docs.filter((doc) => {
        const docId = doc.id.split("_")[0];
        return docId === team;
      });

      if (teamDocs.length === 0) {
        return { team, matchData: null }; // Return null matchData instead of breaking
      } else {
        const fields = [
          "leave",
          "AutoAlgaeNet",
          "AutoAlgaeProcessor",
          "AutoCoralL1",
          "AutoCoralL2",
          "AutoCoralL3",
          "AutoCoralL4",
          "TeleAlgaeNet",
          "TeleAlgaeProcessor",
          "TeleCoralL1",
          "TeleCoralL2",
          "TeleCoralL3",
          "TeleCoralL4",
          "ClimbPosition",
        ];

        const extraInfo = [
          "intakeBroken",
          "outtakeBroken",
          "elevatorBroken",
          "armBroken",
          "brownsOut",
          "shooterBroken",
          "canKnockAlgae",
          "missesOuttakesConsistently",
          "slowIntakes",
          "disabled",
          "goodDefenseFromOpponents",
          "playedMajorityDefense",
          "touchItOwnIt",
          "aStopped",
          "eStopped",
          "knockedCage",
          "failedClimb",
          "stoleFuel",
          "wasDefendedAgainst",
          "defended",
        ];

        const Points = [
          { field: "Leave", multiplier: ElementPointsAuto.LEAVE },
          { field: "AutoAlgaeNet", multiplier: ElementPointsAuto.ALGAENET },
          {
            field: "AutoAlgaeProcessor",
            multiplier: ElementPointsAuto.ALGAEPROCESSOR,
          },
          { field: "AutoCoralL1", multiplier: ElementPointsAuto.CORALL1 },
          { field: "AutoCoralL2", multiplier: ElementPointsAuto.CORALL2 },
          { field: "AutoCoralL3", multiplier: ElementPointsAuto.CORALL3 },
          { field: "AutoCoralL4", multiplier: ElementPointsAuto.CORALL4 },
          { field: "TeleAlgaeNet", multiplier: ElementPointsTele.ALGAENET },
          {
            field: "TeleAlgaeProcessor",
            multiplier: ElementPointsTele.ALGAEPROCESSOR,
          },
          { field: "TeleCoralL1", multiplier: ElementPointsTele.CORALL1 },
          { field: "TeleCoralL2", multiplier: ElementPointsTele.CORALL2 },
          { field: "TeleCoralL3", multiplier: ElementPointsTele.CORALL3 },
          { field: "TeleCoralL4", multiplier: ElementPointsTele.CORALL4 },
          { field: "Climb", multiplier: 1 },
        ];

        // Generate the match data for this team
        const matchData = teamDocs.map((doc) => {
          const data = doc.data();
          let matchObject = {
            matchNumber: data["match"],
            Points: 0,
            Cycles: 0,
            CoralCycles: 0,
            AlgaeCycles: 0,
          };

          fields.forEach((field) => {
            if (field === "ClimbPosition") {
              if (data[field] === "Deep") {
                matchObject["Climb"] = ElementPointsTele.DEEP;
              } else if (data[field] === "Shallow") {
                matchObject["Climb"] = ElementPointsTele.SHALLOW;
              } else if (data[field] === "Parked") {
                matchObject["Climb"] = ElementPointsTele.PARK;
              } else {
                matchObject["Climb"] = 0;
              }
            } else if (field === "leave") {
              matchObject["Leave"] = data[field] === "true" ? 1 : 0;
            } else {
              matchObject[field] = data[field] !== undefined ? data[field] : 0;
            }
          });

          let points = 0;
          let coralCycles = 0;
          let algaeCycles = 0;

          Points.forEach((fieldConfig) => {
            let fieldValue = matchObject[fieldConfig.field];
            const multiplier = fieldConfig.multiplier;
            points += fieldValue * multiplier;
            if (fieldConfig.field.includes("Coral")) coralCycles += fieldValue;
            if (fieldConfig.field.includes("Algae")) algaeCycles += fieldValue;
          });

          let totalCycles = coralCycles + algaeCycles;

          matchObject.Points = points;
          matchObject.Cycles = totalCycles;
          matchObject.CoralCycles = coralCycles;
          matchObject.AlgaeCycles = algaeCycles;

          let extraInfoList = [];
          extraInfo.forEach((info) => {
            if (data[info] === "true") {
              extraInfoList.push(info);
            }
          });
          matchObject["Extra Information"] = extraInfoList.join(", ") || "None";

          return matchObject;
        });

        return { team, matchData };
      }
    } catch (err) {
      setError("Error fetching document or GPT analysis: " + err.message);
    }
  };

  const analyzeMatches = async () => {
    setError(null);

    const teamsToAnalyze = [team1, team2, team3].filter((team) => team);
    if (teamsToAnalyze.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const teamDataPromises = teamsToAnalyze.map(getTeamData);
      const allTeamData = await Promise.all(teamDataPromises);

      // Check if any team is missing data
      const missingTeams = allTeamData.filter(
        (data) => data && data.matchData === null
      );
      if (missingTeams.length > 0) {
        setError(
          `No matches found for team number(s): ${missingTeams
            .map((t) => t.team)
            .join(", ")}`
        );
        return; // Stop execution if any team is missing
      }

      // All teams exist; proceed with analysis
      setMatches(allTeamData);

      setLoading(true);

      const response = await axios.post(
        "https://analyzeteamdata-wdg4jgd2qa-uc.a.run.app",
        { teamData: allTeamData, userRequest }
      );
      setAnalysis(response.data.analysis);
    } catch (error) {
      setLoading(false);
      setError("Error analyzing matches: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    analyzeMatches(); // Call the function to fetch and analyze matches
  };

  // Function to split GPT analysis text into paragraphs based on double new lines
  const formatAnalysis = (analysisText) => {
    return analysisText.split("\n\n").map((paragraph, index) => (
      <Typography key={index} variant="body1" paragraph>
        {paragraph}
      </Typography>
    ));
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Enter Team Number 1"
          variant="outlined"
          value={team1}
          onChange={(e) => setTeam1(e.target.value)}
          fullWidth
          margin="normal"
        />
        {team1 && (
          <TextField
            label="Enter Team Number 2"
            variant="outlined"
            value={team2}
            onChange={(e) => setTeam2(e.target.value)}
            fullWidth
            margin="normal"
          />
        )}
        {team2 && (
          <TextField
            label="Enter Team Number 3"
            variant="outlined"
            value={team3}
            onChange={(e) => setTeam3(e.target.value)}
            fullWidth
            margin="normal"
          />
        )}
        <TextField
          label="Enter Optional Considerations"
          variant="outlined"
          value={userRequest}
          inputProps={{ maxLength: 500 }}
          onChange={(e) => setUserRequest(e.target.value)}
          fullWidth
          margin="normal"
          helperText="Specific focuses on robot performance. For example, only focus on coral."
        />
        <Button
          sx={{ mt: 2 }}
          variant="contained"
          color="primary"
          type="submit"
          disabled={loading}
          fullWidth
        >
          {loading ? <CircularProgress size={24} /> : "Analyze"}
        </Button>
      </form>

      {error && (
        <Typography color="error" variant="body1" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}

      {analysis && (
        <Card sx={{ mt: 4, mb: 4, maxWidth: "100%", boxShadow: 3 }}>
          <CardContent>
            <Box sx={{ maxWidth: "100%", overflowWrap: "break-word" }}>
              {formatAnalysis(analysis)} {/* Format the analysis here */}
            </Box>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default Analytics;
