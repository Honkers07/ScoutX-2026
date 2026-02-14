import { useEffect, useRef, useState } from "react";
import { Slider, Button, MenuItem, Select, Stack, InputLabel, Box, FormControl, Collapse, Alert, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { MatchStage, IntakeElement, IntakeLocations } from "../../MatchConstants";
import LeaveButton from "./form_elements/LeaveButton";
import MapSim from "./form_elements/map/MapSim";
import Timer from "./form_elements/map/Timer";
import { TempleHinduRounded } from "@mui/icons-material";

export default function MSAuto({ data, handleStageChange }) {
    const [counter, setCounter] = useState(0);
    const [deleteData, setDeleteData] = useState(null);
    const [selectedRow, setSelectedRow] = useState(0);
    const [selectedIntakeElement, setSelectedIntakeElement] = useState(IntakeElement.CORAL);
    const [selectedIntakeLocation, setSelectedIntakeLocation] = useState(IntakeLocations.PRELOAD);
    const [isFocused, setIsFocused] = useState(false);
    const [alert, setAlert] = useState({ open: false, severity: "info", message: "Remember to switch to Tele Page" });
    const [timer, setTimer] = useState(false); 
    
    const[time, setTime] = useState(0); 
    const[trackingBursts, setTrackingBursts] = useState(false); 
    
    const [timerMode, setTimerMode] = useState("toggle"); // "toggle" or "hold"

    // Timer state for toggle mode
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const timerRef = useRef(null);
    const startTimeRef = useRef(0);
    const [hasStarted, setHasStarted] = useState(false);
    const accumulatedTimeRef = useRef(0); // Track accumulated time when paused

    useEffect(() => {
        const alertTimer = setTimeout(() => {
            setAlert({ open: true, severity: "info", message: "Remember to switch to Tele Page" });
            setTimeout(() => {
                setAlert((prev) => ({ ...prev, open: false }));
                setTimer(!timer);
            }, 10000);
        }, 15000);

        return () => clearTimeout(alertTimer);
    }, [timer]);

    const update = () => {
        setCounter(counter + 1);
    };

    const handleBursts = () => {
        if (!trackingBursts) {
            data.addFuel(MatchStage.AUTO, 0); 
        }
        setTrackingBursts(!trackingBursts);
    }

    // Toggle mode timer functions
    const startStopwatch = () => {
        setHasStarted(true);
        if (!hasStarted) {
            setElapsedTime(0);
        }
        clearInterval(timerRef.current);
        setIsRunning(true);
        const start = Date.now();
        startTimeRef.current = start;
        timerRef.current = setInterval(() => {
            setElapsedTime(Date.now() - startTimeRef.current);
        }, 10);
    };

    const stopStopwatch = () => {
        setHasStarted(false);
        setIsRunning(false);
        clearInterval(timerRef.current);
    };

    const pauseStopwatch = () => {
        if (isRunning) {
            // Pausing - save the accumulated time
            accumulatedTimeRef.current = elapsedTime;
            clearInterval(timerRef.current);
        } else {
            // Resuming - continue from accumulated time
            const start = Date.now();
            startTimeRef.current = start;
            timerRef.current = setInterval(() => {
                setElapsedTime(accumulatedTimeRef.current + (Date.now() - startTimeRef.current));
            }, 10);
        }
        setIsRunning(!isRunning);
    };

    // Format time for toggle mode
    const formatTime = (time) => {
        const milliseconds = Math.floor((time % 1000) / 10);
        const seconds = Math.floor((time / 1000) % 60);
        return `${String(seconds).padStart(2, "0")}:${String(milliseconds).padStart(2, "0")}`;
    };

    // Handle button click based on timer state
    const handleTimerButtonClick = () => {
        if (!hasStarted) {
            // Timer hasn't started - start it
            startStopwatch();
        } else if (hasStarted && !isRunning) {
            // Timer is paused - resume it
            pauseStopwatch();
        } else {
            // Timer is running - pause it (don't submit yet)
            pauseStopwatch();
        }
    };

    // Submit the time explicitly
    const submitTime = () => {
        if (hasStarted) {
            clearInterval(timerRef.current);
            const finalTime = elapsedTime;
            data.addShootingTimes(MatchStage.AUTO, finalTime / 1000);
            setHasStarted(false);
            setIsRunning(false);
            setElapsedTime(0);
            update();
        }
    };

    // Handle time from hold timer
    const handleHoldTimeSubmit = (time) => {
        if (time > 0) {
            data.addShootingTimes(MatchStage.AUTO, time / 1000);
            update();
        }
    };

    const handleDelete = () => {
        if (deleteData !== null) {
            data.delete(MatchStage.AUTO, deleteData);
            setDeleteData(null);
            update();
        }
    };

    const handleFuelClick = value => {
        const fuelScored = data.getFuel(MatchStage.AUTO); 
        value += fuelScored[fuelScored.length - 1]; 
        if (value <= 500 && value >= 0) {
            data.setFuel(MatchStage.AUTO, value); 
            update();
        }
    }

    const getDisplayValue = () => {
        if (deleteData !== null) {
            const selectedOuttake = data.getFuel(MatchStage.AUTO)[deleteData];
            return `${selectedOuttake} FUEL SCORED`;
        }
        return "";  
    };

    return (

        <Stack direction={"column"} spacing={2}>
            <Button variant="outlined" onClick={(() => handleBursts())}>
                {trackingBursts ? 'End Burst' : 'Start Burst'}
            </Button>
            
            {trackingBursts && (
            <>
            <Stack direction={"row"} spacing={2}>
                <Button variant="outlined" onClick={() => handleFuelClick(1)} fullWidth> 
                    Add 1 Fuel 
                </Button>
                <Button variant="outlined" onClick={() => handleFuelClick(5)} fullWidth> 
                    Add 5 Fuel 
                </Button>
                <Button variant="outlined" onClick={() => handleFuelClick(10)} fullWidth> 
                    Add 10 Fuel 
                </Button>
            </Stack>
            <Stack direction={"row"} spacing={2}>
                <Button variant="outlined" color="error" onClick={() => handleFuelClick(-1)} fullWidth> 
                    Remove 1 Fuel 
                </Button>
                <Button variant="outlined" color="error" onClick={() => handleFuelClick(-5)} fullWidth> 
                    Remove 5 Fuel 
                </Button>
                <Button variant="outlined" color="error" onClick={() => handleFuelClick(-10)} fullWidth> 
                    Remove 10 Fuel 
                </Button>
            </Stack>
            </>)}
            <Typography>
                Fuel Scored: {data.getFuel(MatchStage.AUTO)[data.getFuel(MatchStage.AUTO).length - 1]}
            </Typography>
            
            {/* Timer Mode Toggle */}
            <Stack direction="row" spacing={1} justifyContent="center">
                <Button 
                    variant={timerMode === "toggle" ? "contained" : "outlined"}
                    size="small"
                    onClick={() => setTimerMode("toggle")}
                >
                    Toggle Mode
                </Button>
                <Button 
                    variant={timerMode === "hold" ? "contained" : "outlined"}
                    size="small"
                    onClick={() => setTimerMode("hold")}
                >
                    Hold Mode
                </Button>
            </Stack>

            {/* Toggle Mode Timer UI */}
            {timerMode === "toggle" && (
                <>
                    <Typography variant="h5" fontFamily="monospace" fontWeight="bold">
                        {formatTime(elapsedTime)}
                    </Typography>
                    <Stack direction={"row"} spacing={2}>
                        <Button 
                            variant="outlined" 
                            color={hasStarted ? (isRunning ? "warning" : "primary") : "success"}
                            onClick={handleTimerButtonClick} 
                            fullWidth
                        >
                            {hasStarted ? (isRunning ? 'Pause' : 'Resume') : "Start"}
                        </Button>
                        {hasStarted && (
                            <Button 
                                variant="outlined" 
                                color="error"
                                onClick={submitTime}                 
                                fullWidth
                            >
                                Submit
                            </Button>
                        )}
                    </Stack>
                </>
            )}

            {/* Hold Mode Timer UI */}
            {timerMode === "hold" && (
                <Timer 
                    showToggle={false}
                    defaultMode="hold"
                    onTimeSubmit={handleHoldTimeSubmit}
                />
            )}

            {/* Shooting Times Display */}
            <Typography variant="h6">Shooting Times:</Typography>
            {data.getShootingTimes(MatchStage.AUTO).length === 0 ? (
                <Typography color="textSecondary">No times recorded yet</Typography>
            ) : (
                data.getShootingTimes(MatchStage.AUTO).map((time, index) => (
                    <Typography key={index}>
                        #{index + 1}: {time.toFixed(2)}s
                    </Typography>
                ))
            )}
            
          <Stack  direction="row" spacing={2}>
            <Button
                   variant="outlined"
                   color="primary"
                   fullWidth
                   onClick={() => {
                       handleStageChange(data.stage - 1);
                       update();
                   }}
               >
                   Previous
               </Button>
               <Button
                   variant="outlined"
                   color="primary"
                   fullWidth
                   onClick={() => {
                       handleStageChange(data.stage + 1);
                       update();
                   }}
               >
                   Next
               </Button>
               </Stack>
               <Stack position="relative">
                <Collapse in={alert.open} sx={{ position: "absolute", top: 30, left: 0, right: 0, zIndex: 10 }}>
                    <Alert
                        action={
                            <IconButton
                                aria-label="close"
                                color="inherit"
                                size="small"
                                onClick={() => setAlert({ ...alert, open: false })}
                            >
                                <CloseIcon fontSize="inherit" />
                            </IconButton>
                        }
                        severity={alert.severity}
                    >
                        {alert.message}
                    </Alert>
                </Collapse>
            </Stack>
            </Stack>
    );
}
