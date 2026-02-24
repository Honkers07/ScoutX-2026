import { Alert, Button, Collapse, Divider, IconButton, Stack, Typography, Box, Container, Tabs, Tab, Paper } from "@mui/material";
import { useState, useRef } from "react";
import VideoScoutData from "../VideoScoutData";
import CloseIcon from "@mui/icons-material/Close";
import VSPrematch from "./videoscout/VSPrematch";
import VSAllianceTab from "./videoscout/VSAllianceTab";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import SendIcon from "@mui/icons-material/Send";


const VideoStage = {
   PRE_MATCH: 0,
   VIDEO_PROCESSING: 1,
};


export default function VideoScout() {
   const [alert, setAlert] = useState({ open: false, message: "", severity: "success" });
   const [dataKey, setDataKey] = useState(0); // Used to force re-creation of VSPrematch
   const dataRef = useRef(new VideoScoutData(setAlert));
  
   const [stage, setStage] = useState(VideoStage.PRE_MATCH);
   const [currentTab, setCurrentTab] = useState(0); // 0 = Red, 1 = Blue


   // Red alliance state
   const [redScoreTimeline, setRedScoreTimeline] = useState([]);
   const [redTotalScore, setRedTotalScore] = useState(0);
   const [redVideoFile, setRedVideoFile] = useState(null);


   // Blue alliance state
   const [blueScoreTimeline, setBlueScoreTimeline] = useState([]);
   const [blueTotalScore, setBlueTotalScore] = useState(0);
   const [blueVideoFile, setBlueVideoFile] = useState(null);


   const [isSubmitting, setIsSubmitting] = useState(false);


   const handleStageChange = (newStage) => {
       setStage(newStage);
   };


   const handleTabChange = (event, newValue) => {
       setCurrentTab(newValue);
   };


   const isRedComplete = redScoreTimeline.length > 0;
   const isBlueComplete = blueScoreTimeline.length > 0;
   const canSubmit = isRedComplete && isBlueComplete;


   const handleSubmit = async () => {
       if (!canSubmit) {
           setAlert({
               open: true,
               message: "Please process both Red and Blue alliance videos before submitting",
               severity: "error"
           });
           return;
       }


       setIsSubmitting(true);


       // Set the score timelines in the data object
       dataRef.current.set('redScoreTimeline', redScoreTimeline);
       dataRef.current.set('blueScoreTimeline', blueScoreTimeline);
       dataRef.current.set('redTotalScore', redTotalScore);
       dataRef.current.set('blueTotalScore', blueTotalScore);


       const success = await dataRef.current.submit();
      
       if (success) {
           // Reset all state
           dataRef.current = new VideoScoutData(setAlert);
           setDataKey(prev => prev + 1); // Force VSPrematch to re-render with new data
           setRedScoreTimeline([]);
           setRedTotalScore(0);
           setRedVideoFile(null);
           setBlueScoreTimeline([]);
           setBlueTotalScore(0);
           setBlueVideoFile(null);
           setCurrentTab(0);
           setStage(VideoStage.PRE_MATCH);
           setAlert({ open: true, message: "Data submitted successfully!", severity: "success" });
       }
      
       setIsSubmitting(false);
   };


   const TabIcon = ({ isComplete, color }) => (
       isComplete ?
           <CheckCircleIcon sx={{ color: '#4caf50', mr: 1 }} /> :
           <RadioButtonUncheckedIcon sx={{ color: color, mr: 1 }} />
   );


   return (
       <Container>
           <Stack direction="column" spacing={2} mt={2} pb={6} align="center">
               <Typography color={"white"} variant={"h4"} sx={{ mt: 4 }}>
                   Video Scout
               </Typography>
               <Box>
                   <Typography variant={"h6"} sx={{ mt: -1 }}>
                       {stage === VideoStage.PRE_MATCH ? "Match Information" : "Video Processing"}
                   </Typography>
               </Box>
               <Box>
                   <Divider sx={{ width: "75%", mt: 2, backgroundColor: '#bdbdbd' }} />
               </Box>


               {/* Alert */}
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


               {/* Current Stage Component */}
               {stage === VideoStage.PRE_MATCH && (
                   <VSPrematch
                       key={dataKey}
                       data={dataRef.current}
                       handleNext={() => handleStageChange(VideoStage.VIDEO_PROCESSING)}
                   />
               )}


               {stage === VideoStage.VIDEO_PROCESSING && (
                   <>
                       {/* Tabs for Red and Blue Alliance */}
                       <Paper sx={{ width: '100%', mt: 2 }}>
                           <Tabs
                               value={currentTab}
                               onChange={handleTabChange}
                               variant="fullWidth"
                               sx={{
                                   '& .MuiTabs-indicator': {
                                       backgroundColor: currentTab === 0 ? '#ef5350' : '#42a5f5',
                                   },
                               }}
                           >
                               <Tab
                                   icon={<TabIcon isComplete={isRedComplete} color="#ef5350" />}
                                   iconPosition="start"
                                   label="Red Alliance"
                                   sx={{
                                       color: isRedComplete ? '#4caf50' : '#ef5350',
                                       '&.Mui-selected': { color: '#ef5350' },
                                   }}
                               />
                               <Tab
                                   icon={<TabIcon isComplete={isBlueComplete} color="#42a5f5" />}
                                   iconPosition="start"
                                   label="Blue Alliance"
                                   sx={{
                                       color: isBlueComplete ? '#4caf50' : '#42a5f5',
                                       '&.Mui-selected': { color: '#42a5f5' },
                                   }}
                               />
                           </Tabs>
                       </Paper>


                       {/* Tab Content */}
                       <Box sx={{ width: '100%' }}>
                           {currentTab === 0 && (
                               <VSAllianceTab
                                   alliance="red"
                                   scoreTimeline={redScoreTimeline}
                                   setScoreTimeline={setRedScoreTimeline}
                                   totalScore={redTotalScore}
                                   setTotalScore={setRedTotalScore}
                                   videoFile={redVideoFile}
                                   setVideoFile={setRedVideoFile}
                               />
                           )}
                           {currentTab === 1 && (
                               <VSAllianceTab
                                   alliance="blue"
                                   scoreTimeline={blueScoreTimeline}
                                   setScoreTimeline={setBlueScoreTimeline}
                                   totalScore={blueTotalScore}
                                   setTotalScore={setBlueTotalScore}
                                   videoFile={blueVideoFile}
                                   setVideoFile={setBlueVideoFile}
                               />
                           )}
                       </Box>


                       {/* Status Summary */}
                       <Paper sx={{ p: 2, mt: 2, backgroundColor: 'rgba(255,255,255,0.05)' }}>
                           <Typography variant="subtitle2" color="white" sx={{ mb: 1 }}>
                               Processing Status:
                           </Typography>
                           <Stack direction="row" spacing={3}>
                               <Stack direction="row" alignItems="center">
                                   <TabIcon isComplete={isRedComplete} color="#ef5350" />
                                   <Typography variant="body2" color="white">
                                       Red: {isRedComplete ? `${redTotalScore} points` : 'Not complete'}
                                   </Typography>
                               </Stack>
                               <Stack direction="row" alignItems="center">
                                   <TabIcon isComplete={isBlueComplete} color="#42a5f5" />
                                   <Typography variant="body2" color="white">
                                       Blue: {isBlueComplete ? `${blueTotalScore} points` : 'Not complete'}
                                   </Typography>
                               </Stack>
                           </Stack>
                       </Paper>


                       {/* Submit Button */}
                       <Button
                           color={"success"}
                           variant={"contained"}
                           startIcon={isSubmitting ? null : <SendIcon />}
                           onClick={handleSubmit}
                           disabled={!canSubmit || isSubmitting}
                           fullWidth
                           size="large"
                           sx={{ mt: 2 }}
                       >
                           {isSubmitting ? "Submitting..." : "Submit to Firebase"}
                       </Button>


                       {/* Back Button */}
                       <Button
                           variant="outlined"
                           onClick={() => handleStageChange(VideoStage.PRE_MATCH)}
                           fullWidth
                           sx={{ mt: 1 }}
                       >
                           Back to Match Info
                       </Button>
                   </>
               )}
           </Stack>
           <Box sx={{ my: 4 }}/>
       </Container>
   );
}
