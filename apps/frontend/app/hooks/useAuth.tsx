"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import api from "@/app/lib/api";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  permissions: string[];
  is_email_verified: boolean;
  is_super_admin: boolean;
  organization: {
    id: number;
    name: string;
    slug: string;
  } | null;
}

/** Keep in sync with apps/backend/app/core/role_permissions.py */
export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  system_owner: [
    "organizations:read", "organizations:create", "organizations:update", "organizations:delete",
    "plans:read", "plans:create", "plans:update", "plans:delete",
    "pricing:read", "pricing:create", "pricing:update", "pricing:delete",
    "smtp:read", "smtp:create", "smtp:update", "smtp:delete",
    "cms:read", "cms:create", "cms:update", "cms:delete",
    "analytics:read", "analytics:export",
    "invoices:read", "invoices:create", "invoices:update",
    "features:read", "features:create", "features:update", "features:delete",
    "billing:read", "billing:update",
    "teams:read", "teams:create", "teams:update", "teams:delete",
    "leads:read", "leads:create", "leads:update", "leads:delete", "leads:enrich",
    "campaigns:read", "campaigns:create", "campaigns:update", "campaigns:delete", "campaigns:start", "campaigns:pause",
    "sequences:read", "sequences:create", "sequences:update", "sequences:delete",
    "scraping:read", "scraping:create", "scraping:update", "scraping:delete",
    "settings:read", "settings:update",
    "users:read", "users:create", "users:update", "users:delete",
  ],
  organization_admin: [
    "organizations:read",
    "analytics:read", "analytics:export",
    "invoices:read",
    "features:read",
    "billing:read", "billing:update",
    "teams:read", "teams:create", "teams:update", "teams:delete",
    "leads:read", "leads:create", "leads:update", "leads:delete", "leads:enrich",
    "campaigns:read", "campaigns:create", "campaigns:update", "campaigns:delete", "campaigns:start", "campaigns:pause",
    "sequences:read", "sequences:create", "sequences:update", "sequences:delete",
    "scraping:read", "scraping:create", "scraping:update", "scraping:delete",
    "settings:read", "settings:update",
    "notifications:read",
    "monitoring:read",
  ],
  team_member: [
    "teams:read",
    "leads:read", "leads:create", "leads:update",
    "campaigns:read",
    "sequences:read",
    "scraping:read",
    "settings:read",
  ],
};

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    fullName: string,
    orgName: string,
    onboarding?: Record<string, string | undefined>
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  requestMagicLink: (email: string) => Promise<void>;
  verifyMagicLink: (token: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<{ message: string; reset_url?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_ALIASES: Record<string, string> = {
  admin: "organization_admin",
  org_admin: "organization_admin",
  super_admin: "system_owner",
  member: "team_member",
};

export function normalizeRole(role?: string): string {
  if (!role) return "team_member";
  return ROLE_ALIASES[role] || role;
}

function syncAccessTokenCookie(accessToken: string | null) {
  if (typeof document === "undefined") return;
  if (accessToken) {
    document.cookie = `access_token=${encodeURIComponent(accessToken)}; path=/; max-age=604800; SameSite=Lax`;
  } else {
    document.cookie = "access_token=; path=/; max-age=0; SameSite=Lax";
  }
}

export function addPermissionsToUser(user: User): User {
  if (!user) return user as any;
  const role = normalizeRole(user?.role);
  const permissions =
    user?.permissions?.length > 0
      ? user.permissions
      : DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.team_member;
  return { ...user, role, permissions };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);

  const setTokens = useCallback((accessToken: string, refreshToken: string) => {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);
    api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
    syncAccessTokenCookie(accessToken);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    delete api.defaults.headers.common["Authorization"];
    syncAccessTokenCookie(null);
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  const checkAuth = useCallback(async (): Promise<boolean> => {
    const accessToken = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");

    if (!accessToken || !refreshToken) {
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }

    try {
      const response = await api.get("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userWithPermissions = addPermissionsToUser(response.data);
      setState({
        user: userWithPermissions,
        isAuthenticated: true,
        isLoading: false,
      });
      api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
      syncAccessTokenCookie(accessToken);
      return true;
    } catch (error: any) {
      if (error.response?.status === 401) {
        if (isRefreshing && refreshPromiseRef.current) {
          const refreshed = await refreshPromiseRef.current;
          if (refreshed) {
            const newAccessToken = localStorage.getItem("access_token");
            if (newAccessToken) {
              return await checkAuth();
            }
          }
          clearAuth();
          return false;
        }
        const refreshed = await refreshTokenFn(refreshToken);
        if (refreshed) {
          const newAccessToken = localStorage.getItem("access_token");
          if (newAccessToken) {
            return await checkAuth();
          }
        }
        clearAuth();
        return false;
      } else {
        clearAuth();
        return false;
      }
    }
    return false;
  }, [clearAuth, isRefreshing]);

  const refreshTokenFn = useCallback(async (refresh: string): Promise<boolean> => {
    if (isRefreshing && refreshPromiseRef.current) {
      return await refreshPromiseRef.current;
    }

    setIsRefreshing(true);
    refreshPromiseRef.current = (async () => {
      try {
        const response = await api.post("/api/v1/auth/refresh", { refresh_token: refresh });
        const { access_token, refresh_token } = response.data;
        setTokens(access_token, refresh_token);
        return true;
      } catch {
        clearAuth();
        return false;
      } finally {
        setIsRefreshing(false);
        refreshPromiseRef.current = null;
      }
    })();
    return await refreshPromiseRef.current;
  }, [isRefreshing, setTokens, clearAuth]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const publicPaths = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/landing"];
    const isPublic = publicPaths.some((path) => pathname?.startsWith(path));
    const isAppPath = pathname?.startsWith("/app");

    if (!state.isAuthenticated && !isPublic && !state.isLoading && isAppPath) {
      router.push("/login");
    }
  }, [state.isAuthenticated, state.isLoading, pathname, router]);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post("/api/v1/auth/login", { email, password });
      const { user: rawUser, tokens } = response.data;
      const user = addPermissionsToUser(rawUser);

      setTokens(tokens.access_token, tokens.refresh_token);

      setState({ user, isAuthenticated: true, isLoading: false });

      if (user.role === "system_owner") {
        router.push("/system-owner/dashboard");
      } else {
        router.push("/app/dashboard");
      }
    } catch (error: any) {
      console.error("Login failed:", error.response?.data || error.message);
      throw error;
    }
  };

  const register = async (
    email: string,
    password: string,
    fullName: string,
    orgName: string,
    onboarding?: Record<string, string | undefined>
  ) => {
    try {
      const response = await api.post("/api/v1/auth/register", {
        email,
        password,
        full_name: fullName,
        organization_name: orgName,
      });
      const { user: rawUser, tokens } = response.data;
      const user = addPermissionsToUser(rawUser);

      setTokens(tokens.access_token, tokens.refresh_token);

      setState({ user, isAuthenticated: true, isLoading: false });

      if (onboarding && Object.values(onboarding).some(Boolean)) {
        try {
          await api.patch("/api/v1/auth/onboarding", onboarding);
        } catch (onboardingErr) {
          console.warn("Onboarding save failed:", onboardingErr);
        }
      }

      router.push("/app/dashboard?onboarding=complete");
    } catch (error: any) {
      console.error("Registration failed:", error.response?.data || error.message);
      throw error;
    }
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
    const { user: rawUser, tokens } = response.data;
    const user = addPermissionsToUser(rawUser);

    setTokens(tokens.access_token, tokens.refresh_token);

    setState({ user, isAuthenticated: true, isLoading: false });
    router.push("/app/dashboard");
  };

  const forgotPassword = async (email: string) => {
    const response = await api.post("/api/v1/auth/forgot-password", { email });
    return response.data;
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
      setState(prev => ({ ...prev, user: { ...prev.user!, is_email_verified: true } }));
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

export function useAuth(): AuthContextType {
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

  const permissions =
    user?.permissions?.length
      ? user.permissions
      : user
        ? getPermissionsForRole(normalizeRole(user.role))
        : [];

  const hasPermission = (resource: string, action: string): boolean => {
    if (!user) return false;
    return (
      permissions.includes("*") ||
      permissions.includes(`${resource}:${action}`) ||
      permissions.includes(`${resource}:*`)
    );
  };

  return { hasPermission, permissions };
}

export function getPermissionsForRole(role: string): string[] {
  return DEFAULT_PERMISSIONS[normalizeRole(role)] || DEFAULT_PERMISSIONS.team_member;
}