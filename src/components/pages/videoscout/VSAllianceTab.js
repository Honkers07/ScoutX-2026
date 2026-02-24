import { Box, Typography, Stack, Button, CircularProgress, Alert, AlertTitle } from "@mui/material";
import { useState, useRef, useEffect, useCallback } from "react";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import VSVideoCrop from "./VSVideoCrop";


const AllianceStage = {
   UPLOAD: 0,
   CROP: 1,
   PROCESSING: 2,
   COMPLETE: 3,
};


export default function VSAllianceTab(props) {
   const {
       alliance,
       scoreTimeline,
       setScoreTimeline,
       totalScore,
       setTotalScore,
       videoFile,
       setVideoFile
   } = props;


   const [stage, setStage] = useState(AllianceStage.UPLOAD);
   const [videoPreview, setVideoPreview] = useState(null);
   const [processingStatus, setProcessingStatus] = useState("");
   const [error, setError] = useState(null);
   const videoRef = useRef(null);
   const timeoutIdsRef = useRef([]);


   const allianceColor = alliance === 'red' ? '#ef5350' : '#42a5f5';
   const allianceLabel = alliance === 'red' ? 'Red Alliance' : 'Blue Alliance';


   // Cleanup object URL on unmount or when videoPreview changes
   useEffect(() => {
       return () => {
           if (videoPreview) {
               URL.revokeObjectURL(videoPreview);
           }
       };
   }, [videoPreview]);


   // Cleanup timeouts on unmount
   useEffect(() => {
       return () => {
           timeoutIdsRef.current.forEach(id => clearTimeout(id));
           timeoutIdsRef.current = [];
       };
   }, []);


   // Helper to track timeouts for cleanup
   const setTimeoutTracked = useCallback((callback, delay) => {
       const id = setTimeout(callback, delay);
       timeoutIdsRef.current.push(id);
       return id;
   }, []);


   const handleVideoSelect = (event) => {
       const file = event.target.files[0];
       if (!file) return;
      
       // Validate file type
       if (!file.type.startsWith('video/')) {
           setError('Please select a valid video file (MP4, WebM, etc.)');
           return;
       }
      
       // Validate file size (max 500MB)
       const maxSize = 500 * 1024 * 1024;
       if (file.size > maxSize) {
           setError('Video file is too large. Maximum size is 500MB.');
           return;
       }
      
       try {
           // Revoke previous URL if exists
           if (videoPreview) {
               URL.revokeObjectURL(videoPreview);
           }
           setVideoFile(file);
           const url = URL.createObjectURL(file);
           setVideoPreview(url);
           setStage(AllianceStage.CROP);
           setError(null);
       } catch (err) {
           console.error('[VSAllianceTab] Error creating video preview:', err);
           setError('Failed to load video preview. Please try another file.');
       }
   };


   const handleCropConfirm = (cropData) => {
       // For now, we'll use the original video until FFmpeg cropping is implemented
       setStage(AllianceStage.PROCESSING);
       processVideo(videoFile, cropData);
   };


   const handleCropBack = () => {
       setStage(AllianceStage.UPLOAD);
       if (videoPreview) {
           URL.revokeObjectURL(videoPreview);
       }
       setVideoPreview(null);
       setVideoFile(null);
   };


   const processVideo = async (video, crop) => {
       // TODO: This is placeholder/mock processing code. Replace with actual backend API call.
       // See plans/video-processing-pipeline.md for the intended implementation.
       console.warn('[VSAllianceTab] Using mock video processing - replace with actual backend API');
      
       setProcessingStatus("Uploading video...");
       setError(null);
      
       try {
           // Simulated processing for now - using tracked timeouts for cleanup
           setTimeoutTracked(() => {
               setProcessingStatus("Extracting frames at 5fps...");
           }, 1000);


           setTimeoutTracked(() => {
               setProcessingStatus("Running OCR on frames...");
           }, 2000);


           setTimeoutTracked(() => {
               // Simulated score timeline data
               const mockTimeline = [
                   { timestamp: 0.00, score: 0, increment: 0 },
                   { timestamp: 5.20, score: 2, increment: 2 },
                   { timestamp: 12.40, score: 5, increment: 3 },
                   { timestamp: 18.60, score: 9, increment: 4 },
                   { timestamp: 25.00, score: 12, increment: 3 },
                   { timestamp: 32.80, score: 16, increment: 4 },
                   { timestamp: 40.20, score: 20, increment: 4 },
                   { timestamp: 48.60, score: 25, increment: 5 },
               ];
              
               setScoreTimeline(mockTimeline);
               setTotalScore(mockTimeline[mockTimeline.length - 1].score);
               setStage(AllianceStage.COMPLETE);
           }, 3000);
       } catch (err) {
           console.error('[VSAllianceTab] Processing error:', err);
           setError('Video processing failed. Please try again.');
           setStage(AllianceStage.CROP);
       }
   };


   const handleReset = () => {
       setStage(AllianceStage.UPLOAD);
       if (videoPreview) {
           URL.revokeObjectURL(videoPreview);
       }
       setVideoPreview(null);
       setVideoFile(null);
       setScoreTimeline([]);
       setTotalScore(0);
       setError(null);
       if (videoRef.current) {
           videoRef.current.value = "";
       }
   };


   const renderUploadStage = () => (
       <Box sx={{ width: "100%", mt: 2 }}>
           <Typography variant="h6" sx={{ mb: 2, color: allianceColor }}>
               Upload {allianceLabel} Scoreboard Video
           </Typography>
          
           <Box sx={{
               border: '2px dashed #ccc',
               borderRadius: 2,
               p: 4,
               textAlign: 'center',
               backgroundColor: 'rgba(255,255,255,0.05)',
               cursor: 'pointer',
               '&:hover': {
                   borderColor: allianceColor,
               }
           }}>
               <input
                   type="file"
                   accept="video/*"
                   ref={videoRef}
                   onChange={handleVideoSelect}
                   style={{ display: 'none' }}
                   id={`${alliance}-video-upload-input`}
               />
               <label htmlFor={`${alliance}-video-upload-input`} style={{ cursor: 'pointer' }}>
                   <Stack direction="column" alignItems="center" spacing={2}>
                       <CloudUploadIcon sx={{ fontSize: 48, color: allianceColor }} />
                       <Typography variant="body1" color="white">
                           Click to select {allianceLabel} video
                       </Typography>
                       <Typography variant="body2" color="text.secondary">
                           Video should show the {alliance} alliance score digits
                       </Typography>
                   </Stack>
               </label>
           </Box>
       </Box>
   );


   const renderCropStage = () => (
       <VSVideoCrop
           videoPreview={videoPreview}
           alliance={alliance}
           onConfirm={handleCropConfirm}
           onBack={handleCropBack}
       />
   );


   const renderProcessingStage = () => (
       <Box sx={{ width: "100%", mt: 2, textAlign: 'center' }}>
           <Typography variant="h6" sx={{ mb: 3, color: allianceColor }}>
               Processing {allianceLabel} Video
           </Typography>
          
           {/* Warning about mock processing */}
           <Alert severity="warning" sx={{ mb: 3, textAlign: 'left' }} icon={<WarningIcon />}>
               <AlertTitle>Simulated Processing</AlertTitle>
               Video processing backend is not yet connected. Using simulated data for demonstration purposes only.
           </Alert>
          
           <CircularProgress sx={{ color: allianceColor, mb: 2 }} />
           <Typography variant="body1" color="white">
               {processingStatus}
           </Typography>
       </Box>
   );


   const renderCompleteStage = () => (
       <Box sx={{ width: "100%", mt: 2 }}>
           <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
               <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 40 }} />
               <Typography variant="h6" sx={{ color: '#4caf50' }}>
                   {allianceLabel} Processing Complete
               </Typography>
           </Stack>


           <Box sx={{
               backgroundColor: 'rgba(255,255,255,0.1)',
               borderRadius: 2,
               p: 2,
               mb: 2
           }}>
               <Typography variant="subtitle1" color="white" sx={{ mb: 1 }}>
                   Total Score: <strong style={{ color: allianceColor }}>{totalScore}</strong>
               </Typography>
               <Typography variant="body2" color="text.secondary">
                   {scoreTimeline.length} score changes detected
               </Typography>
           </Box>


           <Box sx={{
               backgroundColor: 'rgba(255,255,255,0.05)',
               borderRadius: 2,
               p: 2,
               maxHeight: 200,
               overflow: 'auto'
           }}>
               <Typography variant="subtitle2" color="white" sx={{ mb: 1 }}>
                   Score Timeline:
               </Typography>
               {scoreTimeline.map((entry, index) => (
                   <Typography key={index} variant="body2" color="text.secondary">
                       {entry.timestamp.toFixed(2)}s: Score {entry.score} (+{entry.increment})
                   </Typography>
               ))}
           </Box>


           <Button
               variant="outlined"
               onClick={handleReset}
               sx={{ mt: 2 }}
               fullWidth
           >
               Re-process {allianceLabel} Video
           </Button>
       </Box>
   );


   return (
       <Box sx={{ width: "100%" }}>
           {error && (
               <Alert severity="error" sx={{ mb: 2 }}>
                   {error}
               </Alert>
           )}


           {stage === AllianceStage.UPLOAD && renderUploadStage()}
           {stage === AllianceStage.CROP && renderCropStage()}
           {stage === AllianceStage.PROCESSING && renderProcessingStage()}
           {stage === AllianceStage.COMPLETE && renderCompleteStage()}
       </Box>
   );
}
