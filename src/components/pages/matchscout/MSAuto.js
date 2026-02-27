import { useState, useRef, useEffect } from "react";
import { Button, Stack, FormControl, InputLabel, Select, MenuItem, Typography, Collapse, Alert, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { MatchStage } from "../../MatchConstants";
import LeaveButton from "./form_elements/LeaveButton";
import Timer from "./form_elements/map/Timer";

export default function MSAuto({ data, handleStageChange }) {
    const [counter, setCounter] = useState(0);
    const [deleteData, setDeleteData] = useState(null);
    const [isFocused, setIsFocused] = useState(false);
    const [alert, setAlert] = useState({ open: false, severity: "info", message: "Remember to switch to Tele Page" });
    const [timer, setTimer] = useState(false); 
    
    // Fuel system state
    const [trackingBursts, setTrackingBursts] = useState(false);
    
    // Timer state for toggle mode
    const [timerMode, setTimerMode] = useState("toggle");
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const timerRef = useRef(null);
    const startTimeRef = useRef(0);
    const [hasStarted, setHasStarted] = useState(false);
    const accumulatedTimeRef = useRef(0);
    const [deleteTimeData, setDeleteTimeData] = useState(null);

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

    // Fuel system handlers
    const handleBursts = () => {
        if (!trackingBursts) {
            data.addFuel(MatchStage.AUTO, 0); 
        }
        setTrackingBursts(!trackingBursts);
    }

    const handleFuelClick = value => {
        const fuelScored = data.getFuel(MatchStage.AUTO); 
        value += fuelScored[fuelScored.length - 1]; 
        if (value <= 500 && value >= 0) {
            data.setFuel(MatchStage.AUTO, value); 
            update();
        }
    }

    const handleDelete = () => {
        if (deleteData !== null) {
            if (data.getFuel(MatchStage.AUTO).length - 1 == deleteData) {
                setTrackingBursts(!trackingBursts); 
            }
            data.deleteFuel(MatchStage.AUTO, deleteData);
            setDeleteData(null);
            update();
        }
    };

    const getDisplayValue = () => {
        if (deleteData !== null) {
            const selectedOuttake = data.getFuel(MatchStage.AUTO)[deleteData];
            return `${selectedOuttake} FUEL SCORED`;
        }
        return "";  
    };

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

    const pauseStopwatch = () => {
        if (isRunning) {
            accumulatedTimeRef.current = elapsedTime;
            clearInterval(timerRef.current);
        } else {
            const start = Date.now();
            startTimeRef.current = start;
            timerRef.current = setInterval(() => {
                setElapsedTime(accumulatedTimeRef.current + (Date.now() - startTimeRef.current));
            }, 10);
        }
        setIsRunning(!isRunning);
    };

    const formatTime = (time) => {
        const milliseconds = Math.floor((time % 1000) / 10);
        const seconds = Math.floor((time / 1000) % 60);
        return `${String(seconds).padStart(2, "0")}:${String(milliseconds).padStart(2, "0")}`;
    };

    const handleTimerButtonClick = () => {
        if (!hasStarted) {
            startStopwatch();
        } else if (hasStarted && !isRunning) {
            pauseStopwatch();
        } else {
            pauseStopwatch();
        }
    };

    const cancelTime = () => {
        clearInterval(timerRef.current);
        setHasStarted(false);
        setIsRunning(false);
        setElapsedTime(0);
        accumulatedTimeRef.current = 0;
    };

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

    const handleHoldTimeSubmit = (time) => {
        if (time > 0) {
            data.addShootingTimes(MatchStage.AUTO, time / 1000);
            update();
        }
    };

    const getTimeDisplayValue = () => {
        if (deleteTimeData !== null) {
            const selectedTime = data.getShootingTimes(MatchStage.AUTO)[deleteTimeData];
            return `${selectedTime.toFixed(2)}s`;
        }
        return "";
    };

    const handleTimeDelete = () => {
        if (deleteTimeData !== null) {
            data.deleteShootingTimes(MatchStage.AUTO, deleteTimeData);
            setDeleteTimeData(null);
            update();
        }
    };

    return (
        <Stack direction={"column"} spacing={2}>
                <LeaveButton
                label={"Leave?"}
                value={data.get(MatchStage.AUTO, "leave")}
                onClick={(newValue) => {
                    data.set(MatchStage.AUTO, "leave", newValue);
                    update();
                }}
                showCheckbox={false}
            />
            
            {/* Fuel System UI */}
            {data.getFuel(MatchStage.AUTO).length > 0 && ( 
            <FormControl fullWidth>
            <InputLabel shrink={isFocused || deleteData !== null}>Previous Outtakes</InputLabel>
            <Select
                value={deleteData}
                onChange={(e) => setDeleteData(e.target.value)}
                displayEmpty
                renderValue={getDisplayValue}
                label={ isFocused || deleteData !== null ? "Previous Outtakes" : ""}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
            >
                {data.getFuel(MatchStage.AUTO).map((data, idx) => (
                    <MenuItem key={idx} value={idx}>
                        {idx + 1 + ". " + data + " FUEL SCORED"} 
                    </MenuItem>
                ))}
            </Select>
            </FormControl>
            )}
            {deleteData != null && (
                <Button 
                    variant="outlined" 
                    color="error" 
                    sx={{ mt: 2 }} 
                    onClick={handleDelete} 
                    fullWidth>
                    Delete Outtake
              </Button>
            )}
            <Button variant="outlined" onClick={handleBursts}>
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
                            <>
                                <Button 
                                    variant="outlined" 
                                    color="error"
                                    onClick={submitTime}                 
                                    fullWidth
                                >
                                    Submit
                                </Button>
                                <Button 
                                    variant="outlined" 
                                    color="secondary"
                                    onClick={cancelTime}                 
                                    fullWidth
                                >
                                    Cancel
                                </Button>
                            </>
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
            {data.getShootingTimes(MatchStage.AUTO).length > 0 && (
                <FormControl fullWidth>
                    <InputLabel shrink={isFocused || deleteTimeData !== null}>Previous Times</InputLabel>
                    <Select
                        value={deleteTimeData}
                        onChange={(e) => setDeleteTimeData(e.target.value)}
                        displayEmpty
                        renderValue={getTimeDisplayValue}
                        label={isFocused || deleteTimeData !== null ? "Previous Times" : ""}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                    >
                        {data.getShootingTimes(MatchStage.AUTO).map((time, idx) => (
                            <MenuItem key={idx} value={idx}>
                                {idx + 1 + ". " + time.toFixed(2) + "s"}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            )}
            {deleteTimeData != null && (
                <Button 
                    variant="outlined" 
                    color="error" 
                    sx={{ mt: 2 }} 
                    onClick={handleTimeDelete} 
                    fullWidth>
                    Delete Time
                </Button>
            )}
            
            {/* Next/Previous Buttons */}
            <Stack direction="row" spacing={2}>
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
