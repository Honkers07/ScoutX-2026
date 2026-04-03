import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, collection, getDocs, deleteDoc } from "firebase/firestore";
import firebase from "../firebase";
import { saveScouterPool } from "./pages/Assignments/AssignmentHelpers";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing session on app load
  useEffect(() => {
    const checkUserSession = async () => {
      const savedUser = localStorage.getItem("scoutx_user");
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          // Verify user still exists in Firestore
          const scouterRef = doc(firebase, "scouters", userData.id);
          const scouterSnap = await getDoc(scouterRef);
          
          if (scouterSnap.exists()) {
            setUser({ id: userData.id, ...scouterSnap.data() });
          } else {
            // User no longer exists, clear session
            localStorage.removeItem("scoutx_user");
          }
        } catch (err) {
          console.error("Error verifying session:", err);
          localStorage.removeItem("scoutx_user");
        }
      }
      setLoading(false);
    };

    checkUserSession();
  }, []);

  // Login or register a scouter
  const login = async (name, teamNumber) => {
    setError(null);
    setLoading(true);

    try {
      const teamNum = parseInt(teamNumber);
      
      if (!name || !teamNumber) {
        throw new Error("Name and team number are required");
      }

      // Trim the name to remove accidental whitespace
      const trimmedName = name.trim();
      
      if (!trimmedName) {
        throw new Error("Name cannot be empty or just whitespace");
      }

      // First, check if scouter already exists
      const scouterId = `${teamNum}_${trimmedName.toLowerCase().replace(/\s+/g, "_")}`;
      const scouterRef = doc(firebase, "scouters", scouterId);
      const scouterSnap = await getDoc(scouterRef);

      if (scouterSnap.exists()) {
        // Scouter exists, log them in
        const userData = { id: scouterId, ...scouterSnap.data() };
        setUser(userData);
        localStorage.setItem("scoutx_user", JSON.stringify(userData));
        setLoading(false);
        return { success: true, isNewUser: false };
      }

      // Create new scouter and team if needed
      // Check if team exists
      const teamRef = doc(firebase, "teams", teamNum.toString());
      const teamSnap = await getDoc(teamRef);

      let teamData;
      if (!teamSnap.exists()) {
        // Create new team
        teamData = {
          teamNumber: teamNum,
          scouters: [trimmedName],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(teamRef, teamData);
      } else {
        // Add scouter to existing team
        const existingTeam = teamSnap.data();
        if (!existingTeam.scouters || !existingTeam.scouters.includes(trimmedName)) {
          await updateDoc(teamRef, {
            scouters: arrayUnion(trimmedName),
            updatedAt: serverTimestamp(),
          });
        }
        teamData = existingTeam;
      }

      // Create scouter record
      const newScouter = {
        name: trimmedName,
        teamNumber: teamNum,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      };
      
      await setDoc(scouterRef, newScouter);

      const userData = { id: scouterId, ...newScouter };
      setUser(userData);
      localStorage.setItem("scoutx_user", JSON.stringify(userData));
      setLoading(false);
      return { success: true, isNewUser: true };
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message);
      setLoading(false);
      return { success: false, error: err.message };
    }
  };

  // Logout
  const logout = () => {
    setUser(null);
    localStorage.removeItem("scoutx_user");
  };

  // Update scouter's last login time
  const updateLastLogin = async () => {
    if (user && user.id) {
      try {
        const scouterRef = doc(firebase, "scouters", user.id);
        await updateDoc(scouterRef, {
          lastLogin: serverTimestamp(),
        });
      } catch (err) {
        console.error("Error updating last login:", err);
      }
    }
  };

  // Get all registered teams
  const getAllTeams = useCallback(async () => {
    try {
      const teamsRef = collection(firebase, "teams");
      const teamsSnap = await getDocs(teamsRef);
      
      const teams = [];
      teamsSnap.forEach((doc) => {
        teams.push({ id: doc.id, ...doc.data() });
      });
      
      return teams.sort((a, b) => a.teamNumber - b.teamNumber);
    } catch (err) {
      console.error("Error getting all teams:", err);
      return [];
    }
  }, []);

  // Add a new scouter to a team's scouter pool
  const addScouter = async (scouterName, teamNumber) => {
    try {
      const teamRef = doc(firebase, "teams", teamNumber.toString());
      const teamSnap = await getDoc(teamRef);
      
      if (!teamSnap.exists()) {
        // Create new team with scouter
        await setDoc(teamRef, {
          teamNumber: parseInt(teamNumber),
          scouters: [scouterName],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        // Add scouter to existing team
        await updateDoc(teamRef, {
          scouters: arrayUnion(scouterName),
          updatedAt: serverTimestamp(),
        });
      }
      
      // Also create scouter document
      const scouterId = `${teamNumber}_${scouterName.toLowerCase().replace(/\s+/g, "_")}`;
      const scouterRef = doc(firebase, "scouters", scouterId);
      await setDoc(scouterRef, {
        name: scouterName,
        teamNumber: parseInt(teamNumber),
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });
      
      return { success: true };
    } catch (err) {
      console.error("Error adding scouter:", err);
      return { success: false, error: err.message };
    }
  };

  // Get team scouter pool
  const getTeamScouters = async (teamNumber) => {
    try {
      const teamRef = doc(firebase, "teams", teamNumber.toString());
      const teamSnap = await getDoc(teamRef);
      
      if (teamSnap.exists()) {
        return teamSnap.data().scouters || [];
      }
      return [];
    } catch (err) {
      console.error("Error getting team scouters:", err);
      return [];
    }
  };

  // Check if name is in team's scouter pool
  const isInScouterPool = async (name, teamNumber) => {
    const scouters = await getTeamScouters(teamNumber);
    return scouters.some(s => s.toLowerCase() === name.toLowerCase());
  };

   // Remove a scouter from a team's scouter pool
   const removeScouter = async (scouterName, teamNumber) => {
     try {
       const teamRef = doc(firebase, "teams", teamNumber.toString());
       await updateDoc(teamRef, {
         scouters: arrayRemove(scouterName),
         updatedAt: serverTimestamp(),
       });
       
       // Also delete the scouter document
       const scouterId = `${teamNumber}_${scouterName.toLowerCase().replace(/\s+/g, "_")}`;
       const scouterRef = doc(firebase, "scouters", scouterId);
       await deleteDoc(scouterRef);
       
       // Update localStorage scouter pool
       const currentScouters = await getTeamScouters(teamNumber);
       saveScouterPool(currentScouters, teamNumber);
       
       return { success: true };
     } catch (err) {
       console.error("Error removing scouter:", err);
       return { success: false, error: err.message };
     }
   };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    updateLastLogin,
    getTeamScouters,
    getAllTeams,
    isInScouterPool,
    removeScouter,
    addScouter,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;