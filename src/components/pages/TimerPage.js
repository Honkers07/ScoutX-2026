import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { Alert, Button, Collapse, Divider, IconButton, Stack, Typography, Box, Container, Unstable_Grid2 as Grid2, TextField, Switch, FormControlLabel, Slider, Paper } from "@mui/material";
import { MatchStage } from "../MatchConstants";
import MatchScoutData from "../MatchScoutData";
import CloseIcon from "@mui/icons-material/Close";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import Gambling from "./Gambling";
import bgImage from "../../assets/backGround.png";
import firebase from "../../firebase";
import { doc, setDoc } from "firebase/firestore";

const MATCH_DURATION = 600;
const FRC_MATCH_DURATION = 163; // 2 minutes 43 seconds standard FRC match
const AUDIO_SAMPLE_RATE = 10; // Samples per second for amplitude graph 

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
        </Grid2>
    );
}

// Custom Postmatch component for Timer Page
function TimerPostmatch({ data, cropStart: initialCropStart, setCropStart, cropEnd: initialCropEnd, setCropEnd, amplitudeData, audioBlob, detectedBuzzerTime, actualMatchDuration }) {
    const [counter, setCounter] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackPosition, setPlaybackPosition] = useState(0);
    // Local state for sliders to ensure real-time updates
    const [cropStart, setCropStartLocal] = useState(initialCropStart);
    const [cropEnd, setCropEndLocal] = useState(initialCropEnd);
    const audioRef = useRef(null);
    const playbackIntervalRef = useRef(null);
    const update = () => setCounter(counter + 1);

    // Sync local state with props when they change
    useEffect(() => {
        setCropStartLocal(initialCropStart);
    }, [initialCropStart]);
    
    useEffect(() => {
        setCropEndLocal(initialCropEnd);
    }, [initialCropEnd]);

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

    // Helper to format time
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    };

    // Handle audio playback with position tracking
    const togglePlayback = () => {
        // Ensure we have a fresh audio blob
        if (audioBlob && (!audioRef.current || audioRef.current.src === '')) {
            audioRef.current = new Audio(URL.createObjectURL(audioBlob));
            audioRef.current.onended = () => {
                setIsPlaying(false);
                setPlaybackPosition(cropStart);
                if (playbackIntervalRef.current) {
                    clearInterval(playbackIntervalRef.current);
                }
            };
        }
        
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
                if (playbackIntervalRef.current) {
                    clearInterval(playbackIntervalRef.current);
                }
            } else {
                // Start from crop start time
                audioRef.current.currentTime = cropStart;
                audioRef.current.play();
                setIsPlaying(true);
                
                // Update playback position
                playbackIntervalRef.current = setInterval(() => {
                    if (audioRef.current) {
                        const currentTime = audioRef.current.currentTime;
                        setPlaybackPosition(currentTime);
                        
                        // Stop at crop end time (start + 163 seconds)
                        if (currentTime >= cropStart + FRC_MATCH_DURATION) {
                            audioRef.current.pause();
                            setIsPlaying(false);
                            setPlaybackPosition(cropStart);
                            clearInterval(playbackIntervalRef.current);
                        }
                    }
                }, 50);
            }
        }
    };

    // Handle slider changes - update local state and parent
    const handleStartChange = (event, newValue) => {
        setCropStartLocal(newValue);
        setCropStart(newValue); // Update parent state
        update();
    };

    const handleEndChange = (event, newValue) => {
        setCropEndLocal(newValue);
        setCropEnd(newValue); // Update parent state
        update();
    };

    // Render amplitude graph with crop markers
    const renderAmplitudeGraph = () => {
        if (!amplitudeData || amplitudeData.length === 0) {
            return (
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', py: 2 }}>
                    No audio data recorded
                </Typography>
            );
        }

        const maxTime = Math.max(amplitudeData[amplitudeData.length - 1]?.time || 0, 1);
        const canvasWidth = 600;
        const canvasHeight = 150;
        const barWidth = canvasWidth / amplitudeData.length;
        const maxAmplitude = Math.max(...amplitudeData.map(d => d.amplitude), 1);

        return (
            <Box sx={{ width: '100%', overflow: 'hidden' }}>
                <svg width="100%" height={canvasHeight} viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} preserveAspectRatio="none">
                    {/* Background grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                        <line 
                            key={i}
                            x1="0" 
                            y1={canvasHeight * ratio} 
                            x2={canvasWidth} 
                            y2={canvasHeight * ratio} 
                            stroke="rgba(255,255,255,0.1)" 
                            strokeWidth="1"
                        />
                    ))}
                    
                    {/* Amplitude bars - darker if outside crop region */}
                    {amplitudeData.map((point, i) => {
                        const barHeight = (point.amplitude / maxAmplitude) * canvasHeight;
                        const isAboveThreshold = point.amplitude > maxAmplitude * 0.7;
                        const isInCropRegion = point.time >= cropStart && point.time <= cropStart + FRC_MATCH_DURATION;
                        const xPos = (point.time / maxTime) * canvasWidth;
                        return (
                            <rect
                                key={i}
                                x={xPos}
                                y={canvasHeight - barHeight}
                                width={Math.max(barWidth - 0.5, 1)}
                                height={barHeight}
                                fill={isAboveThreshold ? '#FF6B6B' : '#4ECDC4'}
                                opacity={isInCropRegion ? 0.8 : 0.3}
                            />
                        );
                    })}
                    
                    {/* Crop start marker */}
                    <line
                        x1={(cropStart / maxTime) * canvasWidth}
                        y1="0"
                        x2={(cropStart / maxTime) * canvasWidth}
                        y2={canvasHeight}
                        stroke="#4CAF50"
                        strokeWidth="3"
                    />
                    <polygon 
                        points={`${(cropStart / maxTime) * canvasWidth},0 ${(cropStart / maxTime) * canvasWidth + 10},0 ${(cropStart / maxTime) * canvasWidth},10`}
                        fill="#4CAF50"
                    />
                    
                    {/* Crop end marker - calculated from start + 163 seconds */}
                    <line
                        x1={((cropStart + FRC_MATCH_DURATION) / maxTime) * canvasWidth}
                        y1="0"
                        x2={((cropStart + FRC_MATCH_DURATION) / maxTime) * canvasWidth}
                        y2={canvasHeight}
                        stroke="#F44336"
                        strokeWidth="3"
                    />
                    <polygon 
                        points={`${((cropStart + FRC_MATCH_DURATION) / maxTime) * canvasWidth},0 ${((cropStart + FRC_MATCH_DURATION) / maxTime) * canvasWidth - 10},0 ${((cropStart + FRC_MATCH_DURATION) / maxTime) * canvasWidth},10`}
                        fill="#F44336"
                    />
                    
                    {/* Crop region highlight */}
                    <rect
                        x={(cropStart / maxTime) * canvasWidth}
                        y="0"
                        width={(FRC_MATCH_DURATION / maxTime) * canvasWidth}
                        height={canvasHeight}
                        fill="rgba(255,152,0,0.15)"
                    />
                    
                    {/* Playback position indicator */}
                    {isPlaying && (
                        <line
                            x1={(playbackPosition / maxTime) * canvasWidth}
                            y1="0"
                            x2={(playbackPosition / maxTime) * canvasWidth}
                            y2={canvasHeight}
                            stroke="#FFFFFF"
                            strokeWidth="2"
                        />
                    )}
                </svg>
                
                {/* Time labels based on actual duration */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>0:00</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>{formatTime(maxTime / 2)}</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>{formatTime(maxTime)}</Typography>
                </Box>
            </Box>
        );
    };

    return (
        <Stack spacing={3}>
            {/* Audio Amplitude Graph Section */}
            <Box>
                <Typography variant="h6" sx={{ color: "white", mb: 2 }}>Audio Amplitude Graph & Crop</Typography>
                <Paper sx={{ 
                    bgcolor: 'rgba(0,0,0,0.5)', 
                    p: 2, 
                    borderRadius: 2,
                    border: '1px solid rgba(255,255,255,0.2)'
                }}>
                    {amplitudeData && amplitudeData.length > 0 ? (
                        <>
                            {renderAmplitudeGraph()}
                            
                            {/* Audio Playback Controls */}
                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                                <Button
                                    variant="contained"
                                    color={isPlaying ? "error" : "primary"}
                                    startIcon={isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                                    onClick={togglePlayback}
                                    disabled={!audioBlob}
                                >
                                    {isPlaying ? 'Stop' : 'Play Audio'}
                                </Button>
                                {audioBlob && (
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                        {isPlaying ? `Playing: ${formatTime(playbackPosition)}` : 'Click to listen to audio and identify the buzzer'}
                                    </Typography>
                                )}
                            </Box>
                            
                            {/* Dual Crop Sliders */}
                            <Box sx={{ mt: 3, px: 2 }}>
                                <Typography variant="body2" sx={{ color: 'white', mb: 1 }}>
                                    <Box component="span" sx={{ color: '#4CAF50' }}>●</Box> Start: <strong>{formatTime(cropStart)}</strong>
                                    <Box component="span" sx={{ mx: 2 }}></Box>
                                    <Box component="span" sx={{ color: '#F44336' }}>●</Box> End: <strong>{formatTime(cropStart + FRC_MATCH_DURATION)}</strong>
                                </Typography>
                                
                                {/* Crop Start Slider */}
                                <Typography variant="caption" sx={{ color: '#4CAF50', display: 'block', mb: 0.5 }}>
                                    Crop Start (drag to set match start)
                                </Typography>
                                <Slider
                                    value={cropStart}
                                    onChange={handleStartChange}
                                    min={0}
                                    max={Math.max(actualMatchDuration - FRC_MATCH_DURATION, 30)}
                                    step={0.1}
                                    sx={{
                                        color: '#4CAF50',
                                        '& .MuiSlider-thumb': { width: 20, height: 20 },
                                        '& .MuiSlider-track': { height: 6 },
                                        '& .MuiSlider-rail': { height: 6 },
                                    }}
                                />
                                
                                <Typography variant="body2" sx={{ color: 'white', mt: 2 }}>
                                    Match will be: <strong>{formatTime(cropStart)}</strong> to <strong>{formatTime(cropStart + FRC_MATCH_DURATION)}</strong>
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', mt: 1 }}>
                                    The match duration is fixed at 2:43 (163 seconds)
                                </Typography>
                            </Box>
                        </>
                    ) : (
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', py: 4 }}>
                            No audio data was recorded during this match
                        </Typography>
                    )}
                </Paper>
            </Box>

            <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />

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

// Main Timer Content - with match timing and audio detection
function TimerContent({ submittedTimes, setSubmittedTimes, setMatchEnded, setAudioBlobRef, setAudioDataRef }) {
    const [matchStarted, setMatchStarted] = useState(false);
    const [matchTime, setMatchTime] = useState(0); // in seconds
    const [isRunning, setIsRunning] = useState(false);
    const [amplitudeData, setAmplitudeData] = useState([]);
    const [isRecordingAudio, setIsRecordingAudio] = useState(false);
    const [audioPermissionDenied, setAudioPermissionDenied] = useState(false);
    const [matchDuration, setMatchDuration] = useState(0); // Actual match duration
    
    const timerRef = useRef(null);
    const startTimeRef = useRef(0);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioIntervalRef = useRef(null);
    const matchStartTimeRef = useRef(0);
    
    const [currentShootStart, setCurrentShootStart] = useState(null);
    const [isHolding, setIsHolding] = useState(false); // Track if user is holding the button
    const holdStartTimeRef = useRef(0); // Track when hold started

    // Initialize audio recording (both amplitude and audio file for playback)
    const initAudioRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            
            // Set up audio context and analyser for amplitude
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            source.connect(analyserRef.current);
            
            // Set up MediaRecorder for audio playback
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];
            
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };
            
            mediaRecorderRef.current.start(100); // Collect data every 100ms
            
            setIsRecordingAudio(true);
            setAudioPermissionDenied(false);
            
            // Start collecting amplitude data
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            const newAmplitudeData = [];
            
            audioIntervalRef.current = setInterval(() => {
                if (analyserRef.current) {
                    analyserRef.current.getByteFrequencyData(dataArray);
                    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                    const timeSinceMatchStart = (Date.now() - matchStartTimeRef.current) / 1000;
                    
                    newAmplitudeData.push({
                        time: timeSinceMatchStart,
                        amplitude: average
                    });
                    
                    // Update state periodically
                    setAmplitudeData([...newAmplitudeData]);
                }
            }, 1000 / AUDIO_SAMPLE_RATE);
            
        } catch (error) {
            console.error('Error initializing audio recording:', error);
            setAudioPermissionDenied(true);
            setIsRecordingAudio(false);
        }
    };

    // Stop audio recording
    const stopAudioRecording = () => {
        if (audioIntervalRef.current) {
            clearInterval(audioIntervalRef.current);
            audioIntervalRef.current = null;
        }
        
        // Stop MediaRecorder and create audio blob
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            
            // Wait for recording to finish, then create blob
            setTimeout(() => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlobRef(audioBlob);
            }, 100);
        }
        
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        
        setIsRecordingAudio(false);
        
        // Store amplitude data in ref for parent component
        setAudioDataRef(amplitudeData);
    };

    // Detect buzzer spike in amplitude data
    const detectBuzzer = (amplitudes) => {
        if (!amplitudes || amplitudes.length < 10) return null;
        
        // Calculate average and find spike threshold
        const avgAmplitude = amplitudes.reduce((sum, d) => sum + d.amplitude, 0) / amplitudes.length;
        const threshold = avgAmplitude * 3; // Spike is 3x average
        
        // Find the first significant spike (buzzer)
        for (let i = 5; i < amplitudes.length; i++) {
            if (amplitudes[i].amplitude > threshold && amplitudes[i].amplitude > 50) {
                // Check if it's sustained (buzzer lasts a few seconds)
                let sustainedCount = 0;
                for (let j = i; j < Math.min(i + 10, amplitudes.length); j++) {
                    if (amplitudes[j].amplitude > threshold * 0.5) {
                        sustainedCount++;
                    }
                }
                if (sustainedCount >= 3) {
                    return amplitudes[i].time;
                }
            }
        }
        
        return null;
    };

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
    const startMatch = async () => {
        setMatchStarted(true);
        setMatchTime(0);
        setMatchDuration(0);
        setIsRunning(true);
        setAmplitudeData([]);
        startTimeRef.current = Date.now();
        matchStartTimeRef.current = Date.now();
        
        // Start audio recording
        await initAudioRecording();
        
        timerRef.current = setInterval(() => {
            const elapsed = (Date.now() - startTimeRef.current) / 1000;
            setMatchTime(elapsed);
            // NOTE: Removed auto-end at 2:30 - user controls match duration
        }, 100);
    };

    // End the match manually
    const endMatch = () => {
        clearInterval(timerRef.current);
        setIsRunning(false);
        
        // Store the actual match duration
        const finalMatchTime = (Date.now() - startTimeRef.current) / 1000;
        setMatchDuration(finalMatchTime);
        
        // Stop audio recording
        stopAudioRecording();
        
        // If currently shooting, end that shoot
        if (currentShootStart !== null) {
            const newEntry = {
                startShootTime: currentShootStart,
                endShootTime: finalMatchTime,
                duration: finalMatchTime - currentShootStart
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
        return () => {
            clearInterval(timerRef.current);
            if (audioIntervalRef.current) {
                clearInterval(audioIntervalRef.current);
            }
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
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
                
                {/* Audio Recording Status */}
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
                    {isRecordingAudio ? (
                        <>
                            <Box sx={{ 
                                width: 10, 
                                height: 10, 
                                borderRadius: '50%', 
                                bgcolor: '#4CAF50',
                                animation: 'pulse 1s infinite'
                            }} />
                            <Typography variant="body2" sx={{ color: '#4CAF50' }}>
                                Recording Audio...
                            </Typography>
                        </>
                    ) : audioPermissionDenied ? (
                        <Typography variant="body2" sx={{ color: '#FF6B6B' }}>
                            Audio recording disabled
                        </Typography>
                    ) : (
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            Audio not recording
                        </Typography>
                    )}
                </Box>
                
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
                            {/* Hold Mode Button - always shown, prioritizes hold functionality */}
                            <Button
                                variant="contained"
                                color={isHolding ? "error" : "success"}
                                disabled={!matchStarted}
                                onMouseDown={() => {
                                    if (matchStarted) {
                                        setIsHolding(true);
                                        holdStartTimeRef.current = matchTime;
                                        setCurrentShootStart(matchTime);
                                    }
                                }}
                                onMouseUp={() => {
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
                                }}
                                onMouseLeave={() => {
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
                                }}
                                // Touch events for mobile
                                onTouchStart={(e) => {
                                    e.preventDefault();
                                    if (matchStarted) {
                                        setIsHolding(true);
                                        holdStartTimeRef.current = matchTime;
                                        setCurrentShootStart(matchTime);
                                    }
                                }}
                                onTouchEnd={(e) => {
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
                                }}
                                sx={{ 
                                    minWidth: 200,
                                    py: 2,
                                    fontSize: '1.2rem',
                                    boxShadow: 3,
                                    '&:hover': { boxShadow: 5 },
                                    ...(isHolding && {
                                        bgcolor: '#e74c3c',
                                        boxShadow: '0 4px 0 #c0392b',
                                        transform: 'translateY(2px)'
                                    })
                                }}
                            >
                                {isHolding ? 'Recording...' : 'Hold to Time'}
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
                    1. Click "Start Match" to begin<br/>
                    2. Press and hold the button to time each scoring action<br/>
                    3. Release to stop timing<br/>
                    4. Click "End Match" when done
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
    const [audioDataRef, setAudioDataRef] = useState([]);
    const [audioBlobRef, setAudioBlobRef] = useState(null);
    const [cropStart, setCropStart] = useState(0);
    const [cropEnd, setCropEnd] = useState(0);
    const [detectedBuzzerTime, setDetectedBuzzerTime] = useState(null);
    const [actualMatchDuration, setActualMatchDuration] = useState(0);

    // Detect buzzer from amplitude data
    const detectBuzzerFromData = useCallback((amplitudes) => {
        if (!amplitudes || amplitudes.length < 10) return null;
        
        // Calculate average and find spike threshold
        const avgAmplitude = amplitudes.reduce((sum, d) => sum + d.amplitude, 0) / amplitudes.length;
        const threshold = avgAmplitude * 3; // Spike is 3x average
        
        // Find the first significant spike (buzzer) - look in first 30 seconds
        for (let i = 5; i < Math.min(amplitudes.length, 300); i++) {
            if (amplitudes[i].amplitude > threshold && amplitudes[i].amplitude > 50) {
                // Check if it's sustained (buzzer lasts a few seconds)
                let sustainedCount = 0;
                for (let j = i; j < Math.min(i + 10, amplitudes.length); j++) {
                    if (amplitudes[j].amplitude > threshold * 0.5) {
                        sustainedCount++;
                    }
                }
                if (sustainedCount >= 3) {
                    return amplitudes[i].time;
                }
            }
        }
        
        return null;
    }, []);

    // Handle crop start change
    const handleCropStartChange = useCallback((newStart) => {
        setCropStart(newStart);
    }, []);

    // Handle crop end change
    const handleCropEndChange = useCallback((newEnd) => {
        setCropEnd(newEnd);
    }, []);

    // Detect buzzer when audio data becomes available
    useEffect(() => {
        if (audioDataRef && audioDataRef.length > 0 && matchEnded) {
            const detected = detectBuzzerFromData(audioDataRef);
            if (detected !== null) {
                setDetectedBuzzerTime(detected);
                // Auto-set crop start to detected buzzer time
                setCropStart(Math.min(detected, 30));
            }
            // Set crop end to match duration
            if (audioDataRef.length > 0) {
                const maxTime = audioDataRef[audioDataRef.length - 1].time;
                setCropEnd(maxTime);
                setActualMatchDuration(maxTime);
            }
        }
    }, [audioDataRef, matchEnded, detectBuzzerFromData]);

    // Inject pulse animation CSS
    useEffect(() => {
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        `;
        document.head.appendChild(styleSheet);
        return () => document.head.removeChild(styleSheet);
    }, []);

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
            // Filter out values BEFORE the cropStart time window first, then adjust
            // Only keep values that end AFTER cropStart (within or after the window)
            const filteredTimes = submittedTimes.filter(time => {
                // Keep only times where the end time is AFTER the cropStart
                // (i.e., the shoot ended after the video crop starts)
                return time.endShootTime > cropStart;
            });
            
            // Then adjust times relative to crop start and clamp to time window
            const adjustedTimes = filteredTimes.map(time => {
                const adjustedStart = time.startShootTime - cropStart;
                const adjustedEnd = time.endShootTime - cropStart;
                // Clamp to be within 0 to FRC_MATCH_DURATION
                const clampedStart = Math.max(0, adjustedStart);
                const clampedEnd = Math.min(FRC_MATCH_DURATION, adjustedEnd);
                return {
                    startShootTime: clampedStart,
                    endShootTime: clampedEnd,
                    duration: clampedEnd - clampedStart
                };
            }).filter(time => {
                // Also filter out any remaining invalid/zero duration entries
                return time.endShootTime > time.startShootTime;
            });
            
            data.setShootingTimeRanges(adjustedTimes);
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
                    setAudioBlobRef={setAudioBlobRef}
                    setAudioDataRef={setAudioDataRef}
                />);
                break;
            case MatchStage.POST_MATCH:
                setCurrentComponent(<TimerPostmatch 
                    data={data} 
                    cropStart={cropStart}
                    setCropStart={handleCropStartChange}
                    cropEnd={cropEnd}
                    setCropEnd={handleCropEndChange}
                    amplitudeData={audioDataRef}
                    audioBlob={audioBlobRef}
                    detectedBuzzerTime={detectedBuzzerTime}
                    actualMatchDuration={actualMatchDuration}
                />);
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
                                    const matchNum = data.get(MatchStage.PRE_MATCH, "match");
                                    const name = data.get(MatchStage.PRE_MATCH, "name");
                                    const verificationCode = data.get(MatchStage.PRE_MATCH, "verificationCode");
                                    const alliance = data.get(MatchStage.PRE_MATCH, "alliance");
                                    const comments = data.get(MatchStage.POST_MATCH, "comments");
                                    // Get the adjusted shooting times (with crop applied)
                                    const shootingTimes = data.get(MatchStage.TELEOP, "shootingTimes") || submittedTimes;
                                    
                                    // Calculate shooting times relative to crop start (0-163 seconds)
                                    // Filter to only keep values within the valid match window (0-163 seconds)
                                    const MATCH_DURATION = 163;
                                    const relativeShootingTimes = shootingTimes
                                        .map(time => ({
                                            startShootTime: Math.max(0, time.startShootTime - cropStart),
                                            endShootTime: Math.max(0, time.endShootTime - cropStart),
                                            duration: time.duration
                                        }))
                                        .filter(time => time.startShootTime >= 0 && time.endShootTime <= MATCH_DURATION);
                                    
                                    try {
                                        await setDoc(doc(firebase, "timerScoutData", team + "_" + matchNum), {
                                            team,
                                            match: matchNum,
                                            name,
                                            verificationCode,
                                            alliance,
                                            comments,
                                            shootingTimes: relativeShootingTimes,
                                            timestamp: Date.now(),
                                            totalShootingTime: relativeShootingTimes.reduce((sum, e) => sum + e.duration, 0),
                                            shootingRangeCount: relativeShootingTimes.length,
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
