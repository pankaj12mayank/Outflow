"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import api from "@/app/lib/api";

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_email_verified: boolean;
  is_super_admin: boolean;
  organization: {
    id: number;
    name: string;
    slug: string;
  } | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, orgName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  requestMagicLink: (email: string) => Promise<void>;
  verifyMagicLink: (token: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const publicPaths = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/landing"];
    const isPublic = publicPaths.some((path) => pathname?.startsWith(path));
    const isAppPath = pathname?.startsWith("/app");

    if (!state.isAuthenticated && !isPublic && !state.isLoading && isAppPath) {
      router.push("/login");
    }
  }, [state.isAuthenticated, state.isLoading, pathname, router]);

  const checkAuth = async () => {
    const accessToken = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");

    if (!accessToken || !refreshToken) {
      setState({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const response = await api.get("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setState({
        user: response.data,
        isAuthenticated: true,
        isLoading: false,
      });
      api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
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
      const response = await api.post("/api/v1/auth/refresh", { refresh_token: refresh });
      const { access_token, refresh_token } = response.data;

      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);

      api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
      return true;
    } catch {
      return false;
    }
  };

  const clearAuth = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    delete api.defaults.headers.common["Authorization"];
    setState({ user: null, isAuthenticated: false, isLoading: false });
  };

  const login = async (email: string, password: string) => {
    const response = await api.post("/api/v1/auth/login", { email, password });
    const { user, tokens } = response.data;

    localStorage.setItem("access_token", tokens.access_token);
    localStorage.setItem("refresh_token", tokens.refresh_token);

    api.defaults.headers.common["Authorization"] = `Bearer ${tokens.access_token}`;

    setState({ user, isAuthenticated: true, isLoading: false });
    router.push("/app/dashboard");
  };

  const register = async (email: string, password: string, fullName: string, orgName: string) => {
    const response = await api.post("/api/v1/auth/register", {
      email,
      password,
      full_name: fullName,
      organization_name: orgName,
    });
    const { user, tokens } = response.data;

    localStorage.setItem("access_token", tokens.access_token);
    localStorage.setItem("refresh_token", tokens.refresh_token);

    api.defaults.headers.common["Authorization"] = `Bearer ${tokens.access_token}`;

    setState({ user, isAuthenticated: true, isLoading: false });
    router.push("/app/dashboard");
  };

  const logout = async () => {
    try {
      const accessToken = localStorage.getItem("access_token");
      if (accessToken) {
        await api.post(
          "/api/v1/auth/logout",
          {},
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
      }
    } finally {
      clearAuth();
      router.push("/landing");
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) return false;
    return await refreshTokenFn(refresh);
  };

  const requestMagicLink = async (email: string) => {
    await api.post("/api/v1/auth/magic-link", { email });
  };

  const verifyMagicLink = async (token: string) => {
    const response = await api.post("/api/v1/auth/magic-link/verify", { token });
    const { user, tokens } = response.data;

    localStorage.setItem("access_token", tokens.access_token);
    localStorage.setItem("refresh_token", tokens.refresh_token);

    api.defaults.headers.common["Authorization"] = `Bearer ${tokens.access_token}`;

    setState({ user, isAuthenticated: true, isLoading: false });
    router.push("/app/dashboard");
  };

  const forgotPassword = async (email: string) => {
    await api.post("/api/v1/auth/forgot-password", { email });
  };

  const resetPassword = async (token: string, newPassword: string) => {
    await api.post("/api/v1/auth/reset-password", {
      token,
      new_password: newPassword,
    });
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const accessToken = localStorage.getItem("access_token");
    await api.post(
      "/api/v1/auth/change-password",
      {
        current_password: currentPassword,
        new_password: newPassword,
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  };

  const verifyEmail = async (token: string) => {
    await api.post("/api/v1/auth/verify-email", { token });
    if (state.user) {
      setState({ ...state, user: { ...state.user, is_email_verified: true } });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        refreshToken,
        requestMagicLink,
        verifyMagicLink,
        forgotPassword,
        resetPassword,
        changePassword,
        verifyEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  return { isAuthenticated, isLoading };
}

export function useRequireRole(allowedRoles: string[]) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return { allowed: false, role: null };
  }

  return {
    allowed: allowedRoles.includes(user.role),
    role: user.role,
  };
}

export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (resource: string, action: string): boolean => {
    if (!user) return false;

    const permissions = getPermissionsForRole(user.role);
    return permissions.includes("*") || permissions.includes(`${resource}:${action}`) || permissions.includes(`${resource}:*`);
  };

  return { hasPermission, permissions: user ? getPermissionsForRole(user.role) : [] };
}

function getPermissionsForRole(role: string): string[] {
  const rolePermissions: Record<string, string[]> = {
    super_admin: ["*"],
    owner: [
      "org:read", "org:update", "org:delete",
      "users:read", "users:create", "users:update", "users:delete",
      "billing:read", "billing:manage",
      "leads:*", "campaigns:*", "emails:*", "ai:*", "crm:*", "analytics:*",
    ],
    admin: [
      "leads:*", "campaigns:*", "emails:*", "ai:*", "crm:*", "analytics:*",
      "users:read", "users:create", "users:update",
    ],
    member: [
      "leads:read", "leads:create", "leads:update",
      "campaigns:read",
      "emails:read",
      "crm:read", "crm:create", "crm:update",
    ],
  };

  return rolePermissions[role] || [];
}