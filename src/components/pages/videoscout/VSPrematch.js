import { useState } from "react";
import { Box, TextField, Stack, Button, Typography } from "@mui/material";


export default function VSPrematch(props) {
   const { data, handleNext } = props;
   const [counter, setCounter] = useState(0);


   const isFormComplete = data.get('scouterName') && data.get('match');


   const update = () => {
       setCounter(counter + 1);
   };


   return (
       <>
           <Stack spacing={3}>
               <TextField
                   label="Scouter Name"
                   variant="outlined"
                   value={data.get('scouterName') || ''}
                   onChange={(event) => {
                       data.set('scouterName', event.target.value)
                       update()
                   }}
                   fullWidth
                   margin="normal"
                   InputLabelProps={{ shrink: true }}
               />
               <TextField
                   label="Match Number"
                   type="number"
                   variant="outlined"
                   value={data.get('match') || ''}
                   onChange={(event) => {
                       const value = event.target.value;
                       // Only allow positive integers
                       if (value === '' || (parseInt(value) > 0 && Number.isInteger(Number(value)))) {
                           data.set('match', value);
                           update();
                       }
                   }}
                   fullWidth
                   margin="normal"
                   InputLabelProps={{ shrink: true }}
                   inputProps={{ min: 1, step: 1 }}
                   error={data.get('match') !== '' && data.get('match') !== undefined && parseInt(data.get('match')) < 1}
                   helperText={data.get('match') !== '' && data.get('match') !== undefined && parseInt(data.get('match')) < 1 ? "Match number must be at least 1" : ""}
               />


               <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                   After entering match info, you'll upload and process separate videos for each alliance's score digits.
               </Typography>


               <Button
                   variant="contained"
                   size="large"
                   onClick={handleNext}
                   disabled={!isFormComplete}
                   sx={{ mt: 2 }}
               >
                   Continue to Video Processing
               </Button>
           </Stack>
           <Box sx={{ my: 4 }}/>
       </>
   );
}
