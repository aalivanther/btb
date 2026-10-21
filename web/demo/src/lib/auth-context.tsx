"use client";
import type { ReactNode } from "react";
export type User = { name: string; email: string };
const visitor: User = { name: "Visitante", email: "" };
export function AuthProvider({ children }: { children: ReactNode }) { return children; }
export function useAuth() {
  return { user: visitor as User | null, ready: true, logout: () => {},
    login: async () => ({ ok: true }), register: async () => ({ ok: true }) };
}
