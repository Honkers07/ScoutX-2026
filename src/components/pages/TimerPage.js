import { useState, useRef, useMemo, useEffect } from "react";
import { Alert, Button, Collapse, Divider, IconButton, Stack, Typography, Box, Container, Unstable_Grid2 as Grid2, TextField, Switch, FormControlLabel } from "@mui/material";
import { MatchStage } from "../MatchConstants";
import MatchScoutData from "../MatchScoutData";
import Timer from "./matchscout/form_elements/map/Timer";
import CloseIcon from "@mui/icons-material/Close";
import Gambling from "./Gambling";
import bgImage from "../../assets/backGround.png";
import firebase from "../../firebase";
import { doc, setDoc } from "firebase/firestore";

const MATCH_DURATION = 150; // 2 minutes 30 seconds in seconds

// Custom Prematch component for Timer Page
function TimerPrematch({ data }) {
    const [counter, setCounter] = useState(0);
    const update = () => setCounter(counter + 1);

    const inputStyle = {
        '& .MuiOutlinedInput-root': {
            color: 'white',
            fontFamily: '"Noto Sans", sans-serif',
            '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.6)' },
            '&.Mui-focused fieldset': { borderColor: '#FF9800' },
        },
        '& .MuiInputLabel-root': { 
            color: 'rgba(255,255,255,0.7)',
            fontFamily: '"Noto Sans", sans-serif' 
        },
        '& .MuiInputLabel-root.Mui-focused': { color: '#FF9800' },
        width: '100%',
    };

    return (
        <Grid2 container spacing={2}>
            <Grid2 xs={12}>
                <Typography variant="h6" sx={{ color: "white", mb: 2 }}>Match Information</Typography>
            </Grid2>
            <Grid2 xs={12} sm={6}>
                <TextField
                    label="Verification Code"
                    variant="outlined"
                    value={data.get(MatchStage.PRE_MATCH, "verificationCode")}
                    onChange={(e) => { 
                        data.set(MatchStage.PRE_MATCH, "verificationCode", e.target.value);
                        update();
                    }}
                    fullWidth
                    sx={inputStyle}
                />
            </Grid2>
            <Grid2 xs={12} sm={6}>
                <TextField
                    label="Scouter Name"
                    variant="outlined"
                    value={data.get(MatchStage.PRE_MATCH, "name")}
                    onChange={(e) => { 
                        data.set(MatchStage.PRE_MATCH, "name", e.target.value);
                        update();
                    }}
                    fullWidth
                    sx={inputStyle}
                />
            </Grid2>
            <Grid2 xs={12} sm={6}>
                <TextField
                    label="Team Number"
                    type="number"
                    variant="outlined"
                    value={data.get(MatchStage.PRE_MATCH, "team")}
                    onChange={(e) => { 
                        data.set(MatchStage.PRE_MATCH, "team", e.target.value);
                        update();
                    }}
                    fullWidth
                    sx={inputStyle}
                />
            </Grid2>
            <Grid2 xs={12} sm={6}>
                <TextField
                    label="Match Number"
                    type="number"
                    variant="outlined"
                    value={data.get(MatchStage.PRE_MATCH, "match")}
                    onChange={(e) => { 
                        data.set(MatchStage.PRE_MATCH, "match", e.target.value);
                        update();
                    }}
                    fullWidth
                    sx={inputStyle}
                />
            </Grid2>
            <Grid2 xs={12} sm={6}>
                <TextField
                    select
                    label="Alliance"
                    value={data.get(MatchStage.PRE_MATCH, "alliance")}
                    onChange={(e) => {
                        data.set(MatchStage.PRE_MATCH, "alliance", e.target.value);
                        update();
                    }}
                    fullWidth
                    sx={inputStyle}
                    SelectProps={{ native: true }}
                >
                    <option value="" style={{color: 'white', backgroundColor: '#333'}}>Select Alliance</option>
                    <option value="Blue" style={{color: 'white', backgroundColor: '#333'}}>Blue</option>
                    <option value="Red" style={{color: 'white', backgroundColor: '#333'}}>Red</option>
                </TextField>
            </Grid2>
            <Grid2 xs={12} sm={6}>
                <TextField
                    select
                    label="Start Position"
                    value={data.get(MatchStage.PRE_MATCH, "start_position")}
                    onChange={(e) => {
                        data.set(MatchStage.PRE_MATCH, "start_position", e.target.value);
                        update();
                    }}
                    fullWidth
                    sx={inputStyle}
                    SelectProps={{ native: true }}
                >
                    <option value="" style={{color: 'white', backgroundColor: '#333'}}>Start Position</option>
                    <option value="Near Processor Side" style={{color: 'white', backgroundColor: '#333'}}>Near Processor Side</option>
                    <option value="Middle" style={{color: 'white', backgroundColor: '#333'}}>Middle</option>
                    <option value="Far Processor Side" style={{color: 'white', backgroundColor: '#333'}}>Far Processor Side</option>
                </TextField>
            </Grid2>
        </Grid2>
    );
}

