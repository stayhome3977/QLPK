import { createContext, createElement, useContext, useMemo, useState } from "react";
import { api, clearAuthSession, hydrateAuthSession, storeAuthSession } from "./api/http";

const AuthContext = createContext(null);
const EMPTY_SESSION = { user: null, accessToken: null, refreshToken: null };

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    const storedSession = hydrateAuthSession();
    if (!storedSession?.user || !storedSession?.accessToken || !storedSession?.refreshToken) {
      clearAuthSession();
      return EMPTY_SESSION;
    }

    return storedSession;
  });

  const login = async (email, password) => {
    const { data } = await api.post("/api/v1/auth/login", { email, password });
    const nextSession = {
      user: data.user,
      accessToken: data.access_token,
      refreshToken: data.refresh_token
    };

    storeAuthSession(nextSession);
    setSession(nextSession);
    return data.user;
  };

  const logout = () => {
    clearAuthSession();
    setSession(EMPTY_SESSION);
  };

  const value = useMemo(
    () => ({
      user: session.user,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      isAuthenticated: Boolean(session.user),
      login,
      logout
    }),
    [session]
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
