import {Box, Container, IconButton} from "@mui/material";
import HomeIcon from '@mui/icons-material/Home';


export default function Header() {


    if (window.location.pathname === "/") return (<Box sx={{
        my: 7,
    }}/>)


    return (
        <Container maxWidth={"md"} sx={{
            mt: 1,
            mb: -2,
            display: "flex",
            justifyContent: "flex-end",
        }}>
            <IconButton onClick={(event) => {
                window.location.href = "/"
            }}>
                <HomeIcon size={"large"}/>
            </IconButton>
        </Container>
    )


}

