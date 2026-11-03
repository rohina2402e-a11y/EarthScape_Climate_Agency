import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest, clearSession } from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authMessage, setAuthMessage] = useState("");

  useEffect(() => {
    let active = true;

    if (!sessionStorage.getItem("earthscapeToken")) {
      setCheckingSession(false);
      return () => {
        active = false;
      };
    }

    apiRequest("/api/auth/me")
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser);
      })
      .catch((error) => {
        if (!active) return;
        clearSession();
        if (error.status === 401) {
          setAuthMessage("Your session expired. Please sign in again.");
        } else {
          setAuthMessage(error.message);
        }
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const signOut = useCallback(async () => {
    let message = "";
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch (error) {
      if (error.status !== 401) {
        message = `Signed out on this device, but server logout could not be confirmed: ${error.message}`;
      }
    } finally {
      clearSession();
      setUser(null);
      setAuthMessage(message);
    }
  }, []);

  const clearLocalSession = useCallback((message = "") => {
    clearSession();
    setUser(null);
    setAuthMessage(message);
  }, []);

  const value = useMemo(() => ({
    user,
    setUser,
    checkingSession,
    authMessage,
    setAuthMessage,
    signOut,
    clearLocalSession
  }), [user, checkingSession, authMessage, signOut, clearLocalSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside an AuthProvider.");
  return context;
}
