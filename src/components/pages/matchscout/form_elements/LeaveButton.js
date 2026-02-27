import { Box, Button } from "@mui/material";
import Grid2 from "@mui/material/Unstable_Grid2";
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';

export default function LeaveButton({ label, onClick, value, showCheckbox, sx }) {
    return (
        <Grid2 xs={12} sx={sx}>
            <Button
                variant={value ? "contained" : "outlined"}
                color={!showCheckbox ? "primary" : "inherit"}
                onClick={() => {
                    onClick(!value);
                }}
                fullWidth
                sx={{
                    height: '40px'
                }}
            >
                {showCheckbox ? (
                    value ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />
                ) : null}
                <Box  />
                {label}
            </Button>
        </Grid2>
    );
}