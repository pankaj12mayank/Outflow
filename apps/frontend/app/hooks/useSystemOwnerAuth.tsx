"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import api from "@/app/lib/api";

interface SystemOwnerUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  last_login_at?: string;
  last_login_ip?: string;
  mfa_enabled: boolean;
}

interface SystemOwnerAuthState {
  user: SystemOwnerUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface SystemOwnerAuthContextType extends SystemOwnerAuthState {
  login: (email: string, password: string, deviceInfo?: any) => Promise<void>;
  logout: (allDevices?: boolean) => Promise<void>;
  refreshToken: () => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  getSessions: () => Promise<any[]>;
  revokeSession: (sessionId: string) => Promise<void>;
  getDevices: () => Promise<any[]>;
  trustDevice: (deviceId: string) => Promise<void>;
  getAuthLogs: () => Promise<any[]>;
  getActivityLogs: () => Promise<any[]>;
}

const SystemOwnerAuthContext = createContext<SystemOwnerAuthContextType | undefined>(undefined);

export function SystemOwnerAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<SystemOwnerAuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("system_owner_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const checkAuth = async () => {
    const token = localStorage.getItem("system_owner_token");
    const refreshToken = localStorage.getItem("system_owner_refresh_token");

    if (!token || !refreshToken) {
      setState({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const response = await api.get("/api/v1/system-owner-auth/me", {
        headers: getAuthHeaders(),
      });
      
      setState({
        user: response.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      if (error.response?.status === 401) {
        const refreshed = await refreshTokenFn(refreshToken);
        if (refreshed) {
          await checkAuth();
        } else {
          clearAuth();
        }
      } else {
        clearAuth();
      }
    }
  };

  const refreshTokenFn = async (refresh: string): Promise<boolean> => {
    try {
      const response = await api.post("/api/v1/system-owner-auth/refresh", {
        refresh_token: refresh,
      });
      
      localStorage.setItem("system_owner_token", response.data.access_token);
      localStorage.setItem("system_owner_refresh_token", response.data.refresh_token);
      
      return true;
    } catch (error) {
      return false;
    }
  };

  const clearAuth = () => {
    localStorage.removeItem("system_owner_token");
    localStorage.removeItem("system_owner_refresh_token");
    setState({ user: null, isAuthenticated: false, isLoading: false });
  };

  const login = async (email: string, password: string, deviceInfo?: any) => {
    const response = await api.post("/api/v1/system-owner-auth/login", {
      email,
      password,
      device_info: deviceInfo,
    });

    const { tokens } = response.data;
    
    localStorage.setItem("system_owner_token", tokens.access_token);
    localStorage.setItem("system_owner_refresh_token", tokens.refresh_token);

    setState({
      user: response.data.user,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const logout = async (allDevices: boolean = false) => {
    const token = localStorage.getItem("system_owner_token");
    clearAuth();
    try {
      if (token) {
        await api.post(
          "/api/v1/system-owner-auth/logout",
          { all_devices: allDevices },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch {
      // ignore logout API errors - we already cleared local auth
    } finally {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem("system_owner_refresh_token");
    if (!refreshToken) return false;
    
    return await refreshTokenFn(refreshToken);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await api.post(
      "/api/v1/system-owner-auth/change-password",
      {
        current_password: currentPassword,
        new_password: newPassword,
      },
      { headers: getAuthHeaders() }
    );
  };

  const getSessions = async (): Promise<any[]> => {
    const response = await api.get("/api/v1/system-owner-auth/sessions", {
      headers: getAuthHeaders(),
    });
    return response.data.sessions;
  };

  const revokeSession = async (sessionId: string) => {
    await api.delete(`/api/v1/system-owner-auth/sessions/${sessionId}`, {
      headers: getAuthHeaders(),
    });
  };

  const getDevices = async (): Promise<any[]> => {
    const response = await api.get("/api/v1/system-owner-auth/devices", {
      headers: getAuthHeaders(),
    });
    return response.data;
  };

  const trustDevice = async (deviceId: string) => {
    await api.post(
      `/api/v1/system-owner-auth/devices/${deviceId}/trust`,
      {},
      { headers: getAuthHeaders() }
    );
  };

  const getAuthLogs = async (): Promise<any[]> => {
    const response = await api.get("/api/v1/system-owner-auth/auth-logs", {
      headers: getAuthHeaders(),
    });
    return response.data.logs;
  };

  const getActivityLogs = async (): Promise<any[]> => {
    const response = await api.get("/api/v1/system-owner-auth/activity-logs", {
      headers: getAuthHeaders(),
    });
    return response.data.logs;
  };

  return (
    <SystemOwnerAuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshToken,
        changePassword,
        getSessions,
        revokeSession,
        getDevices,
        trustDevice,
        getAuthLogs,
        getActivityLogs,
      }}
    >
      {children}
    </SystemOwnerAuthContext.Provider>
  );
}

export function useSystemOwnerAuth() {
  const context = useContext(SystemOwnerAuthContext);
  if (!context) {
    throw new Error("useSystemOwnerAuth must be used within SystemOwnerAuthProvider");
  }
  return context;
}