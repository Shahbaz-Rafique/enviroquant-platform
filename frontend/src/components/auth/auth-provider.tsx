"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { apiRequest } from "@/lib/api-client";
import {
  clearSession,
  getAccessToken,
  getStoredUser,
  storeSession,
} from "@/lib/auth";
import type { TokenResponse, User } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  /** Force a refresh of the current user from the API */
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      clearSession();
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const freshUser = await apiRequest<User>("/auth/me");
      storeSession({
        access_token: token,
        token_type: "bearer",
        user: freshUser,
      } satisfies TokenResponse);
      setUser(freshUser);
    } catch {
      clearSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Redirect to login when auth resolves to no user
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  const value = useMemo(
    () => ({ user, loading, refreshUser }),
    [user, loading, refreshUser],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
