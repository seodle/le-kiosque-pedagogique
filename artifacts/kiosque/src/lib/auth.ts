import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const TOKEN_KEY = "kiosque_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function decodeToken(token: string): any {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch (e) {
    return null;
  }
}

export function getUserRole(): string | null {
  const token = getToken();
  if (!token) return null;
  const decoded = decodeToken(token);
  return decoded?.role || null;
}

export function useAuth() {
  const [role, setRole] = useState<string | null>(getUserRole());
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const handleStorageChange = () => {
      setRole(getUserRole());
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const login = (token: string, redirectPath?: string) => {
    setToken(token);
    const newRole = getUserRole();
    setRole(newRole);
    if (redirectPath) {
      setLocation(redirectPath);
    } else {
      switch (newRole) {
        case "n1": setLocation("/n1"); break;
        case "n2": setLocation("/n2"); break;
        case "rd": setLocation("/tableau-rd"); break;
        case "pg": setLocation("/tableau-pg"); break;
        case "admin": setLocation("/admin"); break;
        default: setLocation("/mon-ticket"); break;
      }
    }
  };

  const logout = () => {
    removeToken();
    setRole(null);
    setLocation("/");
  };

  return { role, login, logout, isAuthenticated: !!role };
}
