import { Box, Container, IconButton, Typography, Button } from "@mui/material";
import HomeIcon from '@mui/icons-material/Home';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate, useLocation } from "react-router-dom";

export default function Header({ user, onLogout }) {
    const navigate = useNavigate();
    const location = useLocation();
    const isLoginPage = location.pathname === "/login";

    if (window.location.pathname === "/") return (<Box sx={{
        my: 7,
    }}/>)

    return (
        <Container maxWidth={"md"} sx={{
            mt: 1,
            mb: -2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
        }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {user && (
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Typography variant="body2" color="text.secondary">
                            {user.name} (Team {user.teamNumber})
                        </Typography>
                    </Box>
                )}
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <IconButton onClick={(event) => {
                    navigate("/")
                }}>
                    <HomeIcon size={"large"}/>
                </IconButton>
                {user && !isLoginPage && (
                    <IconButton onClick={onLogout} color="error" title="Logout">
                        <LogoutIcon size={"large"}/>
                    </IconButton>
                )}
            </Box>
        </Container>
    )

}