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
       stage: stageProp,
       setStage: setStageProp,
       scoreTimeline,
       setScoreTimeline,
       totalScore,
       setTotalScore,
       videoFile,
       setVideoFile,
       videoPreview: videoPreviewProp,
       setVideoPreview: setVideoPreviewProp,
       dataRef
   } = props;

   // Use props for stage if provided, otherwise use local state
   const [stage, setStageLocal] = useState(stageProp !== undefined ? stageProp : AllianceStage.UPLOAD);
   const [videoPreview, setVideoPreview] = useState(videoPreviewProp || null);
   const [processingStatus, setProcessingStatus] = useState("");
   const [progress, setProgress] = useState(0); // 0-100 for progress bar
   const [error, setError] = useState(null);
   const videoRef = useRef(null);
   const timeoutIdsRef = useRef([]);

   // Sync videoPreview with parent when prop changes
   useEffect(() => {
       if (videoPreviewProp !== undefined) {
           setVideoPreview(videoPreviewProp);
       }
   }, [videoPreviewProp]);

   // Sync stage with parent prop
   useEffect(() => {
       if (stageProp !== undefined) {
           setStageLocal(stageProp);
       }
   }, [stageProp]);

   // Update parent when stage changes
   const handleSetStage = (newStage) => {
       setStageLocal(newStage);
       if (setStageProp) {
           setStageProp(newStage);
       }
   };

   // Persist stage to sessionStorage for this alliance
   const storageKey = `vsAllianceTab_${alliance}_stage`;
   
   useEffect(() => {
       // Load stage from sessionStorage on mount
       const savedStage = sessionStorage.getItem(storageKey);
       if (savedStage !== null) {
           const parsed = parseInt(savedStage, 10);
           if (!isNaN(parsed)) {
               handleSetStage(parsed);
           }
       }
   }, []);

   useEffect(() => {
       // Save stage to sessionStorage when it changes
       sessionStorage.setItem(storageKey, stage.toString());
   }, [stage, storageKey]);

   // Handle orientation change - prevent data loss
   useEffect(() => {
       const handleOrientationChange = () => {
           console.log('[VSAllianceTab] Orientation changed for', alliance);
       };
       
       window.addEventListener('orientationchange', handleOrientationChange);
       window.addEventListener('resize', handleOrientationChange);
       
       return () => {
           window.removeEventListener('orientationchange', handleOrientationChange);
           window.removeEventListener('resize', handleOrientationChange);
       };
   }, [alliance]);


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
            // Also sync with parent if prop provided
            if (setVideoPreviewProp) {
                setVideoPreviewProp(url);
            }
           handleSetStage(AllianceStage.CROP);
           setError(null);
       } catch (err) {
           console.error('[VSAllianceTab] Error creating video preview:', err);
           setError('Failed to load video preview. Please try another file.');
       }
   };


   const handleCropConfirm = (cropData) => {
       // For now, we'll use the original video until FFmpeg cropping is implemented
       handleSetStage(AllianceStage.PROCESSING);
       processVideo(videoFile, cropData);
   };


   const handleCropBack = () => {
       handleSetStage(AllianceStage.UPLOAD);
       if (videoPreview) {
           URL.revokeObjectURL(videoPreview);
       }
       setVideoPreview(null);
       setVideoFile(null);
   };


   const processVideo = async (video, crop) => {
      // Send video + crop coordinates to backend for FFmpeg processing and OCR
      console.log('[VSAllianceTab] Sending video to backend for processing with crop:', crop);
      
      setProcessingStatus("Processing video...");
      setError(null);
      setProgress(0);
      
      let progressValue = 0;
      const progressInterval = setInterval(() => {
         progressValue = Math.min(progressValue + 2, 90);
         setProgress(progressValue);
         setProcessingStatus(`${progressValue}%`);
      }, 500);
      
      try {
         // Create FormData to send video file and crop coordinates
         const formData = new FormData();
         formData.append('video', video);
         formData.append('cropX', crop.x);
         formData.append('cropY', crop.y);
         formData.append('cropWidth', crop.width);
         formData.append('cropHeight', crop.height);
         formData.append('alliance', alliance);
         
         // Backend URL
         const backendUrl = 'http://localhost:5001/api/process-video';
         
         const response = await fetch(backendUrl, {
            method: 'POST',
            body: formData
         });
         
         clearInterval(progressInterval);
         
         if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
         }
         
         const result = await response.json();
         
         if (result.error) {
            throw new Error(result.error);
         }
         
         setProcessingStatus(`Extracted ${result.scoresRead} scores from ${result.framesProcessed} frames`);
         setProgress(100);
         
         setScoreTimeline(result.scoreTimeline);
         setTotalScore(result.totalScore);
         handleSetStage(AllianceStage.COMPLETE);
         
      } catch (err) {
         clearInterval(progressInterval);
         console.error('[VSAllianceTab] Processing error:', err);
         setError('Video processing failed. Please try again.');
         handleSetStage(AllianceStage.CROP);
      }
   };


   const handleReset = () => {
       handleSetStage(AllianceStage.UPLOAD);
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
           
           <CircularProgress variant="determinate" value={progress} size={80} sx={{ color: allianceColor, mb: 2 }} />
           <Typography variant="h6" color="white">
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
