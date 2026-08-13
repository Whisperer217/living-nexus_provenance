import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { markHadSession } from "@/lib/sessionFlags";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

const RUNTIME_USER_INFO_KEY = "manus-runtime-user-info";

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  // Query observers may provide an equivalent user object with a new reference
  // after unrelated cache notifications. Persist against stable identity/version
  // fields so route-heavy authenticated surfaces never turn that reference churn
  // into repeated storage/session side effects.
  const runtimeUserPayload = useMemo(
    () => JSON.stringify(meQuery.data ?? null),
    [
      meQuery.data?.id,
      meQuery.data?.openId,
      meQuery.data?.role,
      meQuery.data?.updatedAt,
    ],
  );
  const hasAuthenticatedUser = Boolean(meQuery.data);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (localStorage.getItem(RUNTIME_USER_INFO_KEY) !== runtimeUserPayload) {
      localStorage.setItem(RUNTIME_USER_INFO_KEY, runtimeUserPayload);
    }

    if (hasAuthenticatedUser) markHadSession();
  }, [hasAuthenticatedUser, runtimeUserPayload]);

  const state = useMemo(() => {
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
