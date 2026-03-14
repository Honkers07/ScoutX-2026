  import React, { useEffect, useState } from 'react';
  import { collection, getDocs } from 'firebase/firestore';
  import firebase from '../../../firebase';
  import {
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TableSortLabel,
    IconButton,
    Box,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Typography
  } from '@mui/material';
  import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
  import { ElementPointsTele, ElementPointsAuto } from '../../MatchConstants';
  import { AddCircleRounded } from '@mui/icons-material';

  const DataTable = () => {
    const [teamData, setTeamData] = useState([]);
    const [sortBy, setSortBy] = useState('Average Points'); // Default sort column
    const [sortDirection, setSortDirection] = useState('asc'); // Default sort direction
    const [deletedRows, setDeletedRows] = useState([]); // Track deleted rows
    const [restoreMatch, setRestoreMatch] = useState(""); // Track match to restore

    const matchScoutDataRef = collection(firebase, 'matchScoutData');

    const calculateAverages = (teamDocs) => {
      // General Filters
      let canLeave = false;
      let touchItOwnIt = false;

      //Climb Filters
      let canClimb = false;
      let canClimbDeep = false;
      let canClimbShallow = false;

      //Coral Filters
      let canScoreL4 = false;
      let canScoreL2L3 = false; //can add later if needed
      let canScoreTrough = false;
      let hasGroundIntakeCoral = false;
      let hasStationIntake = false;

      //Algae Filters
      let canScoreNet = false;
      let canScoreProcessor = false;
      let hasGroundIntakeAlgae = false;
      let canKnockAlgaeOff = false;
    
      const totals = teamDocs.reduce((acc, doc) => {
        const data = doc.data();
    
        const fields = [
          'leave', 'AutoAlgaeNet', 'AutoAlgaeProcessor', 'AutoCoralL1', 'AutoCoralL2', 'AutoCoralL3', 'AutoCoralL4',
          'TeleAlgaeNet', 'TeleAlgaeProcessor', 'TeleCoralL1', 'TeleCoralL2', 'TeleCoralL3', 'TeleCoralL4', 'ClimbPosition', 'touchItOwnIt', 'TeleCoralIntakeStation', 'TeleCoralIntakeGround', 'TeleAlgaeIntakeGround', 'AutoCoralIntakeStation', 'AutoCoralIntakeGround', 'AutoAlgaeIntakeGround', 'canKnockAlgae'
        ];
    
        fields.forEach((field) => {
          if (!acc[field]) acc[field] = 0;
    
          if (field === 'leave') {
            if (data[field] === 'true' || data[field] === true) { 
              acc[field]++;
              canLeave = true;
            }
          } 
          else if (field === 'ClimbPosition') {
            if (data[field] === 'Deep') {
              acc[field] += ElementPointsTele.DEEP;
              canClimb = true;
              canClimbDeep = true;
            } else if (data[field] === 'Shallow') {
              acc[field] += ElementPointsTele.SHALLOW;
              canClimb = true;
              canClimbShallow = true;
            } else if (data[field] === 'Parked') {
              acc[field] += ElementPointsTele.PARK;
            }
          } 
          else if (data[field] !== undefined) {
            acc[field] += data[field];
          }

          // Fitlers 
          if (field === 'touchItOwnIt') {
            if(data[field] === true || data[field] === 'true') {
              touchItOwnIt = true;
            }
          }

          //scoring filters
          else if(field === 'AutoCoralL1') {
            if(data[field] > 0) {
              canScoreTrough = true;
            }
          }
          else if(field === 'TeleCoralL1') {
            if(data[field] > 0) {
              canScoreTrough = true;
            }
          }
          else if(field === 'TeleCoralL2') {
            if(data[field] > 0) {
              canScoreL2L3 = true;
            }
          }
          else if(field === 'TeleCoralL3') {
            if(data[field] > 0) {
              canScoreL2L3 = true;
            }
          }
          else if(field === 'AutoCoralL2') {
            if(data[field] > 0) {
              canScoreL2L3 = true;
            }
          }
          else if(field === 'AutoCoralL2') {
            if(data[field] > 0) {
              canScoreL2L3 = true;
            }
          }
          else if(field === 'AutoCoralL4') {
            if(data[field] > 0) {
              canScoreL4 = true;
            }
          }
          else if(field === 'TeleCoralL4') {
            if(data[field] > 0) {
              canScoreL4 = true;
            }
          }

          //intake filters
          else if(field === 'TeleCoralIntakeGround') {
            if(data[field] > 0) {
              hasGroundIntakeCoral = true;
            }
          }
          else if(field === 'AutoCoralIntakeGround') {
            if(data[field] > 0) {
              hasGroundIntakeCoral = true;
            }
          }
          else if(field === 'TeleAlgaeIntakeGround') {
            if(data[field] > 0) {
              hasGroundIntakeAlgae = true;
            }
          }
          else if(field === 'TeleCoralIntakeStation') {
            if(data[field] > 0) {
              hasStationIntake = true;
            }
          }
          else if(field === 'AutoCoralIntakeStation') {
            if(data[field] > 0) {
              hasStationIntake = true;
            }
          }
          
          //outtake filters
          else if(field === 'AutoAlgaeNet') {
            if(data[field] > 0) {
              canScoreNet = true;
            }
          }
          else if(field === 'TeleAlgaeNet') {
            if(data[field] > 0) {
              canScoreNet = true;
            }
          }
          else if(field === 'AutoAlgaeProcessor') {
            if(data[field] > 0) {
              canScoreProcessor = true;
            }
          }
          else if(field === 'TeleAlgaeProcessor') {
            if(data[field] > 0) {
              canScoreProcessor = true;
            }
          }
          else if(field === 'canKnockAlgae') {
            if(data[field] === true || data[field] === 'true') {
              canKnockAlgaeOff = true;
            }
          }
        });
    
        return acc;
      }, {});
    
      const matchCount = teamDocs.length;
    
      const statsConfig = {
        "Average Points": {
          fields: [
            { field: 'leave', multiplier: ElementPointsAuto.LEAVE },
            { field: 'AutoAlgaeNet', multiplier: ElementPointsAuto.ALGAENET },
            { field: 'AutoAlgaeProcessor', multiplier: ElementPointsAuto.ALGAEPROCESSOR },
            { field: 'AutoCoralL1', multiplier: ElementPointsAuto.CORALL1 },
            { field: 'AutoCoralL2', multiplier: ElementPointsAuto.CORALL2 },
            { field: 'AutoCoralL3', multiplier: ElementPointsAuto.CORALL3 },
            { field: 'AutoCoralL4', multiplier: ElementPointsAuto.CORALL4 },
            { field: 'TeleAlgaeNet', multiplier: ElementPointsTele.ALGAENET },
            { field: 'TeleAlgaeProcessor', multiplier: ElementPointsTele.ALGAEPROCESSOR },
            { field: 'TeleCoralL1', multiplier: ElementPointsTele.CORALL1 },
            { field: 'TeleCoralL2', multiplier: ElementPointsTele.CORALL2 },
            { field: 'TeleCoralL3', multiplier: ElementPointsTele.CORALL3 },
            { field: 'TeleCoralL4', multiplier: ElementPointsTele.CORALL4 },
            { field: 'ClimbPosition', multiplier: 1 },
          ],
        },
        "Average Cycles": {
          fields: [
            'AutoAlgaeNet', 'AutoAlgaeProcessor', 'AutoCoralL1', 'AutoCoralL2', 'AutoCoralL3', 'AutoCoralL4',
            'TeleAlgaeNet', 'TeleAlgaeProcessor', 'TeleCoralL1', 'TeleCoralL2', 'TeleCoralL3', 'TeleCoralL4',
          ],
        },
        "Average Auto Points": {
          fields: [
            { field: 'leave', multiplier: ElementPointsAuto.LEAVE },
            { field: 'AutoAlgaeNet', multiplier: ElementPointsAuto.ALGAENET },
            { field: 'AutoAlgaeProcessor', multiplier: ElementPointsAuto.ALGAEPROCESSOR },
            { field: 'AutoCoralL1', multiplier: ElementPointsAuto.CORALL1 },
            { field: 'AutoCoralL2', multiplier: ElementPointsAuto.CORALL2 },
            { field: 'AutoCoralL3', multiplier: ElementPointsAuto.CORALL3 },
            { field: 'AutoCoralL4', multiplier: ElementPointsAuto.CORALL4 },
          ],
        },
        "Average Climb Points": {
          fields: [{ field: 'ClimbPosition', multiplier: 1 }],
        },
      };
    
      const calculatedStats = Object.keys(statsConfig).reduce((acc, statName) => {
        const { fields } = statsConfig[statName];
        if (statName === 'Average Cycles') {
          acc[statName] = Math.round(
            (fields.reduce((sum, field) => sum + (totals[field] || 0), 0) / matchCount) * 10
          ) / 10;
        } else {
        acc[statName] = Math.round(
          (fields.reduce((sum, { field, multiplier }) => sum + (totals[field] || 0) * multiplier, 0) / matchCount) * 10
        ) / 10;
        }
        return acc;
      }, {});
    
      return {
        ...calculatedStats,
      
        // General Filters
        canLeave,
        touchItOwnIt,
      
        // Climb Filters
        canClimb,
        canClimbDeep,
        canClimbShallow,
      
        // Coral Filters
        canScoreL4,
        canScoreL2L3,
        canScoreTrough,
        hasGroundIntakeCoral,
        hasStationIntake,
      
        // Algae Filters
        canScoreNet,
        canScoreProcessor,
        hasGroundIntakeAlgae,
        canKnockAlgaeOff,
      };    
    };
    
    
    useEffect(() => {
      if (restoreMatch) {
        handleRestoreRow();  // Only call when restoreMatch is updated
      }
    }, [restoreMatch]); 
    
    useEffect(() => {
      const fetchData = async () => {
        const querySnapshot = await getDocs(matchScoutDataRef);
        const groupedByTeam = querySnapshot.docs.reduce((acc, doc) => {
          const [teamNumber] = doc.id.split('_'); // Extract team number from the document ID
          if (!acc[teamNumber]) acc[teamNumber] = []; // Initialize an array if it's the first document for this team
          acc[teamNumber].push(doc); // Add the current document to the team’s array
          return acc;
        }, {});

        // Array of objects, where each object contains the teamNumber and the calculated averages for that team
        const teamAverages = Object.entries(groupedByTeam).map(([teamNumber, teamDocs]) => {
          const averages = calculateAverages(teamDocs);
          return {
            teamNumber,
            ...averages,  // ✅ Now contains canClimb and canLeave
          };
        });

        setTeamData(teamAverages);
        setOriginalTeamData(teamAverages);
      };

      fetchData();
    }, []);

    const handleSort = (column) => {
      if (sortBy === column) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortBy(column);
        setSortDirection('asc');
      }
    };

    const handleDeleteRow = (teamNumber) => {
      const updatedTeamData = teamData.filter(team => team.teamNumber !== teamNumber);
      const deletedTeam = teamData.find(team => team.teamNumber === teamNumber);
      setTeamData(updatedTeamData);
      setDeletedRows([...deletedRows, deletedTeam]);
    };

    const handleFilter = (variable, value) => {
      setFilters(prevFilters => {
        const newFilters = {
          ...prevFilters,
          [variable]: prevFilters[variable] === Boolean(value) ? false : Boolean(value) // Toggle filter
        };
    
        // Apply all active filters dynamically from `originalTeamData`
        const filteredData = originalTeamData.filter(team => 
          Object.keys(newFilters).every(key => 
            newFilters[key] === false || team[key] === newFilters[key]
          )
        );
    
        setTeamData(filteredData);
        return newFilters;
      });
    };  

    const [filters, setFilters] = useState({
        // General Filters
        canLeave: false,
        touchItOwnIt: false,
      
        // Climb Filters
        canClimb: false,
        canClimbDeep: false,
        canClimbShallow: false,
      
        // Coral Filters
        canScoreL4: false,
        canScoreL2L3: false,
        canScoreTrough: false,
        hasGroundIntakeCoral: false,
        hasStationIntake: false,
      
        // Algae Filters
        canScoreNet: false,
        canScoreProcessor: false,
        hasGroundIntakeAlgae: false,
        canKnockAlgaeOff: false,
    });
    const [originalTeamData, setOriginalTeamData] = useState([]); // Stores all data before filtering
    

    const handleRestoreRow = () => {
      const teamToRestore = deletedRows.find(team => team.teamNumber === restoreMatch);
      setTeamData([...teamData, teamToRestore]);
      setDeletedRows(deletedRows.filter(team => team.teamNumber !== restoreMatch));
      setRestoreMatch(""); // Clear restore match to hide restore button
    };

    const sortedData = [...teamData].sort((a, b) => {
      const valueA = a[sortBy];
      const valueB = b[sortBy];
      return sortDirection === 'asc' ? valueB - valueA : valueA - valueB;
    });


    return (
      <>
        <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>

  {/* General Filters */}
  <FormControl fullWidth>
    <InputLabel>General Filters</InputLabel>
    <Select
      value={Object.keys(filters).filter(key => filters[key] && ['canLeave', 'touchItOwnIt'].includes(key))}
      onChange={(e) => handleFilter(e.target.value, true)}
      renderValue={(selected) => selected.length ? selected
        .map(name => name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, str => str.toUpperCase()))
        .join(', ') 
        : 'General Filters'}
      label="General Filters"
    >
      <MenuItem value="canLeave">
        <AddCircleRounded sx={{ color: filters.canLeave ? 'primary.main' : 'inherit', mr: 1 }} />
        Can Leave
      </MenuItem>
      <MenuItem value="touchItOwnIt">
        <AddCircleRounded sx={{ color: filters.touchItOwnIt ? 'primary.main' : 'inherit', mr: 1 }} />
        Touch-It-Own-It
      </MenuItem>
    </Select>
  </FormControl>

  {/* Climb Filters */}
  <FormControl fullWidth>
    <InputLabel>Climb Filters</InputLabel>
    <Select
      value={Object.keys(filters).filter(key => filters[key] && ['canClimb', 'canClimbDeep', 'canClimbShallow'].includes(key))}
      onChange={(e) => handleFilter(e.target.value, true)}
      renderValue={(selected) => selected.length ? selected
        .map(name => name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, str => str.toUpperCase()))
        .join(', ')  
        : 'Climb Filters'}
      label="Climb Filters"
    >
      <MenuItem value="canClimb">
        <AddCircleRounded sx={{ color: filters.canClimb ? 'primary.main' : 'inherit', mr: 1 }} />
        Can Climb
      </MenuItem>
      <MenuItem value="canClimbDeep">
        <AddCircleRounded sx={{ color: filters.canClimbDeep ? 'primary.main' : 'inherit', mr: 1 }} />
        Can Climb Deep
      </MenuItem>
      <MenuItem value="canClimbShallow">
        <AddCircleRounded sx={{ color: filters.canClimbShallow ? 'primary.main' : 'inherit', mr: 1 }} />
        Can Climb Shallow
      </MenuItem>
    </Select>
  </FormControl>

  {/* Coral Filters */}
  <FormControl fullWidth variant="outlined">
    <InputLabel>Coral Filters</InputLabel>
    <Select
      value={Object.keys(filters).filter(key => filters[key] && ['canScoreL4', 'canScoreL2L3', 'canScoreTrough', 'hasGroundIntakeCoral', 'hasStationIntake'].includes(key))}
      onChange={(e) => handleFilter(e.target.value, true)}
      renderValue={(selected) => selected.length ? selected
        .map(name => name.replace(/canScoreL2L3/, 'Can Score L2/L3').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, str => str.toUpperCase()))
        .join(', ')  
        : 'Coral Filters'}
      label="Coral Filters"
    >
      <MenuItem value="canScoreL4">
        <AddCircleRounded sx={{ color: filters.canScoreL4 ? 'primary.main' : 'inherit', mr: 1 }} />
        Can Score L4
      </MenuItem>
      <MenuItem value="canScoreL2L3">
        <AddCircleRounded sx={{ color: filters.canScoreL2L3 ? 'primary.main' : 'inherit', mr: 1 }} />
        Can Score L2/L3
      </MenuItem>
      <MenuItem value="canScoreTrough">
        <AddCircleRounded sx={{ color: filters.canScoreTrough ? 'primary.main' : 'inherit', mr: 1 }} />
        Can Score Trough
      </MenuItem>
      <MenuItem value="hasGroundIntakeCoral">
        <AddCircleRounded sx={{ color: filters.hasGroundIntakeCoral ? 'primary.main' : 'inherit', mr: 1 }} />
        Has Ground Intake Coral
      </MenuItem>
      <MenuItem value="hasStationIntake">
        <AddCircleRounded sx={{ color: filters.hasStationIntake ? 'primary.main' : 'inherit', mr: 1 }} />
        Has Station Intake Coral
      </MenuItem>
    </Select>
  </FormControl>

  {/* Algae Filters */}
  <FormControl fullWidth>
    <InputLabel>Algae Filters</InputLabel>
    <Select
      value={Object.keys(filters).filter(key => filters[key] && ['canScoreNet', 'canScoreProcessor', 'hasGroundIntakeAlgae', 'canKnockAlgaeOff'].includes(key))}
      onChange={(e) => handleFilter(e.target.value, true)}
      renderValue={(selected) => selected.length ? selected
        .map(name => name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, str => str.toUpperCase()))
        .join(', ')  
        : 'Algae Filters'}
      label="Algae Filters"
    >
      <MenuItem value="canScoreNet">
        <AddCircleRounded sx={{ color: filters.canScoreNet ? 'primary.main' : 'inherit', mr: 1 }} />
        Can Score Net
      </MenuItem>
      <MenuItem value="canScoreProcessor">
        <AddCircleRounded sx={{ color: filters.canScoreProcessor ? 'primary.main' : 'inherit', mr: 1 }} />
        Can Score Processor
      </MenuItem>
      <MenuItem value="hasGroundIntakeAlgae">
        <AddCircleRounded sx={{ color: filters.hasGroundIntakeAlgae ? 'primary.main' : 'inherit', mr: 1 }} />
        Has Ground Intake Algae
      </MenuItem>
      <MenuItem value="canKnockAlgaeOff">
        <AddCircleRounded sx={{ color: filters.canKnockAlgaeOff ? 'primary.main' : 'inherit', mr: 1 }} />
        Can Knock Algae Off
      </MenuItem>
    </Select>
  </FormControl>

  </Box>
        <Table sx={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#f57c00', mt: 4 }}>
          <TableHead sx={{ backgroundColor: '#222', color: 'white' }}>
            <TableRow>
              <TableCell sx={{ color: '#f57c00', fontWeight: 'bold' }}></TableCell>
              <TableCell sx={{ color: '#f57c00', fontWeight: 'bold' }}>Team Number</TableCell>
              {['Average Points', 'Average Cycles', 'Average Auto Points', 'Average Climb Points'].map((column) => (
                <TableCell key={column} sx={{ color: 'white' }}>
                  <TableSortLabel
                    active={sortBy === column}
                    direction={sortDirection}
                    onClick={() => handleSort(column)}
                    sx={{
                      color: 'white',
                      '&.MuiTableSortLabel-active': {
                        color: '#f57c00',
                      },
                      '&:hover': {
                        color: '#f57c00',
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
              // team.teamNumber !== '972' && (
              <TableRow
                key={team.teamNumber}
                sx={{
                  backgroundColor: index % 2 === 0 ? '#333' : '#444',
                  '&:hover': {
                    backgroundColor: '#555',
                  },
                }}
              >
                <TableCell>
                  <IconButton
                    onClick={() => handleDeleteRow(team.teamNumber)}
                    sx={{ color: 'primary' }}
                  >
                    <RemoveCircleIcon />
                  </IconButton>
              
                </TableCell>
                <TableCell sx={{ color: '#f57c00' }}>{team.teamNumber}</TableCell>
                <TableCell sx={{ color: 'white' }}>{team['Average Points']}</TableCell>
                <TableCell sx={{ color: 'white' }}>{team['Average Cycles']}</TableCell>
                <TableCell sx={{ color: 'white' }}>{team['Average Auto Points']}</TableCell>
                <TableCell sx={{ color: 'white' }}>{team['Average Climb Points']}</TableCell>
              </TableRow>
              // )
            ))}
          </TableBody>
        </Table>
        {deletedRows.length > 0 && (
          <Box sx={{ mt: 4 }}>
          <FormControl fullWidth>
            <InputLabel>Restore Match</InputLabel>
            <Select
              value={restoreMatch}
              onChange={(e) => setRestoreMatch(e.target.value)}  // Update state on change
              label="Restore Match"
            >
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