// Custom Postmatch component for Timer Page
function TimerPostmatch({ data }) {
    const [counter, setCounter] = useState(0);
    const update = () => setCounter(counter + 1);

    const inputStyle = {
        '& .MuiOutlinedInput-root': {
            color: 'white',
            fontFamily: '"Noto Sans", sans-serif',
            '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.6)' },
            '&.Mui-focused fieldset': { borderColor: '#FF9800' },
        },
        '& .MuiInputLabel-root': { 
            color: 'rgba(255,255,255,0.7)',
            fontFamily: '"Noto Sans", sans-serif' 
        },
        '& .MuiInputLabel-root.Mui-focused': { color: '#FF9800' },
        width: '100%',
    };

    return (
        <Stack spacing={3}>
            <Typography variant="h6" sx={{ color: "white" }}>Match Notes</Typography>
            <TextField
                label="Extra Comments"
                variant="outlined"
                multiline
                rows={3}
                value={data.get(MatchStage.POST_MATCH, "comments")}
                onChange={(e) => { 
                    data.set(MatchStage.POST_MATCH, "comments", e.target.value);
                    update();
                }}
                fullWidth
                sx={inputStyle}
                placeholder="Anything else you would like to add?"
            />
            
            <Typography variant="h6" sx={{ color: "white" }}>Quick Feedback</Typography>
            <Grid2 container spacing={1.5}>
                {[
                    { label: "Was Disabled", key: "disabled" },
                    { label: "Browns Out / Jittery", key: "brownsOut" },
                    { label: "Tips Over / Wobbly", key: "wobbly" },
                    { label: "Intake Broken", key: "intakeBroken" },
                    { label: "Outtake Broken", key: "outtakeBroken" },
                    { label: "Failed Climb", key: "failedClimb" },
                    { label: "Trench", key: "trench" },
                    { label: "Defense/Stealing", key: "defense" },
                    { label: "Shuttle", key: "shuttle" },
                ].map((item) => (
                    <Grid2 xs={6} sm={4} key={item.key}>
                        <Button
                            variant={data.getPostData(item.key) ? "contained" : "outlined"}
                            color={data.getPostData(item.key) ? "warning" : "inherit"}
                            onClick={() => {
                                data.setPostData(item.key, !data.getPostData(item.key));
                                update();
                            }}
                            fullWidth
                            sx={{
                                color: data.getPostData(item.key) ? "white" : "white",
                                borderColor: "rgba(255,255,255,0.3)",
                                bgcolor: data.getPostData(item.key) ? "rgba(255,152,0,0.8)" : "transparent",
                                textTransform: 'none',
                                fontSize: '0.85rem',
                                py: 1.5,
                                '&:hover': {
                                    borderColor: '#FF9800',
                                    bgcolor: data.getPostData(item.key) ? "rgba(255,152,0,0.9)" : "rgba(255,255,255,0.1)"
                                }
                            }}
                        >
                            {item.label}
                        </Button>
                    </Grid2>
                ))}
            </Grid2>
        </Stack>
    );
}

