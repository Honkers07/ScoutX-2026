import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import firebase from "../../../firebase";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableSortLabel,
  IconButton,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from "@mui/material";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";

const DataTable = () => {
  const [teamData, setTeamData] = useState([]);
  const [sortBy, setSortBy] = useState("Average Total Fuel"); // Default sort column
  const [sortDirection, setSortDirection] = useState("asc"); // Default sort direction
  const [deletedRows, setDeletedRows] = useState([]); // Track deleted rows

  // Get icon for defense metric - colored circle
  const getDefenseMetricIcon = (metric) => {
    let color;
    if (!metric || metric <= 0) {
      return "N/A";
    } else if (metric > 0.5) {
      color = "#2e7d32"; // Dark green - excellent
    } else if (metric > 0.25) {
      color = "#f9a825"; // Muted yellow - average
    } else {
      color = "#c62828"; // Muted red - poor
    }
    return (
      <Box
        sx={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: color,
          display: "inline-block",
        }}
      />
    );
  };

  // Get icon for data quality - colored circle
  const getDataQualityIcon = (quality) => {
    let color;
    if (!quality || quality < 0.5) {
      color = "#c62828"; // Muted red
    } else if (quality < 0.75) {
      color = "#f9a825"; // Muted yellow
    } else {
      color = "#2e7d32"; // Dark green
    }
    return (
      <Box
        sx={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: color,
          display: "inline-block",
        }}
      />
    );
  };
  const [restoreMatch, setRestoreMatch] = useState(""); // Track match to restore

  const matchDataRef = collection(firebase, "matchData");

  // Get weight based on data quality color range
  const getQualityWeight = (quality) => {
    if (!quality || quality < 0.5) return 0.25;  // Red: 25%
    if (quality < 0.75) return 0.50;             // Yellow: 50%
    return 1.0;                                   // Green: 100%
  };

  const calculateAverages = (teamDocs) => {
    // Sort teamDocs by match number to get last 5 matches
    const sortedDocs = [...teamDocs].sort((a, b) => {
      const matchA = a.doc.data().matchNumber || 0;
      const matchB = b.doc.data().matchNumber || 0;
      return matchA - matchB;
    });

    // Use last 5 matches (or all if less than 5)
    const last5Docs = sortedDocs.slice(-5);

    // Calculate total weight based on fixed percentages
    let totalWeight = 0;
    last5Docs.forEach((item) => {
      const teamData = item.teamData;
      if (teamData) {
        totalWeight += getQualityWeight(teamData.quality);
      }
    });

    // Calculate weighted sums and simple sums
    const result = last5Docs.reduce(
      (acc, item) => {
        const teamData = item.teamData;

        if (teamData) {
          const weight = getQualityWeight(teamData.quality);
          const autoFuel = teamData.autoFuel || 0;
          const teleFuel = teamData.teleFuel || 0;
          const totalFuel = autoFuel + teleFuel;
          const ballsPerSecond = teamData.ballsPerSecond || 0;
          const shootingTime = teamData.shootingTime || 0;

          // Weighted sums
          acc.weightedAutoFuel += autoFuel * weight;
          acc.weightedTeleFuel += teleFuel * weight;
          acc.weightedTotalFuel += totalFuel * weight;
          acc.weightedBallsPerSecond += ballsPerSecond * weight;
          acc.weightedShootingTime += shootingTime * weight;

          // Simple sums
          acc.simpleAutoFuel += autoFuel;
          acc.simpleTeleFuel += teleFuel;
          acc.simpleTotalFuel += totalFuel;
          acc.simpleBallsPerSecond += ballsPerSecond;
          acc.simpleShootingTime += shootingTime;
          acc.simpleDataQuality += teamData.quality || 0;
          acc.dataQualityMatchCount++;

          // Defense metrics - derive from quickFeedback
          const quickFeedback = teamData.quickFeedback || [];
          const wasDefending = quickFeedback.includes("Defended");
          const wasDefendedAgainst = quickFeedback.includes("Was Defended Against");
          
          // Only count defenseMetric if the team was actually defending
          if (wasDefending) {
            acc.simpleDefenseMetric += teamData.defenseMetric || 0;
            acc.defendingMatchCount++;
          }
          if (wasDefendedAgainst) {
            acc.defendedAgainstCount++;
          }

          acc.matchCount++;
        }

        return acc;
      },
      {
        weightedAutoFuel: 0,
        weightedTeleFuel: 0,
        weightedTotalFuel: 0,
        weightedBallsPerSecond: 0,
        weightedShootingTime: 0,
        simpleAutoFuel: 0,
        simpleTeleFuel: 0,
        simpleTotalFuel: 0,
        simpleBallsPerSecond: 0,
        simpleShootingTime: 0,
        simpleDefenseMetric: 0,
        simpleDataQuality: 0,
        dataQualityMatchCount: 0,
        defendingMatchCount: 0,
        defendedAgainstCount: 0,
        matchCount: 0,
      }
    );

    const matchCount = result.matchCount;

    if (matchCount === 0) {
      return {
        "Average Total Fuel": 0,
        "Average Auto Fuel": 0,
        "Average Data Quality": "N/A",
        "Average Balls Per Second": 0,
        "Average Defense Metric": 0,
        "Defended Against %": "N/A",
      };
    }

    // Calculate weighted averages (fall back to simple if no weight)
    if (totalWeight > 0) {
      return {
        "Average Total Fuel":
          Math.round((result.weightedTotalFuel / totalWeight) * 10) / 10,
        "Average Auto Fuel":
          Math.round((result.weightedAutoFuel / totalWeight) * 10) / 10,
        "Average Data Quality":
          result.dataQualityMatchCount > 0
            ? parseFloat((result.simpleDataQuality / result.dataQualityMatchCount).toFixed(2))
            : "N/A",
        "Average Balls Per Second":
          Math.round((result.weightedBallsPerSecond / totalWeight) * 100) / 100,
        "Average Defense Metric":
          result.defendingMatchCount > 0
            ? Math.round((result.simpleDefenseMetric / result.defendingMatchCount) * 100) / 100
            : "N/A",
        "Defended Against %":
          result.defendedAgainstCount > 0
            ? Math.round((result.defendedAgainstCount / matchCount) * 100) + "%"
            : "N/A",
      };
    } else {
      return {
        "Average Total Fuel":
          Math.round((result.simpleTotalFuel / matchCount) * 10) / 10,
        "Average Auto Fuel":
          Math.round((result.simpleAutoFuel / matchCount) * 10) / 10,
        "Average Data Quality":
          result.dataQualityMatchCount > 0
            ? parseFloat((result.simpleDataQuality / result.dataQualityMatchCount).toFixed(2))
            : "N/A",
        "Average Balls Per Second":
          Math.round((result.simpleBallsPerSecond / matchCount) * 100) / 100,
        "Average Defense Metric":
          result.defendingMatchCount > 0
            ? Math.round((result.simpleDefenseMetric / result.defendingMatchCount) * 100) / 100
            : "N/A",
        "Defended Against %":
          result.defendedAgainstCount > 0
            ? Math.round((result.defendedAgainstCount / matchCount) * 100) + "%"
            : "N/A",
      };
    }
  };

  useEffect(() => {
    if (restoreMatch) {
      handleRestoreRow();
    }
  }, [restoreMatch]);

  useEffect(() => {
    const fetchData = async () => {
      const querySnapshot = await getDocs(matchDataRef);

      // Group data by team number
      const groupedByTeam = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const teams = data.teams || [];

        teams.forEach((team) => {
          const teamNumber = team.teamNumber;
          if (!groupedByTeam[teamNumber]) {
            groupedByTeam[teamNumber] = [];
          }
          // Store both the doc and the team data for this team
          groupedByTeam[teamNumber].push({ doc: doc, teamData: team });
        });
      });

      // Array of objects, where each object contains the teamNumber and the calculated averages for that team
      const teamAverages = Object.entries(groupedByTeam).map(
        ([teamNumber, teamDocs]) => {
          const averages = calculateAverages(teamDocs);
          return {
            teamNumber,
            ...averages,
          };
        }
      );

      setTeamData(teamAverages);
    };

    fetchData();
  }, []);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  const handleDeleteRow = (teamNumber) => {
    const updatedTeamData = teamData.filter(
      (team) => team.teamNumber !== teamNumber
    );
    const deletedTeam = teamData.find((team) => team.teamNumber === teamNumber);
    setTeamData(updatedTeamData);
    setDeletedRows([...deletedRows, deletedTeam]);
  };

  const handleRestoreRow = () => {
    const teamToRestore = deletedRows.find(
      (team) => team.teamNumber === restoreMatch
    );
    setTeamData([...teamData, teamToRestore]);
    setDeletedRows(
      deletedRows.filter((team) => team.teamNumber !== restoreMatch)
    );
    setRestoreMatch(""); // Clear restore match to hide restore button
  };

  const sortedData = [...teamData].sort((a, b) => {
    const valueA = a[sortBy];
    const valueB = b[sortBy];
    return sortDirection === "asc" ? valueB - valueA : valueA - valueB;
  });

  const columns = [
    "Average Data Quality",
    "Average Total Fuel",
    "Average Auto Fuel",
    "Average Balls Per Second",
    "Average Defense Metric",
    "Defended Against %",
  ];

  return (
    <>
      <Typography
        variant="caption"
        sx={{ display: "block", mb: 1, color: "gray" }}
      >
        * Averages are calculated from the last 5 matches and weighted on data quality
      </Typography>
      <Table
        sx={{
          width: "100%",
          borderCollapse: "collapse",
          backgroundColor: "#f57c00",
          mt: 4,
        }}
      >
        <TableHead sx={{ backgroundColor: "#222", color: "white" }}>
          <TableRow>
            <TableCell
              sx={{ color: "#f57c00", fontWeight: "bold" }}
            ></TableCell>
            <TableCell sx={{ color: "#f57c00", fontWeight: "bold" }}>
              Team Number
            </TableCell>
            {columns.map((column) => (
              <TableCell key={column} sx={{ color: "white" }}>
                <TableSortLabel
                  active={sortBy === column}
                  direction={sortDirection}
                  onClick={() => handleSort(column)}
                  sx={{
                    color: "white",
                    "&.MuiTableSortLabel-active": {
                      color: "#f57c00",
                    },
                    "&:hover": {
                      color: "#f57c00",
                    },
                  }}
                >
                  {column}
                </TableSortLabel>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedData.map((team, index) => (
            <TableRow
              key={team.teamNumber}
              sx={{
                backgroundColor: index % 2 === 0 ? "#333" : "#444",
                "&:hover": {
                  backgroundColor: "#555",
                },
              }}
            >
              <TableCell>
                <IconButton
                  onClick={() => handleDeleteRow(team.teamNumber)}
                  sx={{ color: "primary" }}
                >
                  <RemoveCircleIcon />
                </IconButton>
              </TableCell>
              <TableCell sx={{ color: "#f57c00" }}>{team.teamNumber}</TableCell>
              <TableCell sx={{ color: "white" }}>
                {team["Average Data Quality"] !== "N/A"
                  ? getDataQualityIcon(team["Average Data Quality"])
                  : "N/A"}
              </TableCell>
              <TableCell sx={{ color: "white" }}>
                {Number(team["Average Total Fuel"].toFixed(1))}
              </TableCell>
              <TableCell sx={{ color: "white" }}>
                {Number(team["Average Auto Fuel"].toFixed(1))}
              </TableCell>
              <TableCell sx={{ color: "white" }}>
                {Number(team["Average Balls Per Second"].toFixed(1))}
              </TableCell>
              <TableCell sx={{ color: "white" }}>
                {team["Average Defense Metric"] !== "N/A"
                  ? getDefenseMetricIcon(team["Average Defense Metric"])
                  : "N/A"}
              </TableCell>
              <TableCell sx={{ color: "white" }}>
                {typeof team["Defended Against %"] === "string" && team["Defended Against %"].includes("%")
                  ? team["Defended Against %"]
                  : team["Defended Against %"] === "N/A"
                    ? "N/A"
                    : `${team["Defended Against %"]}%`}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {deletedRows.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Restore Team</InputLabel>
            <Select
              value={restoreMatch}
              onChange={(e) => setRestoreMatch(e.target.value)}
              label="Restore Team"
            >
              <MenuItem value="">
                <em>Restore Team</em>
              </MenuItem>
              {deletedRows.map((team) => (
                <MenuItem key={team.teamNumber} value={team.teamNumber}>
                  {team.teamNumber}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}
    </>
  );
};

export default DataTable;
