import { useState, useRef } from "react";
import { MatchStage } from "../../MatchConstants";
import { Stack, Button, Typography } from "@mui/material";
import Timer from "./form_elements/map/Timer";

export default function MSTeleop({ data, handleStageChange }) {
    const [counter, setCounter] = useState(0);
    
    // Fuel system state
    const [trackingBursts, setTrackingBursts] = useState(false);
    const [deleteFuelData, setDeleteFuelData] = useState(null);
    
    // Climb state - cycles through No Climb, L1, L2, L3
    const climbLevels = ["No Climb", "L1", "L2", "L3"];
    const [climbIndex, setClimbIndex] = useState(0);
    
    // Timer state for toggle mode
    const [timerMode, setTimerMode] = useState("toggle");
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const timerRef = useRef(null);
    const startTimeRef = useRef(0);
    const [hasStarted, setHasStarted] = useState(false);
    const accumulatedTimeRef = useRef(0);
    const [deleteTimeData, setDeleteTimeData] = useState(null);

    const update = () => {
        setCounter(counter + 1);
    };

    // Climb button handler - cycles through No Climb, L1, L2, L3
    const handleClimbClick = () => {
        const newIndex = (climbIndex + 1) % climbLevels.length;
        setClimbIndex(newIndex);
        data.setClimb(MatchStage.TELEOP, newIndex);
        update();
    };

    // Fuel system handlers
    const handleBursts = () => {
        if (!trackingBursts) {
            data.addFuel(MatchStage.TELEOP, 0); 
        }
        setTrackingBursts(!trackingBursts);
    }

    const handleFuelClick = value => {
        const fuelScored = data.getFuel(MatchStage.TELEOP); 
        value += fuelScored[fuelScored.length - 1]; 
        if (value <= 500 && value >= 0) {
            data.setFuel(MatchStage.TELEOP, value); 
            update();
        }
    }

    const handleFuelDelete = () => {
        if (deleteFuelData !== null) {
            if (data.getFuel(MatchStage.TELEOP).length - 1 === deleteFuelData) {
                setTrackingBursts(!trackingBursts); 
            }
            data.deleteFuel(MatchStage.TELEOP, deleteFuelData);
            setDeleteFuelData(null);
            update();
        }
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
            data.addShootingTimes(MatchStage.TELEOP, finalTime / 1000);
            setHasStarted(false);
            setIsRunning(false);
            setElapsedTime(0);
            update();
        }
    };

    const handleHoldTimeSubmit = (time) => {
        if (time > 0) {
            data.addShootingTimes(MatchStage.TELEOP, time / 1000);
            update();
        }
    };

    const handleTimeDelete = () => {
        if (deleteTimeData !== null) {
            data.deleteShootingTimes(MatchStage.TELEOP, deleteTimeData);
            setDeleteTimeData(null);
            update();
        }
    };

    return (
        <Stack direction={"column"} spacing={2}>
            {/* Fuel System UI */}
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
                Fuel Scored: {data.getFuel(MatchStage.TELEOP)[data.getFuel(MatchStage.TELEOP).length - 1]}
            </Typography>
            
            {/* Climb Button - cycles through No Climb, L1, L2, L3 */}
            <Button 
                variant="contained" 
                onClick={handleClimbClick}
                color={climbIndex > 0 ? "success" : "primary"}
                fullWidth
            >
                Climb: {climbLevels[climbIndex]}
            </Button>
            
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
        </Stack>
    );
}
