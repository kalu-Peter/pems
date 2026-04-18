import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type UserRole = Database["public"]["Enums"]["user_role"];

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_by: string | null;
  polling_station_id: string | null;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const fetchProfile = async (userId: string): Promise<Profile | null> => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.warn("Profile fetch:", error.message);
      return null;
    }
    return data ?? null;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Safety net — loading always resolves within 10 s
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 10000);

    // Set user + profile atomically so components never see user=set, profile=null
    const applySession = async (s: Session | null) => {
      if (s?.user) {
        const p = await fetchProfile(s.user.id);
        if (!mounted) return;
        setSession(s);
        setUser(s.user);
        setProfile(p);
      } else {
        if (!mounted) return;
        setSession(null);
        setUser(null);
        setProfile(null);
      }
    };

    // Initial load from cached session (fast, usually no network needed)
    supabase.auth.getSession()
      .then(({ data: { session } }) => applySession(session))
      .catch((err) => console.error("getSession error:", err))
      .finally(() => {
        if (mounted) {
          clearTimeout(timeout);
          setLoading(false);
        }
      });

    // React to sign-in / sign-out / token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session).finally(() => {
        if (mounted) setLoading(false);
      });
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
