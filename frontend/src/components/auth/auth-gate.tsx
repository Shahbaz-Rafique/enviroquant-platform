"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api-client";
import { clearSession, getAccessToken, getStoredUser, storeSession } from "@/lib/auth";
import type { TokenResponse, User } from "@/lib/types";

type AuthGateState = {
  user: User | null;
  loading: boolean;
};

export function useCurrentUser(): AuthGateState {
  const [state, setState] = useState<AuthGateState>(() => ({
    user: getStoredUser(),
    loading: true
  }));

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setState({ user: null, loading: false });
      return;
    }

    apiRequest<User>("/auth/me")
      .then((user) => {
        storeSession({ access_token: token, token_type: "bearer", user } satisfies TokenResponse);
        setState({ user, loading: false });
      })
      .catch(() => {
        clearSession();
        setState({ user: null, loading: false });
      });
  }, []);

  return state;
}

export function useRequireAuth(): AuthGateState {
  const router = useRouter();
  const state = useCurrentUser();

  useEffect(() => {
    if (!state.loading && !state.user) {
      router.push("/login");
    }
  }, [router, state.loading, state.user]);

  return state;
}
