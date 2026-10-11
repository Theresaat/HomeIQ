import { createContext, useContext, useState, type ReactNode } from 'react';

export type DemoUser = { name: string; email: string };
export const DEMO_ACCOUNT: DemoUser = { name: 'Jordan Smith', email: 'demo@homeiq.example' };
type DemoSession = { user: DemoUser; subscriptionPlan: 'HomeIQ Protect' | null };
type AuthState = {
  user: DemoUser | null;
  subscriptionPlan: DemoSession['subscriptionPlan'];
  activateProtect: () => void;
  updateName: (name: string) => void;
  signIn: (user: DemoUser) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DemoSession | null>(null);
  return <AuthContext.Provider value={{ user: session?.user ?? null,
    subscriptionPlan: session?.subscriptionPlan ?? null,
    activateProtect: () => setSession(current => current ? { ...current, subscriptionPlan: 'HomeIQ Protect' } : null),
    updateName: name => setSession(current => current ? { ...current, user: { ...current.user, name: name.trim() } } : null),
    signIn: details => setSession({ user: { name: details.name.trim(), email: details.email.trim().toLowerCase() }, subscriptionPlan: null }),
    signOut: () => setSession(null) }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}
