import React from 'react';
import {Avatar, Divider, List, ListItem, ListItemAvatar, ListItemText, Stack, Typography, Box } from '@mui/material';
import Grid2 from "@mui/material/Unstable_Grid2";
import Page from "../Page";
import {Constants} from "../../Constants";

const Credits = () => {

    return (
        <Box
        sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 4,
          }}
        >
            <Stack direction="column" spacing={4}>
            <Typography variant={"h3"}>
                Credits
            </Typography>
            <Typography variant={"h5"}>
                First off, thanks to all of the scouters! This app would be pointless without you.
            </Typography>
            <Divider sx={{
                my: 2
            }}/>
            <Grid2 container spacing={2}>
                <Grid2 xs={12} sm={6}>
                    <Stack direction={"column"} spacing={0.5}>
                        <Typography variant={"h5"}>
                            2026 Development Team
                        </Typography>
                        <List dense>
                            {Constants.developers.map((developer) => {
                                return (
                                    <ListItem
                                        key={developer.name}
                                    >
                                        <ListItemAvatar>
                                            <Avatar src={developer.icon}/>
                                        </ListItemAvatar>
                                        <ListItemText id={developer.name} primary={developer.name}
                                                      primaryTypographyProps={{
                                                          fontSize: 20
                                                      }} secondary={developer.year} secondaryTypographyProps={{
                                            fontSize: 15
                                        }}/>
                                    </ListItem>
                                )
                            })}
                        </List>
                    </Stack>
                </Grid2>
                <Grid2 xs={12} sm={6}>
                    <Stack direction={"column"} spacing={0.5}>
                        <Typography variant={"h5"}>
                            Special Thanks to
                        </Typography>
                        <List dense>
                            {Constants.specialThanks.map((thanks) => {
                                return (
                                    <ListItem
                                        key={thanks.name}
                                    >
                                        <ListItemText primaryTypographyProps={{
                                            fontSize: 20
                                        }} id={thanks.name} primary={thanks.name} secondary={thanks.description}
                                                      secondaryTypographyProps={{
                                                          fontSize: 15
                                                      }}/>
                                    </ListItem>
                                )
                            })}
                        </List>
                    </Stack>
                </Grid2>
            </Grid2>
            <Divider sx={{
                my: 2
            }}/>
            <Typography component={"h4"} variant={"h4"} sx={{
                mb: 2,
            }}>
                Past Development Teams
            </Typography>
            <Grid2 container spacing={2}>
                {Constants.previousYears.map((year) => {
                    return (
                        <Grid2 xs={6} sm={4}>
                            <Stack direction={"column"} spacing={0.5}>
                                <Typography variant={"h5"}>
                                    {year.year}
                                </Typography>
                                <List dense>
                                    {year.developers.map((developer) => {
                                        return (
                                            <ListItem
                                                key={developer}
                                            >
                                                <ListItemText primaryTypographyProps={{
                                                    fontSize: 16
                                                }} id={developer} primary={developer}/>
                                            </ListItem>
                                        )
                                    })}
                                </List>
                            </Stack>
                        </Grid2>
                    )
                })}
            </Grid2>
            </Stack>
        </Box>
    );
};

export default Credits;
