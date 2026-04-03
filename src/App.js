import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import NotFound from "./components/pages/NotFound";
import { CssBaseline, ThemeProvider, Box } from "@mui/material";
import { theme } from "./Theme";
import { Constants } from "./Constants";
import Header from "./components/Header";
import { fuelListener } from "./components/UpdateMatchData";
import { AuthProvider, useAuth } from "./components/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./components/pages/Login";
import "./firebase.js";

// Inner component that uses auth context
function AppContent() {
  const { user, logout } = useAuth();
  
  // Enable the fuel listener - runs automatically in background when app is open
  useEffect(() => {
    const unsubscribe = fuelListener();
    return () => unsubscribe();
  }, []);

  return (
    <>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Header user={user} onLogout={logout} />
        <Routes>
          {/* Login page is public */}
          <Route path="/login" element={<Login />} />
          
          {/* All other pages require authentication */}
          {Constants.pages.map((page) => (
            <Route
              key={page.path}
              path={page.path}
              element={
                <ProtectedRoute>
                  <page.component />
                </ProtectedRoute>
              }
            />
          ))}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ThemeProvider>
    </>
  );
}

// Main App component with AuthProvider wrapper
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
