// Global auth session. Reads/writes the token under ONE key with the secure*
// storage namespace so AuthContext (write) and any later reader agree.
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from "react";

import { api, setAuthToken } from "@/src/lib/api";
import { storage } from "@/src/utils/storage";

const AUTH_TOKEN_KEY = "dillards_auth_token";

export type UserRole = "owner" | "team_member";
export type AuthUser = { id: string; email: string; name: string; role: UserRole };

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isOwner: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const storedToken = await storage.secureGet(AUTH_TOKEN_KEY, "");
      if (storedToken) {
        setAuthToken(storedToken);
        try {
          const me = await api("/auth/me");
          setUser(me);
        } catch {
          await storage.secureRemove(AUTH_TOKEN_KEY);
          setAuthToken(null);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    await storage.secureSet(AUTH_TOKEN_KEY, res.access_token);
    setAuthToken(res.access_token);
    setUser(res.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await api("/auth/register", { method: "POST", body: JSON.stringify({ email, password, name }) });
    await storage.secureSet(AUTH_TOKEN_KEY, res.access_token);
    setAuthToken(res.access_token);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    await storage.secureRemove(AUTH_TOKEN_KEY);
    setAuthToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isOwner: user?.role === "owner", login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
