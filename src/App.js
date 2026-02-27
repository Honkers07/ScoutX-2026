import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import NotFound from "./components/pages/NotFound";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { theme } from "./Theme";
import { Constants } from "./Constants";
import Header from "./components/Header";
import './firebase.js';

export default function App() {

  return (
    <>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Header />
        <BrowserRouter>
          <Routes>
            {Constants.pages.map((page) => (
              <Route key={page.path} path={page.path} element={<page.component />} />
            ))}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </>
  );
}