// Main Timer Content - with match timing
function TimerContent({ submittedTimes, setSubmittedTimes, setMatchEnded }) {
    const [matchStarted, setMatchStarted] = useState(false);
    const [matchTime, setMatchTime] = useState(0); // in seconds
    const [isRunning, setIsRunning] = useState(false);
    const timerRef = useRef(null);
    const startTimeRef = useRef(0);
    const [currentShootStart, setCurrentShootStart] = useState(null);
    const [useTimerComponent, setUseTimerComponent] = useState(false); // Toggle between traditional buttons and hold mode
    const [isHolding, setIsHolding] = useState(false); // Track if user is holding the button
    const holdStartTimeRef = useRef(0); // Track when hold started

    // Format time as MM:SS
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    };

    // Format for display in list
    const formatTimeRange = (start, end) => {
        return `${formatTime(start)} - ${formatTime(end)} (${(end - start).toFixed(1)}s)`;
    };

    // Start the match
    const startMatch = () => {
        setMatchStarted(true);
        setMatchTime(0);
        setIsRunning(true);
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
            const elapsed = (Date.now() - startTimeRef.current) / 1000;
            setMatchTime(elapsed);
            
            // Auto-end match after 2:30
            if (elapsed >= MATCH_DURATION) {
                endMatch();
            }
        }, 100);
    };

    // End the match manually
    const endMatch = () => {
        clearInterval(timerRef.current);
        setIsRunning(false);
        
        // If currently shooting, end that shoot
        if (currentShootStart !== null) {
            const endTime = matchTime >= MATCH_DURATION ? MATCH_DURATION : matchTime;
            const newEntry = {
                startShootTime: currentShootStart,
                endShootTime: endTime,
                duration: endTime - currentShootStart
            };
            setSubmittedTimes([...submittedTimes, newEntry]);
            setCurrentShootStart(null);
        }
        
        setMatchStarted(false);
        setMatchEnded(true);
    };

    // Start shooting (record start time)
    const startShooting = () => {
        if (matchStarted && !currentShootStart && matchTime < MATCH_DURATION) {
            setCurrentShootStart(matchTime);
        }
    };

    // Stop shooting (record end time)
    const stopShooting = () => {
        if (currentShootStart !== null && matchStarted) {
            const endTime = matchTime >= MATCH_DURATION ? MATCH_DURATION : matchTime;
            const newEntry = {
                startShootTime: currentShootStart,
                endShootTime: endTime,
                duration: endTime - currentShootStart
            };
            setSubmittedTimes([...submittedTimes, newEntry]);
            setCurrentShootStart(null);
        }
    };

    // Delete a time entry
    const deleteTime = (index) => {
        const newTimes = [...submittedTimes];
        newTimes.splice(index, 1);
        setSubmittedTimes(newTimes);
    };

    // Handle time submission from Timer component (hold/toggle mode)
    const handleTimerSubmit = (time) => {
        if (matchStarted && matchTime > 0 && matchTime < MATCH_DURATION) {
            // Add a time entry based on the current match time
            const endTime = matchTime;
            const startTime = Math.max(0, endTime - (time / 1000)); // Calculate start time from duration
            const newEntry = {
                startShootTime: startTime,
                endShootTime: endTime,
                duration: endTime - startTime
            };
            setSubmittedTimes([...submittedTimes, newEntry]);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => clearInterval(timerRef.current);
    }, []);

    // Progress percentage
    const progressPercent = Math.min((matchTime / MATCH_DURATION) * 100, 100);

    return (
        <Stack spacing={3}>
            {/* Match Timer Display */}
            <Box sx={{ 
                bgcolor: 'rgba(0,0,0,0.6)', 
                borderRadius: 3, 
                p: 4,
                border: '2px solid',
                borderColor: matchStarted ? (matchTime >= MATCH_DURATION ? '#4CAF50' : '#FF9800') : 'rgba(255,255,255,0.2)'
            }}>
                <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', mb: 1 }}>
                    Match Time
                </Typography>
                <Typography variant="h1" sx={{ 
                    fontFamily: '"Noto Sans", sans-serif', 
                    fontWeight: 400, 
                    color: matchStarted ? '#FF9800' : 'white',
                    textAlign: 'center',
                    fontSize: { xs: '3rem', sm: '4rem' }
                }}>
                    {formatTime(matchTime)} / {formatTime(MATCH_DURATION)}
                </Typography>
                
                {/* Progress bar */}
                <Box sx={{ 
                    width: '100%', 
                    height: 10, 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    borderRadius: 5,
                    mt: 2,
                    overflow: 'hidden'
                }}>
                    <Box sx={{ 
                        width: `${progressPercent}%`, 
                        height: '100%', 
                        bgcolor: matchTime >= MATCH_DURATION ? '#4CAF50' : '#FF9800',
                        transition: 'width 0.1s linear'
                    }} />
                </Box>
                
                {/* Hold Mode Toggle */}
                {matchStarted && (
                    <FormControlLabel
                        control={
                            <Switch
                                checked={useTimerComponent}
                                onChange={(e) => {
                                    setUseTimerComponent(e.target.checked);
                                    // Reset any ongoing shooting when toggling
                                    if (currentShootStart !== null) {
                                        setCurrentShootStart(null);
                                        setIsHolding(false);
                                    }
                                }}
                                color="warning"
                            />
                        }
                        label={
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                Hold Mode
                            </Typography>
                        }
                        sx={{ justifyContent: 'center', mt: 1 }}
                    />
                )}
                
                {/* Start/End Match Buttons */}
                <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
                    {!matchStarted ? (
                        <Button
                            variant="contained"
                            color="success"
                            onClick={startMatch}
                            sx={{ 
                                minWidth: 150,
                                py: 1.5,
                                fontSize: '1.1rem',
                                boxShadow: 3,
                                '&:hover': { boxShadow: 5 }
                            }}
                        >
                            ▶ Start Match
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="contained"
                                color={currentShootStart !== null ? "error" : "success"}
                                onClick={currentShootStart !== null ? stopShooting : startShooting}
                                disabled={matchTime >= MATCH_DURATION}
                                onMouseDown={useTimerComponent ? () => {
                                    if (!currentShootStart && matchStarted && matchTime < MATCH_DURATION) {
                                        setIsHolding(true);
                                        holdStartTimeRef.current = matchTime;
                                        setCurrentShootStart(matchTime);
                                    }
                                } : undefined}
                                onMouseUp={useTimerComponent ? () => {
                                    if (isHolding && currentShootStart !== null) {
                                        const endTime = matchTime;
                                        const newEntry = {
                                            startShootTime: currentShootStart,
                                            endShootTime: endTime,
                                            duration: endTime - currentShootStart
                                        };
                                        setSubmittedTimes([...submittedTimes, newEntry]);
                                        setCurrentShootStart(null);
                                        setIsHolding(false);
                                    }
                                } : undefined}
                                onMouseLeave={useTimerComponent ? () => {
                                    if (isHolding && currentShootStart !== null) {
                                        const endTime = matchTime;
                                        const newEntry = {
                                            startShootTime: currentShootStart,
                                            endShootTime: endTime,
                                            duration: endTime - currentShootStart
                                        };
                                        setSubmittedTimes([...submittedTimes, newEntry]);
                                        setCurrentShootStart(null);
                                        setIsHolding(false);
                                    }
                                } : undefined}
                                // Touch events for mobile
                                onTouchStart={useTimerComponent ? (e) => {
                                    e.preventDefault();
                                    if (!currentShootStart && matchStarted && matchTime < MATCH_DURATION) {
                                        setIsHolding(true);
                                        holdStartTimeRef.current = matchTime;
                                        setCurrentShootStart(matchTime);
                                    }
                                } : undefined}
                                onTouchEnd={useTimerComponent ? (e) => {
                                    e.preventDefault();
                                    if (isHolding && currentShootStart !== null) {
                                        const endTime = matchTime;
                                        const newEntry = {
                                            startShootTime: currentShootStart,
                                            endShootTime: endTime,
                                            duration: endTime - currentShootStart
                                        };
                                        setSubmittedTimes([...submittedTimes, newEntry]);
                                        setCurrentShootStart(null);
                                        setIsHolding(false);
                                    }
                                } : undefined}
                                sx={{ 
                                    minWidth: 120,
                                    py: 1.5,
                                    fontSize: '1rem',
                                    boxShadow: 3,
                                    '&:hover': { boxShadow: 5 },
                                    ...(useTimerComponent && isHolding && {
                                        bgcolor: '#e74c3c',
                                        boxShadow: '0 4px 0 #c0392b',
                                        transform: 'translateY(2px)'
                                    })
                                }}
                            >
                                {useTimerComponent ? (isHolding ? 'Recording...' : 'Hold to Time') : (currentShootStart !== null ? '⏹ Stop Shooting' : '▶ Start Shooting')}
                            </Button>
                            <Button
                                variant="contained"
                                color="warning"
                                onClick={endMatch}
                                sx={{ 
                                    minWidth: 100,
                                    py: 1.5,
                                    fontSize: '1rem',
                                    boxShadow: 3,
                                    '&:hover': { boxShadow: 5 }
                                }}
                            >
                                End Match
                            </Button>
                        </>
                    )}
                </Stack>
                
                {/* Current shooting status */}
                {currentShootStart !== null && (
                    <Typography variant="body1" sx={{ color: '#FF9800', textAlign: 'center', mt: 2 }}>
                        Shooting in progress... (started at {formatTime(currentShootStart)})
                    </Typography>
                )}
            </Box>

            {/* Submitted Time Ranges */}
            {submittedTimes.length > 0 && (
                <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', borderRadius: 2, p: 3 }}>
                    <Typography variant="h6" sx={{ color: "white", mb: 2 }}>
                        Shooting Time Ranges ({submittedTimes.length})
                    </Typography>
                    <Stack spacing={1}>
                        {submittedTimes.map((entry, index) => (
                            <Box key={index} sx={{ 
                                bgcolor: 'rgba(255,152,0,0.2)', 
                                borderRadius: 1, 
                                p: 1.5,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <Typography variant="body1" sx={{ color: "white" }}>
                                    {formatTimeRange(entry.startShootTime, entry.endShootTime)}
                                </Typography>
                                <Button
                                    size="small"
                                    color="error"
                                    onClick={() => deleteTime(index)}
                                    sx={{ minWidth: 'auto', p: 0.5 }}
                                >
                                    ✕
                                </Button>
                            </Box>
                        ))}
                    </Stack>
                    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)", mt: 2 }}>
                        Total shooting time: {submittedTimes.reduce((sum, e) => sum + e.duration, 0).toFixed(1)}s
                    </Typography>
                </Box>
            )}

            {/* Instructions */}
            <Box sx={{ bgcolor: 'rgba(0,0,0,0.4)', borderRadius: 2, p: 2 }}>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", textAlign: 'center' }}>
                    {useTimerComponent ? (
                        <>
                            1. Click "Start Match" to begin the 2:30 timer<br/>
                            2. Toggle "Hold Mode" to enable hold timing<br/>
                            3. Press and hold the button to start timing, release to stop<br/>
                            4. Repeat for each scoring action<br/>
                            5. Data auto-submits at 2:30 or click "End Match"
                        </>
                    ) : (
                        <>
                            1. Click "Start Match" to begin the 2:30 timer<br/>
                            2. Click "Start Shooting" when robot begins scoring<br/>
                            3. Click "Stop Shooting" when robot finishes<br/>
                            4. Repeat for each scoring action<br/>
                            5. Data auto-submits at 2:30 or click "End Match"
                        </>
                    )}
                </Typography>
            </Box>
        </Stack>
    );
}

