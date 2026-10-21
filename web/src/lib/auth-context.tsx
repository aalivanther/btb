"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from "react";

import { ui } from "@/lib/i18n";

export type User = { name: string; email: string };
type StoredUser = User & { passHash: string; salt: string };
type LegacyStoredUser = User & { pass: string };
type AuthState = { users: StoredUser[]; currentEmail: string | null };

const STORAGE_KEY = "btb:auth:v1";
const EMPTY: AuthState = { users: [], currentEmail: null };

type AuthResult = { ok: boolean; error?: string };

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  register: (name: string, email: string, pass: string) => Promise<AuthResult>;
  login: (email: string, pass: string) => Promise<AuthResult>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const normalizeEmail = (email: string) => email.trim().toLowerCase();

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(salt: string, pass: string): Promise<string> {
  const data = new TextEncoder().encode(salt + pass);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function migrateStoredUsers(rawUsers: unknown): Promise<StoredUser[]> {
  if (!Array.isArray(rawUsers)) {
    return [];
  }
  const migrated: StoredUser[] = [];
  for (const entry of rawUsers) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const candidate = entry as Partial<StoredUser & LegacyStoredUser>;
    if (typeof candidate.name !== "string" || typeof candidate.email !== "string") {
      continue;
    }
    if (typeof candidate.passHash === "string" && typeof candidate.salt === "string") {
      migrated.push({
        name: candidate.name,
        email: candidate.email,
        passHash: candidate.passHash,
        salt: candidate.salt,
      });
      continue;
    }
    if (typeof candidate.pass === "string") {
      const salt = randomSalt();
      migrated.push({
        name: candidate.name,
        email: candidate.email,
        passHash: await hashPassword(salt, candidate.pass),
        salt,
      });
    }
  }
  return migrated;
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, setState] = useState<AuthState>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      let next = EMPTY;
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<AuthState> & { users?: unknown };
          next = {
            users: await migrateStoredUsers(parsed.users),
            currentEmail: typeof parsed.currentEmail === "string" ? parsed.currentEmail : null,
          };
        }
      } catch {}
      if (!cancelled) {
        setState(next);
        setReady(true);
      }
    };
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state, ready]);

  const register = useCallback(
    async (name: string, email: string, pass: string): Promise<AuthResult> => {
      const cleanName = name.trim();
      const cleanEmail = normalizeEmail(email);
      if (cleanName === "" || cleanEmail === "" || pass === "") {
        return { ok: false, error: ui.auth.errorMissingFields };
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
        return { ok: false, error: ui.auth.errorInvalidEmail };
      }
      if (pass.length < 6) {
        return { ok: false, error: ui.auth.errorShortPassword };
      }
      if (state.users.some((existing) => existing.email === cleanEmail)) {
        return { ok: false, error: ui.auth.errorEmailTaken };
      }
      const salt = randomSalt();
      const passHash = await hashPassword(salt, pass);
      setState((previous) => {
        if (previous.users.some((existing) => existing.email === cleanEmail)) {
          return previous;
        }
        return {
          users: [...previous.users, { name: cleanName, email: cleanEmail, passHash, salt }],
          currentEmail: cleanEmail,
        };
      });
      return { ok: true };
    },
    [state.users],
  );

  const login = useCallback(
    async (email: string, pass: string): Promise<AuthResult> => {
      const cleanEmail = normalizeEmail(email);
      const found = state.users.find((existing) => existing.email === cleanEmail);
      if (!found) {
        return { ok: false, error: ui.auth.errorBadCredentials };
      }
      const attemptHash = await hashPassword(found.salt, pass);
      if (attemptHash !== found.passHash) {
        return { ok: false, error: ui.auth.errorBadCredentials };
      }
      setState((previous) => ({ ...previous, currentEmail: cleanEmail }));
      return { ok: true };
    },
    [state.users],
  );

  const logout = useCallback(() => {
    setState((previous) => ({ ...previous, currentEmail: null }));
  }, []);

  const user = useMemo<User | null>(() => {
    if (state.currentEmail === null) {
      return null;
    }
    const found = state.users.find((u) => u.email === state.currentEmail);
    return found ? { name: found.name, email: found.email } : null;
  }, [state]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, ready, register, login, logout }),
    [user, ready, register, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === null) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return value;
}
