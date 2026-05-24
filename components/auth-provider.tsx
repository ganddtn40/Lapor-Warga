"use client";

import React, { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();
  const initialized = useRef(false);

  useEffect(() => {
    // If Firebase is not configured, stop loading immediately
    if (!auth) {
      setLoading(false);
      return;
    }

    // Prevent double-initialization in React StrictMode
    if (initialized.current) return;
    initialized.current = true;

    setLoading(true);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        // Clear stale session cookie
        document.cookie = "session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
        return;
      }

      try {
        let role: "citizen" | "officer" | "admin" = "citizen";
        let name = firebaseUser.displayName || "Pengguna";

        if (db) {
          const userRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            const data = userDoc.data();
            role = data.role || "citizen";
            name = data.name || name;
          } else {
            // Auto-create profile for first-time Google sign-in users
            await setDoc(userRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name,
              role: "citizen",
              createdAt: new Date(),
            });
          }
        }

        // Set session cookie (1 day). Add Secure flag on HTTPS (production).
        const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
        document.cookie = `session=${firebaseUser.uid}; path=/; max-age=86400; SameSite=Lax${isSecure ? "; Secure" : ""}`;

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          name,
          role,
          photoURL: firebaseUser.photoURL || undefined,
          emailVerified: firebaseUser.emailVerified,
        });
      } catch (error) {
        console.error("AuthProvider: Error fetching user profile:", error);
        // On error, still resolve loading state to avoid infinite skeleton
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      // Reset the guard so React StrictMode re-mounts can re-subscribe successfully
      initialized.current = false;
      unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