export default function TimerPage() {
    const [alert, setAlert] = useState({ open: false, message: "", severity: "success" });
    let data = useMemo(() => new MatchScoutData(setAlert), []);
    
    const [stage, setStage] = useState(MatchStage.PRE_MATCH);
    const [currentComponent, setCurrentComponent] = useState(<TimerPrematch data={data} />);
    const [submittedTimes, setSubmittedTimes] = useState([]);
    const [matchEnded, setMatchEnded] = useState(false);

    const handleStageChange = (newStage) => {
        data.stage = newStage;
        setStage(newStage);
    };

    const handleNext = async () => {
        if (stage === MatchStage.PRE_MATCH) {
            // Validation: Check required fields
            const verificationCode = data.get(MatchStage.PRE_MATCH, "verificationCode");
            const name = data.get(MatchStage.PRE_MATCH, "name");
            const team = data.get(MatchStage.PRE_MATCH, "team");
            const match = data.get(MatchStage.PRE_MATCH, "match");
            
            if (!verificationCode || !name || !team || !match) {
                setAlert({ 
                    open: true, 
                    message: "Please fill in all required fields: Name, Team Number, Match Number, and Verification Code", 
                    severity: "error" 
                });
                return;
            }
            handleStageChange(MatchStage.TELEOP);
        } else if (stage === MatchStage.TELEOP) {
            // Store the shooting time ranges
            data.setShootingTimeRanges(submittedTimes);
            handleStageChange(MatchStage.POST_MATCH);
        } else if (stage === MatchStage.POST_MATCH) {
            handleStageChange(MatchStage.GAMBLING);
        }
    };

    const handlePrevious = () => {
        if (stage === MatchStage.TELEOP) {
            handleStageChange(MatchStage.PRE_MATCH);
        } else if (stage === MatchStage.POST_MATCH) {
            handleStageChange(MatchStage.TELEOP);
        } else if (stage === MatchStage.GAMBLING) {
            handleStageChange(MatchStage.POST_MATCH);
        }
    };

    // Update component based on stage
    useMemo(() => {
        switch (stage) {
            case MatchStage.PRE_MATCH:
                setCurrentComponent(<TimerPrematch data={data} />);
                break;
            case MatchStage.TELEOP:
                setCurrentComponent(<TimerContent 
                    submittedTimes={submittedTimes} 
                    setSubmittedTimes={setSubmittedTimes}
                    setMatchEnded={setMatchEnded}
                />);
                break;
            case MatchStage.POST_MATCH:
                setCurrentComponent(<TimerPostmatch data={data} />);
                break;
            case MatchStage.GAMBLING:
                setCurrentComponent(<Gambling data={data} handleStageChange={handleStageChange} />);
                break;
            default:
                setCurrentComponent(<TimerPrematch data={data} />);
        }
    }, [stage, submittedTimes, matchEnded]);

    const getStageTitle = () => {
        switch (stage) {
            case MatchStage.PRE_MATCH: return "Pre-Match";
            case MatchStage.TELEOP: return "Timer";
            case MatchStage.POST_MATCH: return "Post-Match";
            case MatchStage.GAMBLING: return "Gambling";
            default: return "Timer Scout";
        }
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            py: 3,
        }}>
            <Container maxWidth="md">
                <Stack spacing={3}>
                    {/* Header */}
                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                        <Typography variant="h3" sx={{ 
                            color: 'white', 
                            textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                        }}>
                            Timer Scout
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#FF9800', mt: 1 }}>
                            {getStageTitle()}
                        </Typography>
                        <Divider sx={{ width: '50%', mx: 'auto', mt: 2, backgroundColor: 'rgba(255,255,255,0.3)' }} />
                    </Box>

                    {/* Alert */}
                    <Collapse in={alert.open}>
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

                    {/* Main Content */}
                    <Box sx={{ 
                        bgcolor: 'rgba(0,0,0,0.75)', 
                        borderRadius: 3, 
                        p: { xs: 2, sm: 4 },
                        backdropFilter: 'blur(10px)'
                    }}>
                        {currentComponent}
                    </Box>

                    {/* Navigation Buttons */}
                    <Stack direction="row" spacing={2} justifyContent="center">
                        {stage > MatchStage.PRE_MATCH && stage <= MatchStage.POST_MATCH && (
                            <Button
                                variant="outlined"
                                onClick={handlePrevious}
                                sx={{
                                    color: "white",
                                    borderColor: "rgba(255,255,255,0.5)",
                                    px: 4,
                                    py: 1.5,
                                    '&:hover': {
                                        borderColor: '#FF9800',
                                        bgcolor: 'rgba(255,152,0,0.1)'
                                    }
                                }}
                            >
                                ← Previous
                            </Button>
                        )}
                        
                        {stage === MatchStage.GAMBLING ? (
                            <Button
                                variant="contained"
                                color="success"
                                onClick={async () => {
                                    // Submit data to Firebase
                                    const team = data.get(MatchStage.PRE_MATCH, "team");
                                    const match = data.get(MatchStage.PRE_MATCH, "match");
                                    const name = data.get(MatchStage.PRE_MATCH, "name");
                                    const verificationCode = data.get(MatchStage.PRE_MATCH, "verificationCode");
                                    const alliance = data.get(MatchStage.PRE_MATCH, "alliance");
                                    const start_position = data.get(MatchStage.PRE_MATCH, "start_position");
                                    const comments = data.get(MatchStage.POST_MATCH, "comments");
                                    const shootingTimes = submittedTimes;
                                    
                                    try {
                                        await setDoc(doc(firebase, "timerScoutData", team + "_" + match), {
                                            team,
                                            match,
                                            name,
                                            verificationCode,
                                            alliance,
                                            start_position,
                                            comments,
                                            shootingTimes,
                                            timestamp: Date.now(),
                                            totalShootingTime: shootingTimes.reduce((sum, e) => sum + e.duration, 0),
                                            shootingRangeCount: shootingTimes.length,
                                        });
                                        setAlert({ open: true, message: "Timer data submitted successfully!", severity: "success" });
                                        setTimeout(() => {
                                            window.location.pathname = '/';
                                        }, 1500);
                                    } catch (error) {
                                        setAlert({ open: true, message: "Error submitting data: " + error.message, severity: "error" });
                                    }
                                }}
                                sx={{
                                    px: 4,
                                    py: 1.5,
                                    fontWeight: 'bold',
                                    bgcolor: '#4CAF50',
                                    '&:hover': { bgcolor: '#388E3C' }
                                }}
                            >
                                Finish
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                onClick={handleNext}
                                sx={{
                                    bgcolor: '#FF9800',
                                    color: 'white',
                                    px: 4,
                                    py: 1.5,
                                    fontWeight: 'bold',
                                    '&:hover': { bgcolor: '#F57C00' }
                                }}
                            >
                                {stage === MatchStage.POST_MATCH ? 'Go to Gambling →' : 'Next →'}
                            </Button>
                        )}
                    </Stack>
                </Stack>
            </Container>
        </Box>
    );
}
