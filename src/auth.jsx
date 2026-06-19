/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from "react";
import { api } from "./lib/api";
import { containsArabic } from "./lib/constants";

const AuthContext = createContext(null);
const STORAGE_KEY = "cinema_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; }
    catch { return null; }
  });

  const login = useCallback(async ({ email, displayName }) => {
    const name = (displayName || "").trim();
    // RTL "just works": if the name has Arabic letters, store the RTL flag.
    const isRtl = containsArabic(name);
    const { user: u } = await api.login({ email, displayName: name, isRtl });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
