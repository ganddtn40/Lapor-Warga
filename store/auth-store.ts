import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "citizen" | "officer" | "admin";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: Role;
  photoURL?: string;
  emailVerified: boolean;
}

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isHydrated: boolean;
  setUser: (user: UserProfile | null) => void;
  setLoading: (isLoading: boolean) => void;
  setHydrated: (val: boolean) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true, // starts true — Firebase listener will set to false after resolving
      isHydrated: false,
      setUser: (user) => set({ user, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      setHydrated: (val) => set({ isHydrated: val }),
      logout: async () => {
        try {
          const { auth } = await import("@/lib/firebase");
          if (auth) await auth.signOut();
        } catch (e) {
          console.error("Logout error:", e);
        }
        // Clear session cookie
        document.cookie = "session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
        set({ user: null });
      },
    }),
    {
      name: "laporwarga-auth",
      // Only persist the user profile, not loading states
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state) state.setHydrated(true);
      },
    }
  )
);
