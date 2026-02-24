import { Box, TextField, Button, Stack, Typography } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";


export default function VSVideoUpload(props) {
   const { data, handleBack, handleSubmit, videoPreview, handleVideoSelect, videoRef } = props;


   return (
       <>
           {/* Video Upload Section */}
           <Box sx={{ width: "100%", mt: 2 }}>
               <Typography variant="h6" sx={{ mb: 2 }}>
                   Upload Match Video
               </Typography>
              
               <Box sx={{
                   border: '2px dashed #ccc',
                   borderRadius: 2,
                   p: 4,
                   textAlign: 'center',
                   backgroundColor: 'rgba(255,255,255,0.05)',
                   cursor: 'pointer',
                   '&:hover': {
                       borderColor: '#FF9800',
                   }
               }}>
                   <input
                       type="file"
                       accept="video/*"
                       ref={videoRef}
                       onChange={handleVideoSelect}
                       style={{ display: 'none' }}
                       id="video-upload-input"
                   />
                   <label htmlFor="video-upload-input" style={{ cursor: 'pointer' }}>
                       <Stack direction="column" alignItems="center" spacing={2}>
                           <CloudUploadIcon sx={{ fontSize: 48, color: '#FF9800' }} />
                           <Typography variant="body1" color="white">
                               Click to select a video file
                           </Typography>
                           <Typography variant="body2" color="text.secondary">
                               Supports MP4, MOV, and other video formats
                           </Typography>
                       </Stack>
                   </label>
               </Box>
           </Box>


           {/* Video Preview */}
           {videoPreview && (
               <Box sx={{ width: "100%", mt: 2 }}>
                   <Typography variant="h6" sx={{ mb: 2 }}>
                       Video Preview
                   </Typography>
                   <video
                       controls
                       style={{ width: '100%', maxHeight: 300, borderRadius: 8 }}
                       src={videoPreview}
                   />
               </Box>
           )}


           {/* Notes */}
           <Box sx={{ width: "100%", mt: 3 }}>
               <Typography variant="subtitle2" color="white" sx={{ mb: 1 }}>
                   Notes (Optional)
               </Typography>
               <TextField
                   variant="outlined"
                   multiline
                   rows={3}
                   value={data.get('notes')}
                   onChange={(event) => data.set('notes', event.target.value)}
                   fullWidth
                   placeholder="Add any notes about this match..."
               />
           </Box>


           {/* Navigation Buttons */}
           <Stack direction="row" spacing={2} sx={{ mt: 3, width: "100%" }}>
               <Button
                   variant="outlined"
                   startIcon={<ArrowBackIcon />}
                   onClick={handleBack}
                   fullWidth
               >
                   Back
               </Button>
               <Button
                   color={"success"}
                   variant={"contained"}
                   startIcon={<VideoLibraryIcon />}
                   onClick={handleSubmit}
                   fullWidth
                   size="large"
               >
                   Submit
               </Button>
           </Stack>
           <Box sx={{ my: 4 }}/>
       </>
   );
}
