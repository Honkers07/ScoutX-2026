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

    const stopWatch = Timer(); 

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

    const recordTime = () => {
        setTime(stopWatch.elapsedTime);
    }

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
            <Button variant="outlined" onClick={() => stopWatch.startStopwatch()} fullWidth>
                Start Timer
            </Button>
            <Button 
                variant="outlined" 
                onClick={() => {
                    stopWatch.stopStopwatch();
                    recordTime(); 
                }} 
                fullWidth
            >
                Stop Timer
            </Button>
            <Typography>
                {stopWatch.formattedTime}
            </Typography>
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
