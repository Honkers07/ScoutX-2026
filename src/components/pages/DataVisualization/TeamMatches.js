import {
  Box,
  Button,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TableContainer,
  Divider,
  useMediaQuery,
  Stack,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import firebase from "../../../firebase";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";
import TeamGraphs from "./TeamGraphs";

const TeamMatches = () => {
  const [team, setTeam] = useState("");
  const [matches, setMatches] = useState([]); // Stores match data for each team
  const [deletedRows, setDeletedRows] = useState([]); // Stores deleted rows
  const [sortBy, setSortBy] = useState("matchNumber");
  const [sortDirection, setSortDirection] = useState("asc");
  const [error, setError] = useState(""); // To track errors
  const [restoreMatch, setRestoreMatch] = useState(""); // Selected match to restore
  const [teamToRestore, setTeamToRestore] = useState("");

  // Column fields for the new data structure
  const columns = [
    "matchNumber",
    "dataQuality",
    "totalFuel",
    "autoFuel",
    "teleFuel",
    "ballsPerSecond",
    "shootingTime",
    "totalClimb",
    "autoClimb",
    "teleClimb",
    "comments",
    "quickFeedback",
  ];

  const matchDataRef = collection(firebase, "matchData");

  const handleGetData = async () => {
    setError(""); // Reset error message

    try {
      const querySnapshot = await getDocs(matchDataRef);

      // Filter documents for the specified team
      const teamDocs = querySnapshot.docs.filter((doc) => {
        const data = doc.data();
        const teams = data.teams || [];
        return teams.some((t) => Number(t.teamNumber) === Number(team));
      });

      if (teamDocs.length === 0) {
        setError("No matches found for this team number");
        setTeam("");
        return;
      }

      // Process match data
      const matchData = teamDocs
        .map((doc) => {
          const data = doc.data();
          const teams = data.teams || [];

          // Find this team's data in the match
          const teamInfo = teams.find(
            (t) => Number(t.teamNumber) === Number(team)
          );

          if (!teamInfo) return null;

          return {
            matchNumber: data.matchNumber,
            autoFuel: teamInfo.autoFuel || 0,
            teleFuel: teamInfo.teleFuel || 0,
            totalFuel: teamInfo.totalFuel || 0,
            ballsPerSecond: teamInfo.ballsPerSecond || 0,
            shootingTime: teamInfo.shootingTime || 0,
            autoClimb: teamInfo.autoClimb || 0,
            teleClimb: teamInfo.teleClimb || 0,
            totalClimb: (teamInfo.autoClimb || 0) + (teamInfo.teleClimb || 0),
            dataQuality: teamInfo.quality || 0,
            comments: teamInfo.comments || "None",
            quickFeedback:
              Array.isArray(teamInfo.quickFeedback) &&
              teamInfo.quickFeedback.length > 0
                ? teamInfo.quickFeedback.join(", ")
                : "None",
          };
        })
        .filter(Boolean);

      // Sort by match number
      matchData.sort((a, b) => a.matchNumber - b.matchNumber);

      const updatedMatchData = handleAverages(matchData);

      // Update matches with the new matchData for this team
      setMatches((prevMatches) => [
        ...prevMatches.filter((m) => m.team !== team), // Remove previous data for this team
        { team, matchData: updatedMatchData },
      ]);
      setTeam("");
    } catch (error) {
      console.error("Error fetching match data:", error);
      setError("Error fetching match data. Please try again.");
    }
  };

  const handleDeleteTeamData = (team) => {
    // Remove the team's data from the state
    setMatches((prevMatches) =>
      prevMatches.filter((teamData) => teamData.team !== team)
    );
  };

  const handleAverages = (matchData) => {
    if (matchData.length === 1) return matchData;

    // Ensure we are only working with valid matches (no "Average")
    const filteredMatchData = matchData.filter(
      (match) => match.matchNumber !== "Average"
    );

    if (filteredMatchData.length === 0) return [];

    // Use last 5 matches for average (or all if less than 5)
    const last5Matches = filteredMatchData.slice(-5);
    const numMatches = last5Matches.length;

    let averageMatch = { matchNumber: "Average (Last 5)" };
    const sumFields = {
      autoFuel: 0,
      teleFuel: 0,
      totalFuel: 0,
      ballsPerSecond: 0,
      shootingTime: 0,
      autoClimb: 0,
      teleClimb: 0,
      totalClimb: 0,
      dataQuality: 0,
    };

    // Sum up all numerical fields from last 5 matches
    last5Matches.forEach((match) => {
      sumFields.autoFuel += match.autoFuel || 0;
      sumFields.teleFuel += match.teleFuel || 0;
      sumFields.totalFuel += match.totalFuel || 0;
      sumFields.ballsPerSecond += match.ballsPerSecond || 0;
      sumFields.shootingTime += match.shootingTime || 0;
      sumFields.autoClimb += match.autoClimb || 0;
      sumFields.teleClimb += match.teleClimb || 0;
      sumFields.totalClimb += match.totalClimb || 0;
      sumFields.dataQuality += match.quality || 0;
    });

    // Compute averages
    averageMatch.autoFuel = parseFloat(
      (sumFields.autoFuel / numMatches).toFixed(1)
    );
    averageMatch.teleFuel = parseFloat(
      (sumFields.teleFuel / numMatches).toFixed(1)
    );
    averageMatch.totalFuel = parseFloat(
      (sumFields.totalFuel / numMatches).toFixed(1)
    );
    averageMatch.ballsPerSecond = parseFloat(
      (sumFields.ballsPerSecond / numMatches).toFixed(1)
    );
    averageMatch.shootingTime = parseFloat(
      (sumFields.shootingTime / numMatches).toFixed(1)
    );
    averageMatch.autoClimb = parseFloat(
      (sumFields.autoClimb / numMatches).toFixed(1)
    );
    averageMatch.teleClimb = parseFloat(
      (sumFields.teleClimb / numMatches).toFixed(1)
    );
    averageMatch.totalClimb = parseFloat(
      (sumFields.totalClimb / numMatches).toFixed(1)
    );
    averageMatch.dataQuality = parseFloat(
      (sumFields.dataQuality / numMatches).toFixed(2)
    );
    averageMatch.comments = "N/A";
    averageMatch.quickFeedback = "N/A";

    return [...filteredMatchData, averageMatch];
  };

  // Ensure updates in delete and restore functions
  const handleDeleteRow = (team, matchNumber) => {
    setError("");

    const teamData = matches.find((teamData) => teamData.team === team);

    if (teamData.matchData.length > 2) {
      const updatedMatchData = teamData.matchData.filter(
        (match) => match.matchNumber !== matchNumber
      );

      const deletedMatch = teamData.matchData.find(
        (match) => match.matchNumber === matchNumber
      );

      const newMatchDataWithAverages = handleAverages(updatedMatchData);

      // Update matches state
      setMatches(
        matches.map((teamData) =>
          teamData.team === team
            ? { ...teamData, matchData: newMatchDataWithAverages }
            : teamData
        )
      );

      // Store deleted row
      setDeletedRows((prevState) => ({
        ...prevState,
        [team]: [...(prevState[team] || []), deletedMatch],
      }));
    } else {
      setError("At least one match is necessary for visualization");
    }
  };

  const handleRestoreRow = () => {
    setError("");
    setRestoreMatch("");

    const matchToRestore = deletedRows[teamToRestore]?.find(
      (match) => match.matchNumber === restoreMatch
    );

    setMatches(
      matches.map((teamData) => {
        if (teamData.team === teamToRestore) {
          const updatedMatchData = [...teamData.matchData, matchToRestore];

          const newMatchDataWithAverages = handleAverages(updatedMatchData);

          return {
            ...teamData,
            matchData: newMatchDataWithAverages,
          };
        }
        return teamData;
      })
    );

    setDeletedRows((prevState) => ({
      ...prevState,
      [teamToRestore]: prevState[teamToRestore].filter(
        (match) => match.matchNumber !== restoreMatch
      ),
    }));
  };

  useEffect(() => {
    if (restoreMatch) {
      handleRestoreRow();
    }
  }, [restoreMatch]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  // Use `useMediaQuery` to determine if the screen is small
  const isSmallScreen = useMediaQuery("(max-width: 960px)");

  // Sort the filtered data
  const sortedData = matches.map((teamData) => ({
    ...teamData,
    matchData: [...teamData.matchData].sort((a, b) => {
      if (a.matchNumber === "Average (Last 5)") return -1;
      if (b.matchNumber === "Average (Last 5)") return 1;

      const valueA = a[sortBy];
      const valueB = b[sortBy];

      return sortDirection === "asc" ? valueB - valueA : valueA - valueB;
    }),
  }));

  // Format column name for display - capitalize first letter of every word
  const formatColumnName = (column) => {
    if (column === "matchNumber") return "Match Number";
    if (column === "ballsPerSecond") return "Balls Per Second";
    if (column === "shootingTime") return "Shooting Time";
    if (column === "autoClimb") return "Auto Climb";
    if (column === "teleClimb") return "Tele Climb";
    if (column === "totalClimb") return "Total Climb";
    if (column === "quickFeedback") return "Quick Feedback";
    if (column === "autoFuel") return "Auto Fuel";
    if (column === "teleFuel") return "Tele Fuel";
    if (column === "totalFuel") return "Total Fuel";
    if (column === "comments") return "Comments";
    if (column === "dataQuality") return "Data Quality";
    return column.replace(/([a-z])([A-Z])/g, "$1 $2");
  };

  // Get color for data quality (muted colors)
  const getDataQualityColor = (quality) => {
    if (!quality || quality < 0.5) return "#c62828"; // Muted red
    if (quality < 0.75) return "#f9a825"; // Muted yellow
    return "#2e7d32"; // Dark green
  };

  // Get icon for data quality - simple circle with muted colors
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

  return (
    <>
      <TextField
        label="Enter Team Number"
        variant="outlined"
        value={team}
        onChange={(e) => setTeam(e.target.value)}
        fullWidth
        margin="normal"
      />
      <Button
        variant="contained"
        color="primary"
        sx={{ mt: 2 }}
        onClick={handleGetData}
        fullWidth
      >
        Get Data
      </Button>

      {error && (
        <Typography color="error" variant="body1" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}

      <Typography
        variant="caption"
        sx={{ display: "block", mt: 1, color: "gray" }}
      >
        * Averages are calculated from the last 5 matches
      </Typography>

      {matches.length > 0 && (
        <Stack direction={"column"} spacing={4} mt={9}>
          <TeamGraphs matches={matches} />

          <Box>
            {/* Displaying filtered and sorted data */}
            {sortedData.map((teamData) => (
              <Box key={teamData.team}>
                <TableContainer
                  sx={{
                    maxWidth: "100%",
                    margin: "0 auto",
                    mt: isSmallScreen ? -4 : 0,
                  }}
                >
                  <Stack direction={"row"} spacing={4}>
                    <IconButton
                      sx={{ color: "primary", fontSize: 20 }}
                      onClick={() => handleDeleteTeamData(teamData.team)}
                    >
                      <RemoveCircleIcon />
                    </IconButton>
                    <Typography
                      variant="h5"
                      sx={{
                        color: "#f57c00",
                        position: "relative",
                        top: "5px",
                      }}
                    >
                      {`Team ${teamData.team}`}
                    </Typography>
                  </Stack>
                  <Divider
                    sx={{
                      width: "75%",
                      backgroundColor: "grey.800",
                      marginY: 4,
                      mt: 2,
                      mb: 4,
                    }}
                  />
                  <Table sx={{ minWidth: 650, backgroundColor: "#f57c00" }}>
                    <TableHead sx={{ backgroundColor: "#222", color: "white" }}>
                      <TableRow>
                        <TableCell
                          sx={{ color: "#f57c00", fontWeight: "bold" }}
                        ></TableCell>
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
                                "&:hover": { color: "#f57c00" },
                              }}
                            >
                              {formatColumnName(column)}
                            </TableSortLabel>
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {teamData.matchData.map((match, index) => (
                        <TableRow
                          key={match.matchNumber}
                          sx={{
                            backgroundColor: index % 2 === 0 ? "#333" : "#444",
                            "&:hover": { backgroundColor: "#555" },
                          }}
                        >
                          <TableCell>
                            {match.matchNumber !== "Average (Last 5)" ? (
                              <IconButton
                                sx={{ color: "primary", fontSize: 20 }}
                                onClick={() =>
                                  handleDeleteRow(
                                    teamData.team,
                                    match.matchNumber
                                  )
                                }
                              >
                                <RemoveCircleIcon />
                              </IconButton>
                            ) : (
                              <Box sx={{ width: 24, height: 43 }} />
                            )}
                          </TableCell>
                          {columns.map((column) => (
                            <TableCell
                              key={column}
                              sx={{
                                color:
                                  column === "dataQuality"
                                    ? match.matchNumber ===
                                        "Average (Last 5)" ||
                                      match.matchNumber === "Average"
                                      ? "white"
                                      : getDataQualityColor(match.dataQuality)
                                    : "white",
                                fontWeight: column === "normal",
                              }}
                            >
                              {column === "dataQuality"
                                ? match.matchNumber === "Average (Last 5)" ||
                                  match.matchNumber === "Average"
                                  ? "N/A"
                                  : getDataQualityIcon(match.dataQuality)
                                : typeof match[column] === "number"
                                ? Number(match[column].toFixed(1))
                                : match[column]}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Show restore dropdown and button under the team table */}
                <Stack spacing={1} direction="column" sx={{ mt: 4 }}>
                  {deletedRows[teamData.team]?.length > 0 && (
                    <Stack spacing={1} direction="column" sx={{ mt: 4 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Restore Match</InputLabel>
                        <Select
                          value={restoreMatch}
                          onChange={(e) => {
                            setTeamToRestore(teamData.team);
                            setRestoreMatch(e.target.value);
                          }}
                          label="Restore Match"
                        >
                          <MenuItem value="">
                            <em>Restore Match</em>
                          </MenuItem>
                          {deletedRows[teamData.team].map((match) => (
                            <MenuItem
                              key={match.matchNumber}
                              value={match.matchNumber}
                            >
                              Match {match.matchNumber}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>
                  )}
                </Stack>
              </Box>
            ))}
          </Box>
        </Stack>
      )}
    </>
  );
};

export default TeamMatches;
