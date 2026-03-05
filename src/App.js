import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import NotFound from "./components/pages/NotFound";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { theme } from "./Theme";
import { Constants } from "./Constants";
import Header from "./components/Header";
import { fuelListener } from "./components/UpdateMatchData";
import "./firebase.js";

export default function App() {
  // Enable the fuel listener - runs automatically in background when app is open
  useEffect(() => {
    const unsubscribe = fuelListener();
    return () => unsubscribe();
  }, []);

  return (
    <>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Header />
        <BrowserRouter>
          <Routes>
            {Constants.pages.map((page) => (
              <Route
                key={page.path}
                path={page.path}
                element={<page.component />}
              />
            ))}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </>
  );
}
