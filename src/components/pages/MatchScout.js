import { Alert, Button, Collapse, Divider, IconButton, Stack, Typography, Box, Container } from "@mui/material";
import Page from "../Page";
import { useEffect, useMemo, useState } from "react";
import MatchScoutData from "../MatchScoutData";
import { MatchStage, IntakeElement, IntakeLocations } from "../MatchConstants";
import MSAuto from "./matchscout/MSAuto";
import MSPrematch from "./matchscout/MSPrematch";
import MSPostmatch from "./matchscout/MSPostmatch";
import MSTeleop from "./matchscout/MSTeleop";
import CloseIcon from "@mui/icons-material/Close";
import Gambling from "./Gambling";
import { markAssignmentComplete, syncAssignmentsWithSubmittedMatches } from "./Assignments/AssignmentHelpers";

export default function MatchScout() {
    // Memoize the `data` object and pass in `setAlert`
    const [alert, setAlert] = useState({ open: false, message: "", severity: "success" });
    let data = useMemo(() => new MatchScoutData(setAlert), []);

    const [stage, setStage] = useState(data.stage);
    const [currentComponent, setCurrentComponent] = useState(<MSPrematch data={data} />);

    const handleStageChange = (newStage) => {
        data.stage = newStage;
        setStage(newStage);
    };

    useEffect(() => {
        switch (stage) {
            case MatchStage.PRE_MATCH:
                setCurrentComponent(<MSPrematch data={data} />);
                break;
            case MatchStage.AUTO:
                setCurrentComponent(<MSAuto data={data} handleStageChange={handleStageChange} />);
                break;
            case MatchStage.TELEOP:
                setCurrentComponent(<MSTeleop data={data} handleStageChange={handleStageChange} />);
                break;
            case MatchStage.POST_MATCH:
                setCurrentComponent(<MSPostmatch data={data} handleStageChange={handleStageChange} />);
                break;
            case MatchStage.GAMBLING:
                setCurrentComponent(<Gambling data={data} handleStageChange={handleStageChange} />);
                break;
        }
    }, [stage]);

    return (
        <Container>
            <Stack direction="column" spacing={2} mt={2} pb={6} align="center">
                <Typography color={"white"} variant={"h4"} sx={{ mt: 4 }}>
                    Match Scout
                </Typography>
                <Box>
                    <Typography variant={"h6"} sx={{ mt: -1 }}>
                        {Object.keys(MatchStage)[stage].replace("_", " ")}
                    </Typography>
                </Box>
                <Box>
                    <Divider sx={{ width: "75%", mt: 2, backgroundColor: '#bdbdbd' }} />
                </Box>

                {/* Alert is now controlled by React state */}
                <Collapse in={alert.open}>
                    <Alert
                        sx={{ mb: 0, mt: 2 }}
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

                {currentComponent}

                <Stack
                    direction={"row"}
                    spacing={2}
                    sx={{ my: stage == MatchStage.AUTO || stage == MatchStage.TELEOP ? 0.5 : 2 }}
                >
                    {stage == MatchStage.POST_MATCH && (
                        <Button fullWidth variant={"outlined"} onClick={() => handleStageChange(stage - 1)}>
                            Previous
                        </Button>
                    )}
                    {stage == MatchStage.PRE_MATCH && (
                        <Button
                            sx={{ width: "100%" }}
                            variant={"outlined"}
                            onClick={() => handleStageChange(stage + 1)}
                        >
                            Next
                        </Button>
                    )}
                    {stage === MatchStage.POST_MATCH && (
                        <Button
                            fullWidth
                            color={"success"}
                            variant={"outlined"}
                            onClick={async () => {
                                const scouterName = data.data[0]?.name;
                                const matchNumber = data.data[0]?.match;
                                
                                const success = await data.submit();
                                if (success) {
                                    // Mark assignment as complete
                                    if (scouterName && matchNumber) {
                                        await markAssignmentComplete(scouterName, parseInt(matchNumber));
                                        // Also sync with Firebase to verify submission
                                        await syncAssignmentsWithSubmittedMatches();
                                    }
                                    handleStageChange(stage + 2);
                                }
                            }}
                        >
                            Submit
                        </Button>
                    )}
                </Stack>
            </Stack>
        </Container>
    );
}
