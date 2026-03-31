import { createContext, createElement, useContext, useMemo, useState } from "react";
import { api, clearAccessToken, setAccessToken } from "./api/http";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState({
    user: null,
    accessToken: null,
    refreshToken: null
  });

  const login = async (email, password) => {
    const { data } = await api.post("/api/v1/auth/login", { email, password });
    setSession({
      user: data.user,
      accessToken: data.access_token,
      refreshToken: data.refresh_token
    });
    setAccessToken(data.access_token);
    return data.user;
  };

  const logout = () => {
    clearAccessToken();
    setSession({ user: null, accessToken: null, refreshToken: null });
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
