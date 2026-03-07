import { useState, useMemo } from "react";
import { Alert, Button, Collapse, Divider, IconButton, Stack, Typography, Box, Container, Unstable_Grid2 as Grid2, TextField } from "@mui/material";
import { MatchStage } from "../MatchConstants";
import MatchScoutData from "../MatchScoutData";
import CloseIcon from "@mui/icons-material/Close";
import Gambling from "./Gambling";
import bgImage from "../../assets/backGround.png";
import firebase from "../../firebase";
import { doc, setDoc } from "firebase/firestore";

// Custom Prematch component for Fuel Scout Page
function FuelPrematch({ data }) {
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

// Custom Postmatch component for Fuel Scout Page
function FuelPostmatch({ data }) {
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

// Main Fuel Content
function FuelContent({ fuelScored, setFuelScored, trackingBursts, setTrackingBursts }) {
    const [counter, setCounter] = useState(0);
    const update = () => setCounter(counter + 1);

    const handleBursts = () => {
        if (!trackingBursts) {
            setFuelScored([...fuelScored, 0]); 
        }
        setTrackingBursts(!trackingBursts);
    };

    const handleFuelClick = (value) => {
        const newFuelScored = [...fuelScored];
        const currentFuel = newFuelScored[newFuelScored.length - 1];
        const newValue = currentFuel + value;
        if (newValue <= 500 && newValue >= 0) {
            newFuelScored[newFuelScored.length - 1] = newValue;
            setFuelScored(newFuelScored);
            update();
        }
    };

    const deleteFuel = (index) => {
        const newFuelScored = [...fuelScored];
        newFuelScored.splice(index, 1);
        setFuelScored(newFuelScored);
    };

    const getTotalFuel = () => {
        return fuelScored.reduce((sum, val) => sum + val, 0);
    };

    const getCurrentBurstFuel = () => {
        return fuelScored[fuelScored.length - 1];
    };

    return (
        <Stack spacing={3}>
            {/* Total Display */}
            <Box sx={{ 
                textAlign: 'center',
                bgcolor: 'rgba(0,0,0,0.6)', 
                borderRadius: 3, 
                p: 3,
                border: '2px solid',
                borderColor: '#FF9800'
            }}>
                <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Total Fuel Scored
                </Typography>
                <Typography variant="h1" sx={{ 
                    color: '#FF9800', 
                    fontWeight: 'bold',
                    fontSize: { xs: '4rem', sm: '6rem' }
                }}>
                    {getTotalFuel()}
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                    {fuelScored.length - 1} Bursts Recorded
                </Typography>
            </Box>

            {/* Start/End Burst Button */}
            <Button 
                variant="contained" 
                onClick={handleBursts}
                color={trackingBursts ? "error" : "success"}
                fullWidth
                sx={{ 
                    py: 2,
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    boxShadow: 3,
                    '&:hover': { boxShadow: 5 }
                }}
            >
                {trackingBursts ? '⏹ End Burst' : '▶ Start Burst'}
            </Button>
            
            {/* Add/Remove Fuel Buttons */}
            {trackingBursts && (
                <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', borderRadius: 2, p: 3 }}>
                    <Typography variant="h6" sx={{ color: "white", mb: 2, textAlign: 'center' }}>
                        Current Burst: {getCurrentBurstFuel()} Fuel
                    </Typography>
                    
                    <Stack spacing={2}>
                        <Stack direction="row" spacing={1.5}>
                            {[1, 5, 10].map(value => (
                                <Button 
                                    key={`add-${value}`}
                                    variant="contained"
                                    onClick={() => handleFuelClick(value)}
                                    fullWidth
                                    sx={{
                                        bgcolor: '#4CAF50',
                                        '&:hover': { bgcolor: '#388E3C' },
                                        py: 2,
                                        fontSize: '1.1rem',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    +{value} ⛽
                                </Button>
                            ))}
                        </Stack>
                        <Stack direction="row" spacing={1.5}>
                            {[-1, -5, -10].map(value => (
                                <Button 
                                    key={`remove-${value}`}
                                    variant="contained"
                                    color="error"
                                    onClick={() => handleFuelClick(value)}
                                    fullWidth
                                    sx={{
                                        py: 2,
                                        fontSize: '1.1rem',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    {value} ⛽
                                </Button>
                            ))}
                        </Stack>
                    </Stack>
                </Box>
            )}

            {/* Burst History with individual delete buttons */}
            {fuelScored.length > 1 && (
                <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', borderRadius: 2, p: 3 }}>
                    <Typography variant="h6" sx={{ color: "white", mb: 2 }}>
                        Burst History ({fuelScored.length - 1} bursts)
                    </Typography>
                    <Grid2 container spacing={1}>
                        {fuelScored.slice(1).map((fuel, index) => (
                            <Grid2 xs={4} sm={3} md={2} key={index}>
                                <Box sx={{ 
                                    bgcolor: 'rgba(255,152,0,0.2)', 
                                    borderRadius: 1, 
                                    p: 1,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <Box>
                                        <Typography variant="body1" sx={{ color: "white", fontWeight: 'bold' }}>
                                            {fuel}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                                            Burst {index + 1}
                                        </Typography>
                                    </Box>
                                    <Button
                                        size="small"
                                        color="error"
                                        onClick={() => deleteFuel(index + 1)}
                                        sx={{ minWidth: 'auto', p: 0.5 }}
                                    >
                                        ✕
                                    </Button>
                                </Box>
                            </Grid2>
                        ))}
                    </Grid2>
                </Box>
            )}
        </Stack>
    );
}

export default function FuelScout() {
    const [alert, setAlert] = useState({ open: false, message: "", severity: "success" });
    let data = useMemo(() => new MatchScoutData(setAlert), []);
    
    const [stage, setStage] = useState(MatchStage.PRE_MATCH);
    const [currentComponent, setCurrentComponent] = useState(<FuelPrematch data={data} />);
    const [fuelScored, setFuelScored] = useState([0]);
    const [trackingBursts, setTrackingBursts] = useState(false);

    const handleStageChange = (newStage) => {
        data.stage = newStage;
        setStage(newStage);
    };

    const handleNext = () => {
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
                setCurrentComponent(<FuelPrematch data={data} />);
                break;
            case MatchStage.TELEOP:
                setCurrentComponent(<FuelContent 
                    fuelScored={fuelScored} 
                    setFuelScored={setFuelScored}
                    trackingBursts={trackingBursts}
                    setTrackingBursts={setTrackingBursts}
                />);
                break;
            case MatchStage.POST_MATCH:
                setCurrentComponent(<FuelPostmatch data={data} />);
                break;
            case MatchStage.GAMBLING:
                setCurrentComponent(<Gambling data={data} handleStageChange={handleStageChange} />);
                break;
            default:
                setCurrentComponent(<FuelPrematch data={data} />);
        }
    }, [stage, fuelScored, trackingBursts]);

    const getStageTitle = () => {
        switch (stage) {
            case MatchStage.PRE_MATCH: return "Pre-Match";
            case MatchStage.TELEOP: return "Fuel Scout";
            case MatchStage.POST_MATCH: return "Post-Match";
            case MatchStage.GAMBLING: return "Gambling";
            default: return "Fuel Scout";
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
                            Fuel Scout
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
                                    const team = data.get(MatchStage.PRE_MATCH, "team");
                                    const match = data.get(MatchStage.PRE_MATCH, "match");
                                    const name = data.get(MatchStage.PRE_MATCH, "name");
                                    const verificationCode = data.get(MatchStage.PRE_MATCH, "verificationCode");
                                    const alliance = data.get(MatchStage.PRE_MATCH, "alliance");
                                    const start_position = data.get(MatchStage.PRE_MATCH, "start_position");
                                    const comments = data.get(MatchStage.POST_MATCH, "comments");
                                    
                                    // Get post match data
                                    const disabled = data.getPostData("disabled");
                                    const brownsOut = data.getPostData("brownsOut");
                                    const wobbly = data.getPostData("wobbly");
                                    const intakeBroken = data.getPostData("intakeBroken");
                                    const outtakeBroken = data.getPostData("outtakeBroken");
                                    const failedClimb = data.getPostData("failedClimb");
                                    const trench = data.getPostData("trench");
                                    const defense = data.getPostData("defense");
                                    const shuttle = data.getPostData("shuttle");
                                    
                                    try {
                                        await setDoc(doc(firebase, "fuelScoutData", team + "_" + match), {
                                            team,
                                            match,
                                            name,
                                            verificationCode,
                                            alliance,
                                            start_position,
                                            comments,
                                            fuelScored,
                                            totalFuel: fuelScored.reduce((sum, val) => sum + val, 0),
                                            burstCount: fuelScored.length - 1,
                                            disabled,
                                            brownsOut,
                                            wobbly,
                                            intakeBroken,
                                            outtakeBroken,
                                            failedClimb,
                                            trench,
                                            defense,
                                            shuttle,
                                            timestamp: Date.now(),
                                        });
                                        setAlert({ open: true, message: "Fuel data submitted successfully!", severity: "success" });
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
